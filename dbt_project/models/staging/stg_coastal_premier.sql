-- Light typing/cleaning of Coastal Premier's raw extract. Coastal splits
-- first/last name into separate fields and uses DD-MM-YYYY dates.
select
    record_id,
    trim(insured_first_name) as insured_first_name,
    trim(insured_last_name) as insured_last_name,
    to_date(birth_date, 'DD-MM-YYYY') as birth_date,
    ssn_last4,
    trim(address_1) as address_1,
    trim(town) as town,
    upper(trim(state_abbrev)) as state_abbrev,
    postal_code,
    trim(peril_type) as peril_type,
    to_date(date_reported, 'DD-MM-YYYY') as date_reported,
    try_to_decimal(incurred_amount, 12, 2) as incurred_amount
from {{ source('raw', 'RAW_COASTAL_PREMIER') }}
