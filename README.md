# claim-resolve

A multi-agent pipeline that reconciles insurance claims across multiple carriers with mismatched schemas and overlapping claimants — the same general problem space the insurance industry tackles via shared data networks, built end to end on a free tech stack.

Given three synthetic carrier extracts with different field names, date formats, and naming conventions, the pipeline:

1. maps each carrier's raw fields to a shared canonical schema,
2. identifies which records across carriers likely represent the same person despite typos and formatting differences, and
3. resolves conflicting attribute values for matched claimants — or explicitly flags the case for human review when the evidence is genuinely ambiguous, rather than forcing a silent decision.

Every step's input, reasoning, and output is captured in a structured trace (`output/trace_export.json`), which is the artifact a separate dashboard project replays.

## Why this exists

This is a portfolio project demonstrating cross-carrier entity resolution and an auditable, explainable agent pipeline — the kind of work data engineering and applied-AI teams in insurance (and adjacent regulated industries) do, built with an open, fully free stack instead of the commercial tools a production version would use.

## Architecture

```
 synthetic carrier        ingestion              dbt                  3-agent pipeline           trace export
   CSV extracts     -->   (simulates    -->   staging/intermediate/  -->  (LangGraph,        -->  output/
 (Faker, 3 carriers,      Qlik Replicate)      marts: canonical_      Gemini or Groq LLM,         trace_export.json
  deliberately                                 entities table in       schema-mapping  ->
  mismatched schemas)                          Snowflake)              entity-resolution ->
                                                     |                  conflict-resolver)
                                                     v                       |
                                              Cortex NL queries              v
                                              over canonical_entities   dashboard (separate
                                                                         project, v0 + Vercel)
                                                                         replays the trace —
                                                                         no live agent calls
```

Two parallel, complementary layers sit on top of the same normalized claims:

- **dbt + Snowflake** does deterministic, SQL-based entity grouping (exact match on SSN-last-4 + date of birth, plus a Jaro-Winkler name-similarity score) — fast, auditable, and what Cortex's natural-language query layer runs against.
- **The LangGraph agent pipeline** does the harder reasoning: handling typos, weighing conflicting weak/strong identity signals, and surfacing genuine ambiguity instead of forcing a match or silently dropping a candidate. Its output is the structured trace.

The dbt mart is intentionally conservative — it only groups claims when identifiers match closely. The agent pipeline is where the nuanced, governance-relevant decisions (and their reasoning) live.

## Honesty notes on what's real vs. simulated

- **All data is synthetic.** Generated with Faker; no real claimant or policy data of any kind.
- **Qlik Replicate / Qlik Compose were not used.** They're commercial tools with no free tier. `ingestion/load_to_snowflake.py` simulates the role Qlik Replicate would play in production — change-data-capture-style ingestion of raw source records into a warehouse landing zone, with no transformation applied. This is disclosed in the script's own header comment as well.
- **The agent reasoning and Cortex query results in this repo are real model output**, captured by actually running the pipeline against a live Snowflake trial account, not hand-written or fabricated. See "Deviations from the original plan" below for which LLM provider produced them.

## Repo structure

```
claim-resolve/
├── data/
│   ├── generate_synthetic_data.py   # Faker-based synthetic carrier data generator
│   └── raw/                          # generated CSVs (gitignored, regenerate with the script)
├── ingestion/
│   └── load_to_snowflake.py          # simulates Qlik Replicate's role; loads raw CSVs to Snowflake
├── dbt_project/
│   ├── models/staging/                # one model per carrier, light typing/cleaning
│   ├── models/intermediate/           # schema-normalized to the canonical shape
│   ├── models/marts/canonical_entities.sql  # deterministic cross-carrier entity grouping
│   └── seeds/state_abbreviations.csv
├── agents/
│   ├── graph.py                       # LangGraph definition + pipeline runner
│   ├── schema_mapping_agent.py        # Agent 1
│   ├── entity_resolution_agent.py     # Agent 2
│   ├── conflict_resolver_agent.py     # Agent 3 (governance thresholds + LLM reasoning)
│   ├── llm.py                         # shared LLM client (Gemini, with a Groq fallback)
│   └── trace_logger.py                # writes the structured trace JSON
├── cortex/
│   ├── generate_nl_query_examples.py  # Cortex NL2SQL capture script
│   ├── nl_query_examples.sql          # captured questions, generated SQL, real results
│   └── nl_query_examples.json         # same, as precomputed data for the dashboard
├── output/
│   └── trace_export.json              # the artifact the dashboard consumes
├── .env.example
└── requirements.txt
```

