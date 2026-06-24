"""
Generates synthetic claims data for three fictional carriers with deliberately
mismatched schemas, formats, and vocabularies — the same kind of inconsistency
real cross-carrier data-sharing networks have to reconcile.

All data is synthetic (Faker-generated). No real claimant, policy, or PII data
is used anywhere in this project.

Three claimant identities are hand-crafted (not randomized) to seed the three
required demonstration cases for the agent pipeline:
  - MARGARET CHEN     -> clean, high-confidence match (Meridian + Atlas)
  - JONATHAN MEYER     -> ambiguous match the agent resolves with reasoning
                          (typo'd name, conflicting address) (Meridian + Coastal)
  - ROBERT WILLIAMS    -> looks like a match (same name) but DOB and address
                          disagree -> correctly flagged for human review
                          (Meridian + Atlas)

Everything else is randomized filler to make each carrier file look like a
real extract, and to give the entity-resolution agent plausible non-matches
to reject.

Run: python data/generate_synthetic_data.py
Output: data/raw/meridian_mutual.csv, data/raw/atlas_underwriters.csv,
        data/raw/coastal_premier.csv
"""

import csv
import os
import random
from datetime import date

from faker import Faker

SEED = 42
random.seed(SEED)
fake = Faker("en_US")
fake.seed_instance(SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "raw")

STATE_FULL_NAMES = {
    "CA": "California",
    "TX": "Texas",
    "NY": "New York",
    "FL": "Florida",
    "WA": "Washington",
    "CO": "Colorado",
    "IL": "Illinois",
    "AZ": "Arizona",
    "GA": "Georgia",
    "OH": "Ohio",
}


def random_state():
    return random.choice(list(STATE_FULL_NAMES.keys()))


def random_ssn_last4():
    return f"{random.randint(0, 9999):04d}"


def random_claim_amount(claim_type):
    if claim_type == "auto":
        return round(random.uniform(800, 28000), 2)
    return round(random.uniform(1500, 95000), 2)


def random_claim_type():
    return random.choice(["auto", "property"])


# ---------------------------------------------------------------------------
# Hand-crafted demo identities — these create the three required trace cases.
# Each entry is a dict of canonical attributes; per-carrier generators below
# apply that carrier's own formatting/vocabulary quirks on top.
# ---------------------------------------------------------------------------

DEMO_IDENTITIES = {
    "margaret_chen": {
        "first": "Margaret",
        "last": "Chen",
        "dob": date(1981, 3, 14),
        "ssn_last4": "5521",
        "street": "118 Birchwood Lane",
        "city": "Denver",
        "state": "CO",
        "zip": "80202",
    },
    "jonathan_meyer_meridian": {
        "first": "Jonathan",
        "last": "Meyer",
        "dob": date(1975, 11, 2),
        "ssn_last4": "8834",
        "street": "482 Oak St Apt 3",
        "city": "Austin",
        "state": "TX",
        "zip": "73301",
    },
    "jonathon_myers_coastal": {
        # Same person as above — typo'd first AND last name, address missing
        # the apartment unit. Same SSN last 4 and DOB.
        "first": "Jonathon",
        "last": "Myers",
        "dob": date(1975, 11, 2),
        "ssn_last4": "8834",
        "street": "482 Oak St",
        "city": "Austin",
        "state": "TX",
        "zip": "73301",
    },
    "robert_williams_meridian": {
        "first": "Robert",
        "last": "Williams",
        "dob": date(1968, 9, 12),
        "ssn_last4": "1190",
        "street": "27 Crestline Dr",
        "city": "Columbus",
        "state": "OH",
        "zip": "43004",
    },
    "robert_williams_atlas": {
        # Same name, same SSN last 4, same city/state/zip, near-identical
        # street address as robert_williams_meridian -- but a date of birth
        # with the month and day transposed (Sep 12 -> Dec 9), the classic
        # MM/DD vs DD/MM data-entry confusion this project's whole premise
        # is built on. Every other identity signal agrees; only the DOB
        # is ambiguous between "data error" and "different person."
        # Deliberately built so there isn't enough evidence to confidently
        # call it a match OR a non-match.
        "first": "Robert",
        "last": "Williams",
        "dob": date(1968, 12, 9),
        "ssn_last4": "1190",
        "street": "27 Crestline Dr Apt 2",
        "city": "Columbus",
        "state": "OH",
        "zip": "43004",
    },
}


def make_filler_identity():
    state = random_state()
    return {
        "first": fake.first_name(),
        "last": fake.last_name(),
        "dob": fake.date_of_birth(minimum_age=21, maximum_age=85),
        "ssn_last4": random_ssn_last4(),
        "street": fake.street_address(),
        "city": fake.city(),
        "state": state,
        "zip": fake.zipcode(),
    }


# ---------------------------------------------------------------------------
# Carrier 1: Meridian Mutual
#   - single full-name field
#   - MM/DD/YYYY dates
#   - 2-letter state codes
#   - claim_type as "AUTO" / "PROPERTY"
# ---------------------------------------------------------------------------

def build_meridian_row(record_id, identity, claim_type=None):
    claim_type = claim_type or random_claim_type()
    claim_date = fake.date_between(start_date="-2y", end_date="today")
    return {
        "record_id": record_id,
        "claimant_name": f"{identity['first']} {identity['last']}",
        "dob": identity["dob"].strftime("%m/%d/%Y"),
        "ssn_last4": identity["ssn_last4"],
        "street_address": identity["street"],
        "city": identity["city"],
        "state": identity["state"],
        "zip": identity["zip"],
        "claim_type": claim_type.upper(),
        "loss_date": claim_date.strftime("%m/%d/%Y"),
        "claim_amount": random_claim_amount(claim_type),
    }


