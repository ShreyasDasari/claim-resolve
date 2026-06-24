-- Normalizes Atlas Underwriters into the shared canonical claim shape.
-- Atlas's name field is "Last, First" (split on comma, order swapped) and
-- its state field is a full state name, resolved to a 2-letter code via the
-- state_abbreviations seed.
select
    a.record_id,
    'atlas_underwriters' as carrier,
    trim(split_part(a.policyholder_full_name, ',', 2)) as first_name,
    trim(split_part(a.policyholder_full_name, ',', 1)) as last_name,
    a.date_of_birth as dob,
    a.ssn_last4,
    a.mailing_address as address_line1,
    a.city,
    coalesce(s.state_abbrev, a.state_full) as state,
    a.zip_code,
    a.claim_category as claim_type,
    a.claim_filed_on as claim_date,
    a.loss_amount as claim_amount
from {{ ref('stg_atlas_underwriters') }} a
left join {{ ref('state_abbreviations') }} s
    on a.state_full = s.state_name