## The three agents

All three run as a sequential LangGraph (`schema_mapping -> entity_resolution -> conflict_resolver`), invoked once per candidate cross-carrier record pair. Candidate pairs are found by a cheap blocking pass (shared SSN-last-4, or highly similar surname) before any LLM call — the same precision/recall tradeoff a real entity-resolution pipeline makes before doing expensive pairwise comparison.

1. **Schema-Mapping Agent** (`schema_mapping_agent.py`) — given a carrier's raw column names and sample values, the LLM decides which canonical field each one maps to and explains ambiguous calls (e.g. a combined name field, a full state name vs. a 2-letter code). This runs once per carrier; the resulting mapping is reused for every case involving that carrier. Applying the mapping to a given row (the actual value-level parsing) is deterministic code, the same way a generated dbt model would do it — the LLM's job is the schema-level judgment call, not row-by-row parsing.

2. **Entity-Resolution Agent** (`entity_resolution_agent.py`) — compares two canonical records and returns a probability (0-1) that they're the same person, plus plain-language reasoning. The prompt explicitly treats SSN-last-4 as a weak identifier on its own (it's 4 digits) and instructs the model to weigh the full combination of evidence.

3. **Conflict-Resolver Agent** (`conflict_resolver_agent.py`) — the governance step. **Whether a case gets escalated for human review is a deterministic rule based on the entity-resolution confidence, not a free-form LLM judgment call:**

   | Confidence | Action |
   |---|---|
   | < 0.15 | Confidently rejected as a non-match. No LLM call, excluded from the trace. |
   | 0.15 – 0.75 | Genuinely ambiguous. Escalated (`flagged_for_review = true`); the LLM explains what a human reviewer should look at, without picking a side. |
   | ≥ 0.75 | Confident match. The LLM resolves each conflicting field (e.g. picks a canonical address) with a stated reason. |

   This came from a real failure during development: letting the LLM decide the flag/no-flag boolean itself produced inconsistent results — the same model would sometimes mark a confidently-rejected non-match (e.g. two different people who happen to share a surname) as needing review, because "confidence" was ambiguous between "confidence in my verdict" and "confidence these are the same person." Pulling the threshold decision into code and fixing the prompt to define confidence unambiguously (always P(same person)) fixed this.

Each step's full input, reasoning, and output is captured by `trace_logger.py` into the shape described in `PROJECT_BRIEF.md`.

## Tech stack

| Layer | Tool | Notes |
|---|---|---|
| Synthetic data | Python + Faker | 3 carriers, auto + property claims, deliberately mismatched schemas |
| Ingestion | Python (simulates Qlik Replicate) | See honesty note above |
| Transformation | dbt Core | staging → intermediate → marts (`canonical_entities`) |
| Warehouse | Snowflake (trial account) | |
| Agent orchestration | LangGraph | 3-node sequential pipeline |
| LLM | Gemini by default; Groq fallback actually used for this run | See deviations below |
| NL query layer | Snowflake Cortex (`snowflake.cortex.complete`) | NL question → generated SQL → real result, captured once |
| Trace capture | Custom JSON logger | First-class output, not a debugging afterthought |
| Dashboard | Built separately (v0 + Vercel), reads `trace_export.json` | Not part of this repo |

## Deviations from the original plan

This project's brief specified Gemini 2.0 Flash via Google AI Studio's free tier for all agent reasoning. During development:

