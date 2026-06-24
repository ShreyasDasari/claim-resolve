# claim-resolve — Project Brief

## What this is

A multi-agent pipeline that reconciles insurance claims data across multiple "carriers" with mismatched schemas and overlapping entities (same claimant, different name formatting/typos across sources). Built to demonstrate cross-carrier entity resolution and risk-pattern detection, the same general problem space the insurance industry tackles via shared data networks, using an open, fully free tech stack.

**Tone for all code comments, README, and commit messages**: professional, precise, no hype. This is a technical portfolio piece aimed at a data engineering / data & AI audience. Let the work speak for itself.

**Important honesty constraint**: Qlik Replicate/Qlik Compose are commercial tools with no free tier. This project simulates that ingestion layer with Python. The README and any code comments referencing this step MUST say so explicitly (e.g., "This script simulates the role Qlik Replicate would play in production: change-data-capture style ingestion from source systems into the warehouse"). Never imply Qlik was actually used.

---

## Tech stack (decided, do not substitute without flagging to the user)

| Layer | Tool | Notes |
|---|---|---|
| Synthetic data generation | Python + Faker | 2-3 synthetic "carrier" datasets, auto + property claims |
| Ingestion layer | Python (simulating Qlik Replicate's role — disclose this) | Loads raw synthetic data into Snowflake staging tables |
| Transformation | dbt Core (open source) | Staging → cleaned → canonical entity models |
| Warehouse | Snowflake (free trial) | All transformed data lives here |
| Agent orchestration | LangGraph (Python) | Three-agent pipeline, see below |
| LLM | Google Gemini (2.0 Flash via Google AI Studio free tier), accessed through `langchain-google-genai` | All agent reasoning calls |
| NL query layer | Snowflake Cortex (within free trial credits) | Natural-language queries over the final canonical table |
| Trace capture | Custom JSON logger inside the LangGraph run | See schema below — this is first-class output, not a debugging afterthought |
| Dashboard | v0-generated Next.js app (user builds this separately in v0, not part of this repo's backend work) | Reads precomputed JSON, does NOT call live APIs |
| Dashboard hosting | Vercel free tier | Static/precomputed data only |
| Code hosting | GitHub: `ShreyasDasari/claim-resolve` (already created) | Public repo |

---

## Why precomputed, not live, on the dashboard

Vercel's serverless functions aren't a good fit for a multi-step Python/LangGraph agent run calling an LLM at each node (cold starts, execution time limits, exposes free-tier API quota to any visitor). Instead: run the pipeline once, capture a full structured trace of what each agent did and why, and have the dashboard be a **trace player** — a step-through replay of the agent's reasoning, not a live re-execution. This is faster, free regardless of traffic, deterministic, and lets us hand-pick the most illustrative example cases.

A live "try your own claim" mode is an explicit stretch goal for later (would need a small always-on Python backend, e.g. Render free tier) — **do not build this in v1**. Flag it as a "Future work" line in the README instead.

---

## Repo structure

```
claim-resolve/
├── README.md
├── PROJECT_BRIEF.md          (this file)
├── data/
│   └── generate_synthetic_data.py
├── ingestion/
│   └── load_to_snowflake.py   (clearly commented: simulates Qlik Replicate's role)
├── dbt_project/
│   ├── dbt_project.yml
│   ├── models/
│   │   ├── staging/            (one model per synthetic carrier source)
│   │   ├── intermediate/        (schema-normalized models)
│   │   └── marts/
│   │       └── canonical_entities.sql
├── agents/
│   ├── graph.py                 (LangGraph definition, 3 nodes below)
│   ├── schema_mapping_agent.py
│   ├── entity_resolution_agent.py
│   ├── conflict_resolver_agent.py
│   └── trace_logger.py          (writes the structured JSON trace)
├── cortex/
│   └── nl_query_examples.sql    (sample Cortex NL queries over canonical_entities)
├── output/
│   └── trace_export.json        (final artifact the dashboard consumes)
├── .env.example
└── requirements.txt
```

---

## The three agents (LangGraph nodes)

1. **Schema-Mapping Agent**
   Input: raw records from each synthetic carrier (deliberately different field names/formats, e.g. `claimant_name` vs `policyholder_full_name`, different date formats, different state abbreviation conventions).
   Job: map each source's fields to a canonical schema. Output includes its reasoning for ambiguous mappings.

2. **Entity-Resolution Agent**
   Input: schema-mapped records across all sources.
   Job: identify likely matches between records representing the same real-world claimant across carriers, despite name variations, typos, formatting differences. Must output a confidence score (0–1) and a plain-language reason for each match decision.

3. **Conflict-Resolver Agent**
   Input: matched entity clusters from the resolution agent, including any conflicting attribute values (e.g., different addresses on file).
   Job: decide the canonical value for each conflicting field, with reasoning, and explicitly flag low-confidence matches for human review rather than silently resolving them. This is the governance-relevant step — surfacing uncertainty rather than hiding it matters more for this audience than forcing every match to resolve.

Each node's full input, output, and reasoning text must be captured by `trace_logger.py`.

---

## Trace JSON schema (what the dashboard will consume)

```json
{
  "run_id": "string",
  "generated_at": "ISO8601 timestamp",
  "cases": [
    {
      "case_id": "string",
      "case_type": "clean_match | ambiguous_match_resolved | flagged_for_review",
      "source_records": [ { "carrier": "string", "raw_fields": {} } ],
      "steps": [
        {
          "agent": "schema_mapping | entity_resolution | conflict_resolver",
          "input_summary": "string",
          "reasoning": "string (the agent's actual reasoning text)",
          "output_summary": "string",
          "confidence": 0.0
        }
      ],
      "final_result": {
        "matched": true,
        "canonical_entity": {},
        "confidence": 0.0,
        "flagged_for_review": false
      }
    }
  ]
}
```

Hand-pick and include at minimum:
- 1 clean, high-confidence match
- 1 ambiguous case the agent resolved with visible reasoning
- 1 case correctly flagged for human review instead of forced resolution

This file is the single source of truth the v0 dashboard will be built against — keep its shape stable once finalized so dashboard work isn't blocked by backend changes.

---

## Cortex NL query layer

After `canonical_entities` is built in Snowflake, use Cortex to support natural-language queries such as:
- "Show me claimants appearing across more than one carrier"
- "Which matched entities have the lowest confidence scores?"

Capture 2-3 example queries and their results in `cortex/nl_query_examples.sql` — these get surfaced as a "try asking" feature on the dashboard, using precomputed results, not a live Cortex call from the browser.

---

## What the v0 dashboard needs (for context — built separately by the user in v0, but the backend must produce exactly the data it needs)

1. A short architecture diagram/explainer at the top (10-second understanding for a non-technical skimmer)
2. Side-by-side raw records from the synthetic carriers showing the mismatch problem
3. A step-through trace player for the 3 hand-picked cases (using `trace_export.json`)
4. The final canonical reconciled view
5. The 2-3 precomputed natural-language query examples with results
6. A visible note: "Qlik Replicate/Compose would own ingestion in production — this prototype simulates that step in Python" and a link to the public GitHub repo

---

## Definition of done for v1

- [ ] Synthetic data generated for 2-3 carriers with deliberate schema/format mismatches
- [ ] dbt models run cleanly against Snowflake trial
- [ ] All 3 agents run via LangGraph using Gemini, producing real reasoning text (not placeholder strings)
- [ ] `trace_export.json` produced with at least the 3 required case types
- [ ] Cortex NL query examples captured with real results
- [ ] README written, including the Qlik disclosure and a "Future work: live mode" section
- [ ] Repo is clean enough that someone on a data team could read it in 10 minutes and understand exactly what was built and why

---

## Out of scope for v1 (explicitly do not build)

- Live agent execution triggered from the dashboard
- Any backend server beyond local scripts that produce `trace_export.json`
- Real PII or real claims data of any kind — synthetic only, always
