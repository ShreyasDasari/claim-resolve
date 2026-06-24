-- Light typing/cleaning of Atlas Underwriters' raw extract. Atlas uses
-- "Last, First" names, ISO dates, and full state names (handled downstream).
select
    record_id,
    trim(policyholder_full_name) as policyholder_full_name,
    to_date(date_of_birth, 'YYYY-MM-DD') as date_of_birth,
    ssn_last4,
    trim(mailing_address) as mailing_address,
    trim(city) as city,
    trim(state_full) as state_full,
    zip_code,
    lower(trim(claim_category)) as claim_category,
    to_date(claim_filed_on, 'YYYY-MM-DD') as claim_filed_on,
    try_to_decimal(loss_amount, 12, 2) as loss_amount
from {{ source('raw', 'RAW_ATLAS_UNDERWRITERS') }}
