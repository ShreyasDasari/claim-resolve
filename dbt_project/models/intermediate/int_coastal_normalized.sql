-- Normalizes Coastal Premier into the shared canonical claim shape.
-- Coastal already splits first/last name; peril_type vocabulary
-- ("Automobile" / "Dwelling") is mapped to the shared "auto" / "property".
select
    record_id,
    'coastal_premier' as carrier,
    insured_first_name as first_name,
    insured_last_name as last_name,
    birth_date as dob,
    ssn_last4,
    address_1 as address_line1,
    town as city,
    state_abbrev as state,
    postal_code as zip_code,
    case
        when lower(peril_type) = 'automobile' then 'auto'
        when lower(peril_type) = 'dwelling' then 'property'
        else lower(peril_type)
    end as claim_type,
    date_reported as claim_date,
    incurred_amount as claim_amount
from {{ ref('stg_coastal_premier') }}
