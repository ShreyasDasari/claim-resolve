"""
Loads the synthetic carrier CSVs into Snowflake raw staging tables.

IMPORTANT — what this script is and isn't:
This script SIMULATES the role Qlik Replicate would play in a production
cross-carrier data pipeline: change-data-capture-style ingestion of raw
records from source systems into the warehouse's landing zone, with no
transformation applied. Qlik Replicate/Compose are commercial tools with
no free tier; they were not used in this project. This is a plain Python
+ snowflake-connector-python script standing in for that step.

In production, this would be Qlik Replicate continuously streaming changed
rows from each carrier's source database into Snowflake RAW tables. Here,
it's a one-shot batch load of the synthetic CSVs, run on demand.

Every column is loaded as VARCHAR with no type casting or cleaning — that
work belongs to dbt's staging models, not this layer. This mirrors how a
CDC landing zone is typically schema-light and source-faithful.

Run: python ingestion/load_to_snowflake.py
Requires: SNOWFLAKE_* environment variables (see .env.example).
"""

import csv
import os

import snowflake.connector
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")

# Maps each synthetic carrier CSV to its raw staging table name and the
# carrier's own source column names (used as-is — no renaming here).
SOURCES = {
    "meridian_mutual.csv": {
        "table": "RAW_MERIDIAN_MUTUAL",
        "columns": [
            "record_id", "claimant_name", "dob", "ssn_last4", "street_address",
            "city", "state", "zip", "claim_type", "loss_date", "claim_amount",
        ],
    },
    "atlas_underwriters.csv": {
        "table": "RAW_ATLAS_UNDERWRITERS",
        "columns": [
            "record_id", "policyholder_full_name", "date_of_birth", "ssn_last4",
            "mailing_address", "city", "state_full", "zip_code", "claim_category",
            "claim_filed_on", "loss_amount",
        ],
    },
    "coastal_premier.csv": {
        "table": "RAW_COASTAL_PREMIER",
        "columns": [
            "record_id", "insured_first_name", "insured_last_name", "birth_date",
            "ssn_last4", "address_1", "town", "state_abbrev", "postal_code",
            "peril_type", "date_reported", "incurred_amount",
        ],
    },
}


def get_connection():
    return snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        role=os.environ.get("SNOWFLAKE_ROLE"),
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
        database=os.environ.get("SNOWFLAKE_DATABASE", "CLAIM_RESOLVE"),
        schema=os.environ.get("SNOWFLAKE_SCHEMA", "RAW"),
    )


def ensure_database_and_schema(cursor):
    database = os.environ.get("SNOWFLAKE_DATABASE", "CLAIM_RESOLVE")
    schema = os.environ.get("SNOWFLAKE_SCHEMA", "RAW")
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {database}.{schema}")
    cursor.execute(f"USE SCHEMA {database}.{schema}")


def create_raw_table(cursor, table_name, columns):
    # Schema-light landing zone: everything lands as VARCHAR, matching how a
    # CDC tool like Qlik Replicate stages raw source data before any
    # transformation layer (dbt, here) imposes types and cleans it up.
    # Column names are left unquoted so Snowflake folds them to uppercase,
    # matching how dbt's unquoted column references resolve.
    column_defs = ", ".join(f"{col} VARCHAR" for col in columns)
    cursor.execute(f"CREATE OR REPLACE TABLE {table_name} ({column_defs})")


def load_csv(cursor, csv_path, table_name, columns):
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        rows = [tuple(row[col] for col in columns) for row in reader]

    if not rows:
        print(f"  No rows found in {csv_path}, skipping.")
        return

    placeholders = ", ".join(["%s"] * len(columns))
    column_list = ", ".join(columns)
    insert_sql = f"INSERT INTO {table_name} ({column_list}) VALUES ({placeholders})"
    cursor.executemany(insert_sql, rows)
    print(f"  Loaded {len(rows)} rows -> {table_name}")


def main():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        ensure_database_and_schema(cursor)

        for filename, meta in SOURCES.items():
            csv_path = os.path.join(DATA_DIR, filename)
            print(f"Loading {filename} -> {meta['table']}")
            create_raw_table(cursor, meta["table"], meta["columns"])
            load_csv(cursor, csv_path, meta["table"], meta["columns"])

        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
