-- Normalizes Meridian Mutual into the shared canonical claim shape.
-- Meridian already uses 2-letter state codes and a single full-name field,
-- so the main work here is splitting the name and lowercasing claim_type.
select
    record_id,
    'meridian_mutual' as carrier,
    trim(split_part(claimant_name, ' ', 1)) as first_name,
    trim(
        substr(claimant_name, len(split_part(claimant_name, ' ', 1)) + 2)
    ) as last_name,
    dob,
    ssn_last4,
    street_address as address_line1,
    city,
    state,
    zip as zip_code,
    lower(claim_type) as claim_type,
    loss_date as claim_date,
    claim_amount
from {{ ref('stg_meridian_mutual') }}
