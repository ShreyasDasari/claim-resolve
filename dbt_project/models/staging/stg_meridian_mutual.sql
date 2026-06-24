-- Light typing/cleaning of Meridian Mutual's raw extract. No field renaming
-- or schema normalization happens here — that's the intermediate layer's job.
select
    record_id,
    trim(claimant_name) as claimant_name,
    to_date(dob, 'MM/DD/YYYY') as dob,
    ssn_last4,
    trim(street_address) as street_address,
    trim(city) as city,
    upper(trim(state)) as state,
    zip,
    upper(trim(claim_type)) as claim_type,
    to_date(loss_date, 'MM/DD/YYYY') as loss_date,
    try_to_decimal(claim_amount, 12, 2) as claim_amount
from {{ source('raw', 'RAW_MERIDIAN_MUTUAL') }}
