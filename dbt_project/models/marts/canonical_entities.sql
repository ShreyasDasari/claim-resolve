-- canonical_entities: the warehouse-side, SQL-deterministic entity
-- resolution layer that Cortex's natural-language queries run against.
--
-- This is intentionally a simpler, rules-based complement to the
-- LangGraph agent pipeline in agents/, not a duplicate of it. The agents
-- use an LLM to reason about ambiguous, low-confidence cases and produce
-- the human-readable trace the dashboard plays back. This model uses a
-- deterministic blocking key (matching ssn_last4 + date of birth across
-- carriers) plus a Jaro-Winkler name-similarity score to group claims into
-- candidate entities directly in the warehouse — useful for the
-- "claimants appearing across more than one carrier" / "lowest confidence
-- matches" style of question a SQL-on-Cortex layer needs to answer without
-- invoking an LLM per query.

with all_claims as (
    select * from {{ ref('int_meridian_normalized') }}
    union all
    select * from {{ ref('int_atlas_normalized') }}
    union all
    select * from {{ ref('int_coastal_normalized') }}
),

-- Claims that share the same SSN-last-4 and date of birth are grouped into
-- one candidate entity. Claims with no such match are their own singleton
-- entity. This is a coarse stand-in for the agent's fuzzy entity
-- resolution: it catches exact-identifier overlaps but, by design, will
-- not catch cases where DOB or SSN itself was recorded inconsistently —
-- those nuanced cases are exactly what the agent pipeline is for.
entity_keyed as (
    select
        *,
        md5(ssn_last4 || '|' || to_varchar(dob)) as entity_key
    from all_claims
),

entity_stats as (
    select
        entity_key,
        count(distinct carrier) as carrier_count,
        count(*) as claim_count,
        min(first_name || ' ' || last_name) as reference_name
    from entity_keyed
    group by entity_key
),

scored as (
    select
        e.*,
        s.carrier_count,
        s.claim_count,
        case
            when s.carrier_count > 1 then
                round(
                    0.6 + 0.4 * jarowinkler_similarity(
                        e.first_name || ' ' || e.last_name, s.reference_name
                    ) / 100.0,
                    2
                )
            else null
        end as match_confidence
    from entity_keyed e
    inner join entity_stats s on e.entity_key = s.entity_key
)

select
    entity_key as entity_id,
    record_id,
    carrier,
    first_name,
    last_name,
    dob,
    ssn_last4,
    address_line1,
    city,
    state,
    zip_code,
    claim_type,
    claim_date,
    claim_amount,
    carrier_count,
    claim_count,
    match_confidence,
    (carrier_count > 1 and (match_confidence is null or match_confidence < 0.75))
        as flagged_for_review
from scored
order by carrier_count desc, entity_id, carrier