- **Gemini's free tier turned out to cap at 20 requests/day per model**, on this project's API key — and that cap was hit across every available Gemini variant (`gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`) while iterating on the agent prompts.
- With the project owner's explicit sign-off, **Groq (`llama-3.3-70b-versatile`) was used as a fallback provider** to finish the run captured in `output/trace_export.json`. This is a real architectural option in `agents/llm.py`, not a one-off hack: set `LLM_PROVIDER=gemini` (default) or `LLM_PROVIDER=groq` in `.env`, and the rest of the pipeline is unaffected — every prompt, the LangGraph structure, and the governance thresholds are provider-agnostic.
- `agents/llm.py` also disk-caches LLM calls (`.llm_cache.json`, gitignored) keyed by a hash of the exact prompt, so iterating on prompts or case data doesn't needlessly re-spend a scarce daily quota on calls that would return the same thing. Every cached entry is a real call's output — nothing is fabricated.
- The Cortex NL query layer uses `snowflake.cortex.complete` (model `llama3.1-8b`, available on the trial account) to translate each natural-language question into SQL, which is then actually executed — an NL2SQL pattern, rather than Cortex Analyst's semantic-model approach, to keep setup to a single SQL function call.

If you re-run this with a less quota-constrained Gemini key (or a paid tier), set `LLM_PROVIDER=gemini` and everything else works unchanged.

## Running it

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your GOOGLE_API_KEY (or GROQ_API_KEY + LLM_PROVIDER=groq) and Snowflake credentials
```

1. **Generate synthetic data:**
   ```bash
   python data/generate_synthetic_data.py
   ```
2. **Load it into Snowflake** (simulates Qlik Replicate's role):
   ```bash
   python ingestion/load_to_snowflake.py
   ```
3. **Run dbt:**
   ```bash
   cp dbt_project/profiles.yml.example dbt_project/profiles.yml
   export DBT_PROFILES_DIR=dbt_project
   dbt seed --project-dir dbt_project
   dbt run --project-dir dbt_project
   ```
4. **Run the agent pipeline** (produces `output/trace_export.json`):
   ```bash
   python -m agents.graph
   ```
5. **Capture Cortex NL query examples:**
   ```bash
   python cortex/generate_nl_query_examples.py
   ```

## What's in the trace export

`output/trace_export.json` contains one entry per hand-relevant candidate case (not every blocking candidate — confident non-matches are resolved in code and excluded, the same way a case study wouldn't enumerate every true negative a blocking pass considered). The current captured run includes exactly the three required case types:

- **`clean_match`** — two records for the same claimant (Margaret Chen) across Meridian Mutual and Atlas Underwriters: identical SSN-last-4, DOB, and address once name formatting (`"Margaret Chen"` vs. `"Chen, Margaret"`) is normalized. Resolved with confidence 0.9, no conflicts.
- **`ambiguous_match_resolved`** — Jonathan Meyer (Meridian) vs. "Jonathon Myers" (Coastal Premier): same DOB, SSN-last-4, and core address, but a typo'd first and last name and a missing apartment number. The conflict resolver picks a canonical spelling and address with stated reasoning, confidence 0.8.
- **`flagged_for_review`** — two "Robert Williams" records (Meridian, Atlas) sharing a name and SSN-last-4 but with different dates of birth and addresses. Confidence (0.2) lands in the ambiguous band, so the pipeline escalates rather than guessing either way.

See `PROJECT_BRIEF.md` for the full JSON schema.

## Future work

- **Live "try your own claim" mode.** Right now the dashboard replays a precomputed trace because a multi-step LangGraph run with per-node LLM calls is a poor fit for Vercel's serverless functions (cold starts, execution time limits, and it would expose a free-tier API quota to any visitor). A live mode would need a small always-on backend (e.g. Render's free tier) accepting a claim pair and streaming the agent trace back. Not built in v1.
- Expanding the synthetic dataset beyond 3 carriers / ~30 records to stress-test the blocking step at larger scale.
- Cortex Analyst (semantic-model-based NL querying) as a richer alternative to the current NL2SQL-via-`COMPLETE` approach, if/when a semantic model is worth maintaining for this schema.
