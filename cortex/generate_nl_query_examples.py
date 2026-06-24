"""
Uses Snowflake Cortex's COMPLETE function to translate natural-language
questions into SQL against canonical_entities, executes the generated SQL,
and writes both the SQL and the real result rows to:
  - cortex/nl_query_examples.sql   (human-readable, NL question + SQL + result)
  - cortex/nl_query_examples.json  (precomputed results for the dashboard)

This captures real Cortex output once; the dashboard's "try asking" feature
replays the precomputed JSON rather than calling Cortex live from the
browser, consistent with the rest of this project's "run once, replay the
trace" design.

Run: python cortex/generate_nl_query_examples.py
Requires: SNOWFLAKE_* environment variables (see .env.example).
"""

import json
import os
import re

import snowflake.connector
from dotenv import load_dotenv

load_dotenv()

CORTEX_MODEL = "llama3.1-8b"

TABLE_SCHEMA = """\
Table: canonical_entities
Columns:
  entity_id VARCHAR        -- groups claims believed to belong to the same real-world claimant
  record_id VARCHAR         -- source claim record id
  carrier VARCHAR           -- 'meridian_mutual' | 'atlas_underwriters' | 'coastal_premier'
  first_name VARCHAR
  last_name VARCHAR
  dob DATE
  ssn_last4 VARCHAR
  address_line1 VARCHAR
  city VARCHAR
  state VARCHAR
  zip_code VARCHAR
  claim_type VARCHAR        -- 'auto' | 'property'
  claim_date DATE
  claim_amount NUMBER(12,2)
  carrier_count NUMBER       -- distinct carriers contributing to this entity
  claim_count NUMBER
  match_confidence NUMBER    -- 0-1, null for single-carrier entities
  flagged_for_review BOOLEAN
"""

QUESTIONS = [
    "Show me claimants appearing across more than one carrier",
    "Which matched entities have the lowest confidence scores?",
    "What is the total claim amount by claim type across all carriers?",
]

NL2SQL_PROMPT_TEMPLATE = """You are a SQL assistant for a Snowflake table. \
Given the schema below and a natural-language question, respond with ONLY a \
single valid Snowflake SQL SELECT statement that answers it. No explanation, \
no markdown fences, no semicolon at the end.

Select enough columns to make the result self-explanatory to a human reader \
(e.g. include names, carrier, and the relevant numeric/confidence columns, \
not just an id), deduplicate to one row per entity where the question is \
about claimants/entities rather than individual claim rows, and limit \
"lowest"/"highest"-style questions to a handful of rows (e.g. top 5) rather \
than just one.

{schema}

Question: {question}

SQL:"""


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


def clean_sql(raw: str) -> str:
    text = raw.strip()
    fenced = re.search(r"```(?:sql)?\s*(.*?)\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    return text.rstrip(";").strip()


def main():
    conn = get_connection()
    cursor = conn.cursor()
    examples = []

    for question in QUESTIONS:
        prompt = NL2SQL_PROMPT_TEMPLATE.format(schema=TABLE_SCHEMA, question=question)
        cursor.execute(
            "select snowflake.cortex.complete(%s, %s)", (CORTEX_MODEL, prompt)
        )
        generated_sql = clean_sql(cursor.fetchone()[0])

        cursor.execute(generated_sql)
        columns = [col[0] for col in cursor.description]
        rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
        rows = json.loads(json.dumps(rows, default=str))  # stringify Decimal/date

        print(f"Q: {question}\nSQL: {generated_sql}\nRows: {len(rows)}\n")
        examples.append({"question": question, "sql": generated_sql, "results": rows})

    conn.close()

    sql_path = os.path.join(os.path.dirname(__file__), "nl_query_examples.sql")
    with open(sql_path, "w") as f:
        f.write(
            "-- Natural-language query examples captured against canonical_entities\n"
            "-- via Snowflake Cortex (snowflake.cortex.complete, model: "
            f"{CORTEX_MODEL}).\n"
            "-- Cortex translated each question into the SQL below; both the SQL\n"
            "-- and the real result rows were captured by\n"
            "-- cortex/generate_nl_query_examples.py and are replayed by the\n"
            "-- dashboard precomputed (see nl_query_examples.json), not called live.\n\n"
        )
        for ex in examples:
            f.write(f"-- Q: {ex['question']}\n")
            f.write(f"{ex['sql']};\n\n")
            f.write(f"-- Result ({len(ex['results'])} row(s)):\n")
            for row in ex["results"]:
                f.write(f"-- {row}\n")
            f.write("\n")

    json_path = os.path.join(os.path.dirname(__file__), "nl_query_examples.json")
    with open(json_path, "w") as f:
        json.dump(examples, f, indent=2)

    print(f"Wrote {sql_path}\nWrote {json_path}")


if __name__ == "__main__":
    main()
