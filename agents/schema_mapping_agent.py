"""
Schema-Mapping Agent.

For each carrier, asks Gemini to decide which raw source column maps to
which canonical field, and to explain its reasoning wherever the mapping
is ambiguous (e.g. a column that could plausibly be a full name or a
last name, or a date format that isn't self-evident from a single sample).

This runs once per carrier (not once per record) — the mapping decision is
a schema-level judgment, not a per-row one. The resulting mapping and
reasoning are then reused for every case involving that carrier's records.
"""

from datetime import datetime

from agents.llm import call_json
from agents.schema import CANONICAL_FIELDS, CARRIER_RAW_FIELDS

STATE_FULL_TO_ABBREV = {
    "California": "CA", "Texas": "TX", "New York": "NY", "Florida": "FL",
    "Washington": "WA", "Colorado": "CO", "Illinois": "IL", "Arizona": "AZ",
    "Georgia": "GA", "Ohio": "OH",
}

CLAIM_TYPE_TO_CANONICAL = {
    "auto": "auto", "automobile": "auto",
    "property": "property", "dwelling": "property",
}

PROMPT_TEMPLATE = """You are a data engineer mapping a source insurance carrier's \
claim export to a shared canonical schema used across multiple carriers.

Carrier: {carrier}

Raw source columns: {raw_fields}

Sample raw rows (for context on formats/conventions):
{sample_rows}

Canonical target fields: {canonical_fields}

Map each raw source column to exactly one canonical field (or null if it has \
no canonical equivalent). Pay attention to: name field structure (single \
full-name field vs split first/last, and what order it's in), date formats, \
state representation (2-letter code vs full name), and claim-type vocabulary.

Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{{
  "field_mapping": {{"<raw_field>": "<canonical_field_or_null>", ...}},
  "reasoning": "<2-4 sentences explaining any non-obvious or ambiguous mapping decisions you made, referencing the specific format/convention clues that led to your decision>"
}}
"""


def _format_sample_rows(sample_rows):
    lines = []
    for row in sample_rows:
        lines.append(", ".join(f"{k}={v}" for k, v in row.items()))
    return "\n".join(lines)


def map_carrier_schema(carrier: str, sample_rows: list[dict]) -> dict:
    """Returns {"field_mapping": {...}, "reasoning": "..."} for one carrier."""
    prompt = PROMPT_TEMPLATE.format(
        carrier=carrier,
        raw_fields=CARRIER_RAW_FIELDS[carrier],
        sample_rows=_format_sample_rows(sample_rows),
        canonical_fields=CANONICAL_FIELDS,
    )
    return call_json(prompt)


def apply_canonical_mapping(carrier: str, raw_row: dict) -> dict:
    """Deterministically converts one raw row into the canonical shape.

    The schema-mapping agent decides *which* raw column corresponds to which
    canonical field and explains the ambiguous calls; this function performs
    the actual value-level conversion (date parsing, state code lookup,
    claim-type vocabulary normalization) that follows once the mapping is
    known, the same way a generated dbt model would.
    """
    if carrier == "meridian_mutual":
        full_name = raw_row["claimant_name"].strip()
        first, _, last = full_name.partition(" ")
        return {
            "first_name": first,
            "last_name": last,
            "dob": datetime.strptime(raw_row["dob"], "%m/%d/%Y").date().isoformat(),
            "ssn_last4": raw_row["ssn_last4"],
            "address_line1": raw_row["street_address"],
            "city": raw_row["city"],
            "state": raw_row["state"].upper(),
            "zip_code": raw_row["zip"],
            "claim_type": CLAIM_TYPE_TO_CANONICAL[raw_row["claim_type"].lower()],
            "claim_date": datetime.strptime(raw_row["loss_date"], "%m/%d/%Y").date().isoformat(),
            "claim_amount": float(raw_row["claim_amount"]),
        }

    if carrier == "atlas_underwriters":
        last, _, first = raw_row["policyholder_full_name"].partition(",")
        return {
            "first_name": first.strip(),
            "last_name": last.strip(),
            "dob": raw_row["date_of_birth"],
            "ssn_last4": raw_row["ssn_last4"],
            "address_line1": raw_row["mailing_address"],
            "city": raw_row["city"],
            "state": STATE_FULL_TO_ABBREV.get(raw_row["state_full"], raw_row["state_full"]),
            "zip_code": raw_row["zip_code"],
            "claim_type": CLAIM_TYPE_TO_CANONICAL[raw_row["claim_category"].lower()],
            "claim_date": raw_row["claim_filed_on"],
            "claim_amount": float(raw_row["loss_amount"]),
        }

    if carrier == "coastal_premier":
        return {
            "first_name": raw_row["insured_first_name"],
            "last_name": raw_row["insured_last_name"],
            "dob": datetime.strptime(raw_row["birth_date"], "%d-%m-%Y").date().isoformat(),
            "ssn_last4": raw_row["ssn_last4"],
            "address_line1": raw_row["address_1"],
            "city": raw_row["town"],
            "state": raw_row["state_abbrev"].upper(),
            "zip_code": raw_row["postal_code"],
            "claim_type": CLAIM_TYPE_TO_CANONICAL[raw_row["peril_type"].lower()],
            "claim_date": datetime.strptime(raw_row["date_reported"], "%d-%m-%Y").date().isoformat(),
            "claim_amount": float(raw_row["incurred_amount"]),
        }

    raise ValueError(f"Unknown carrier: {carrier}")