# ---------------------------------------------------------------------------
# Carrier 2: Atlas Underwriters
#   - "Last, First" name field
#   - ISO (YYYY-MM-DD) dates
#   - full state names
#   - claim_category as lowercase "auto" / "property"
# ---------------------------------------------------------------------------

def build_atlas_row(record_id, identity, claim_type=None):
    claim_type = claim_type or random_claim_type()
    claim_date = fake.date_between(start_date="-2y", end_date="today")
    return {
        "record_id": record_id,
        "policyholder_full_name": f"{identity['last']}, {identity['first']}",
        "date_of_birth": identity["dob"].strftime("%Y-%m-%d"),
        "ssn_last4": identity["ssn_last4"],
        "mailing_address": identity["street"],
        "city": identity["city"],
        "state_full": STATE_FULL_NAMES[identity["state"]],
        "zip_code": identity["zip"],
        "claim_category": claim_type.lower(),
        "claim_filed_on": claim_date.strftime("%Y-%m-%d"),
        "loss_amount": random_claim_amount(claim_type),
    }


# ---------------------------------------------------------------------------
# Carrier 3: Coastal Premier Insurance
#   - split first/last name fields
#   - DD-MM-YYYY dates
#   - 2-letter state codes (matches Meridian's convention, unlike Atlas)
#   - peril_type as "Automobile" / "Dwelling"
# ---------------------------------------------------------------------------

def build_coastal_row(record_id, identity, claim_type=None):
    claim_type = claim_type or random_claim_type()
    claim_date = fake.date_between(start_date="-2y", end_date="today")
    peril = "Automobile" if claim_type == "auto" else "Dwelling"
    return {
        "record_id": record_id,
        "insured_first_name": identity["first"],
        "insured_last_name": identity["last"],
        "birth_date": identity["dob"].strftime("%d-%m-%Y"),
        "ssn_last4": identity["ssn_last4"],
        "address_1": identity["street"],
        "town": identity["city"],
        "state_abbrev": identity["state"],
        "postal_code": identity["zip"],
        "peril_type": peril,
        "date_reported": claim_date.strftime("%d-%m-%Y"),
        "incurred_amount": random_claim_amount(claim_type),
    }


def write_csv(path, rows, fieldnames):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows -> {path}")


def main():
    meridian_rows, atlas_rows, coastal_rows = [], [], []
    mid = aid = cid = 1

    # --- Demo case 1: clean, high-confidence match (Meridian + Atlas) ---
    meridian_rows.append(build_meridian_row(f"MER-{mid:04d}", DEMO_IDENTITIES["margaret_chen"], "auto")); mid += 1
    atlas_rows.append(build_atlas_row(f"ATL-{aid:04d}", DEMO_IDENTITIES["margaret_chen"], "auto")); aid += 1

    # --- Demo case 2: ambiguous match, resolved with visible reasoning (Meridian + Coastal) ---
    meridian_rows.append(build_meridian_row(f"MER-{mid:04d}", DEMO_IDENTITIES["jonathan_meyer_meridian"], "property")); mid += 1
    coastal_rows.append(build_coastal_row(f"CST-{cid:04d}", DEMO_IDENTITIES["jonathon_myers_coastal"], "property")); cid += 1

    # --- Demo case 3: same name, different person -> flagged for human review (Meridian + Atlas) ---
    meridian_rows.append(build_meridian_row(f"MER-{mid:04d}", DEMO_IDENTITIES["robert_williams_meridian"], "auto")); mid += 1
    atlas_rows.append(build_atlas_row(f"ATL-{aid:04d}", DEMO_IDENTITIES["robert_williams_atlas"], "property")); aid += 1

    # --- Filler: carrier-exclusive claimants, no cross-carrier overlap ---
    for _ in range(9):
        meridian_rows.append(build_meridian_row(f"MER-{mid:04d}", make_filler_identity())); mid += 1
    for _ in range(8):
        atlas_rows.append(build_atlas_row(f"ATL-{aid:04d}", make_filler_identity())); aid += 1
    for _ in range(8):
        coastal_rows.append(build_coastal_row(f"CST-{cid:04d}", make_filler_identity())); cid += 1

    write_csv(
        os.path.join(OUTPUT_DIR, "meridian_mutual.csv"),
        meridian_rows,
        ["record_id", "claimant_name", "dob", "ssn_last4", "street_address",
         "city", "state", "zip", "claim_type", "loss_date", "claim_amount"],
    )
    write_csv(
        os.path.join(OUTPUT_DIR, "atlas_underwriters.csv"),
        atlas_rows,
        ["record_id", "policyholder_full_name", "date_of_birth", "ssn_last4",
         "mailing_address", "city", "state_full", "zip_code", "claim_category",
         "claim_filed_on", "loss_amount"],
    )
    write_csv(
        os.path.join(OUTPUT_DIR, "coastal_premier.csv"),
        coastal_rows,
        ["record_id", "insured_first_name", "insured_last_name", "birth_date",
         "ssn_last4", "address_1", "town", "state_abbrev", "postal_code",
         "peril_type", "date_reported", "incurred_amount"],
    )


if __name__ == "__main__":
    main()
