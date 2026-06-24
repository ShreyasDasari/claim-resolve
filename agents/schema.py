"""Canonical claim schema that all three carriers' raw records get mapped to."""

CANONICAL_FIELDS = [
    "first_name",
    "last_name",
    "dob",          # ISO 8601, YYYY-MM-DD
    "ssn_last4",
    "address_line1",
    "city",
    "state",        # 2-letter USPS code
    "zip_code",
    "claim_type",   # "auto" | "property"
    "claim_date",   # ISO 8601, YYYY-MM-DD
    "claim_amount",
]

# The raw column names each carrier uses, in source order. Used to build the
# prompt the schema-mapping agent sees for each carrier.
CARRIER_RAW_FIELDS = {
    "meridian_mutual": [
        "claimant_name", "dob", "ssn_last4", "street_address", "city",
        "state", "zip", "claim_type", "loss_date", "claim_amount",
    ],
    "atlas_underwriters": [
        "policyholder_full_name", "date_of_birth", "ssn_last4",
        "mailing_address", "city", "state_full", "zip_code",
        "claim_category", "claim_filed_on", "loss_amount",
    ],
    "coastal_premier": [
        "insured_first_name", "insured_last_name", "birth_date", "ssn_last4",
        "address_1", "town", "state_abbrev", "postal_code", "peril_type",
        "date_reported", "incurred_amount",
    ],
}
