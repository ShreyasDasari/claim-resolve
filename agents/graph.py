"""
LangGraph definition for the three-agent claim-resolution pipeline, and the
runner that builds candidate cross-carrier cases from the synthetic data,
runs each through the graph, and writes output/trace_export.json.

Run: python -m agents.graph
Requires: GOOGLE_API_KEY in the environment (see .env.example).
"""

import csv
import os
from difflib import SequenceMatcher
from typing import TypedDict

from dotenv import load_dotenv
from langgraph.graph import END, StateGraph

from agents.conflict_resolver_agent import CONFIDENT_REJECT_THRESHOLD, resolve_conflicts
from agents.entity_resolution_agent import resolve_entities
from agents.schema_mapping_agent import apply_canonical_mapping, map_carrier_schema
from agents.trace_logger import build_case, build_step, write_trace_export

load_dotenv()

RAW_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "trace_export.json")

CARRIERS = ["meridian_mutual", "atlas_underwriters", "coastal_premier"]
IDENTITY_FIELDS = [
    "first_name", "last_name", "dob", "ssn_last4",
    "address_line1", "city", "state", "zip_code",
]


# ---------------------------------------------------------------------------
# Loading + blocking (candidate-pair generation)
# ---------------------------------------------------------------------------

def load_raw_carrier(carrier: str) -> list[dict]:
    path = os.path.join(RAW_DIR, f"{carrier}.csv")
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def rough_last_name(carrier: str, raw_row: dict) -> str:
    if carrier == "meridian_mutual":
        return raw_row["claimant_name"].strip().split(" ")[-1]
    if carrier == "atlas_underwriters":
        return raw_row["policyholder_full_name"].split(",")[0].strip()
    if carrier == "coastal_premier":
        return raw_row["insured_last_name"].strip()
    raise ValueError(carrier)


def is_candidate_pair(carrier_a, raw_a, carrier_b, raw_b) -> bool:
    """Cheap blocking heuristic to avoid asking the LLM about every possible
    cross-carrier pair: candidates are pairs that share an SSN-last-4, or
    have a highly similar last name. This mirrors how a real entity
    resolution pipeline blocks before doing expensive pairwise comparison."""
    if raw_a["ssn_last4"] == raw_b["ssn_last4"]:
        return True
    last_a = rough_last_name(carrier_a, raw_a).lower()
    last_b = rough_last_name(carrier_b, raw_b).lower()
    return SequenceMatcher(None, last_a, last_b).ratio() >= 0.8


def build_candidate_cases() -> list[dict]:
    rows_by_carrier = {c: load_raw_carrier(c) for c in CARRIERS}
    cases = []
    for i, carrier_a in enumerate(CARRIERS):
        for carrier_b in CARRIERS[i + 1:]:
            for raw_a in rows_by_carrier[carrier_a]:
                for raw_b in rows_by_carrier[carrier_b]:
                    if is_candidate_pair(carrier_a, raw_a, carrier_b, raw_b):
                        cases.append({
                            "carrier_a": carrier_a, "raw_a": raw_a,
                            "carrier_b": carrier_b, "raw_b": raw_b,
                        })
    return cases


# ---------------------------------------------------------------------------
# LangGraph state + nodes
# ---------------------------------------------------------------------------

class CaseState(TypedDict):
    case_id: str
    carrier_a: str
    raw_a: dict
    carrier_b: str
    raw_b: dict
    carrier_mappings: dict
    mapped_a: dict
    mapped_b: dict
    schema_step: dict
    er_result: dict
    er_step: dict
    cr_result: dict
    cr_step: dict


def schema_mapping_node(state: CaseState) -> dict:
    carrier_a, carrier_b = state["carrier_a"], state["carrier_b"]
    mapped_a = apply_canonical_mapping(carrier_a, state["raw_a"])
    mapped_b = apply_canonical_mapping(carrier_b, state["raw_b"])

    mapping_a = state["carrier_mappings"][carrier_a]
    mapping_b = state["carrier_mappings"][carrier_b]
    reasoning = (
        f"[{carrier_a}] {mapping_a['reasoning']} "
        f"[{carrier_b}] {mapping_b['reasoning']}"
    )
    input_summary = (
        f"Raw record from {carrier_a} (record_id={state['raw_a']['record_id']}) "
        f"and {carrier_b} (record_id={state['raw_b']['record_id']})"
    )
    output_summary = f"Canonical A: {mapped_a} | Canonical B: {mapped_b}"
    step = build_step("schema_mapping", input_summary, reasoning, output_summary, confidence=1.0)
    return {"mapped_a": mapped_a, "mapped_b": mapped_b, "schema_step": step}


def entity_resolution_node(state: CaseState) -> dict:
    carrier_a, carrier_b = state["carrier_a"], state["carrier_b"]
    result = resolve_entities(carrier_a, state["mapped_a"], carrier_b, state["mapped_b"])
    input_summary = (
        f"Canonical record from {carrier_a} vs canonical record from {carrier_b}: "
        f"comparing names, DOB, SSN-last-4, and address."
    )
    output_summary = f"matched={result['matched']}, confidence={result['confidence']}"
    step = build_step(
        "entity_resolution", input_summary, result["reasoning"], output_summary, result["confidence"]
    )
    return {"er_result": result, "er_step": step}


def conflict_resolver_node(state: CaseState) -> dict:
    carrier_a, carrier_b = state["carrier_a"], state["carrier_b"]
    result = resolve_conflicts(
        carrier_a, state["mapped_a"], carrier_b, state["mapped_b"], state["er_result"]
    )
    input_summary = (
        f"Entity-resolution verdict (matched={state['er_result']['matched']}, "
        f"confidence={state['er_result']['confidence']}) plus conflicting fields: "
        f"{result['conflicting_fields']}"
    )
    output_summary = (
        f"flagged_for_review={result['flagged_for_review']}, "
        f"resolutions={result['field_resolutions']}"
    )
    step = build_step(
        "conflict_resolver", input_summary, result["overall_reasoning"],
        output_summary, result["final_confidence"],
    )
    return {"cr_result": result, "cr_step": step}


def build_graph():
    graph = StateGraph(CaseState)
    graph.add_node("schema_mapping", schema_mapping_node)
    graph.add_node("entity_resolution", entity_resolution_node)
    graph.add_node("conflict_resolver", conflict_resolver_node)
    graph.set_entry_point("schema_mapping")
    graph.add_edge("schema_mapping", "entity_resolution")
    graph.add_edge("entity_resolution", "conflict_resolver")
    graph.add_edge("conflict_resolver", END)
    return graph.compile()


# ---------------------------------------------------------------------------
# Trace assembly
# ---------------------------------------------------------------------------

def merge_canonical_entity(mapped_a, mapped_b, cr_result) -> dict:
    resolutions = {r["field"]: r["canonical_value"] for r in cr_result["field_resolutions"]}
    merged = {}
    for field in IDENTITY_FIELDS:
        merged[field] = resolutions.get(field, mapped_a[field])
    merged["claims"] = [
        {k: v for k, v in mapped_a.items() if k not in IDENTITY_FIELDS},
        {k: v for k, v in mapped_b.items() if k not in IDENTITY_FIELDS},
    ]
    return merged


def determine_case_type(cr_result) -> str | None:
    """Returns None for candidate pairs the pipeline confidently rejects as a
    non-match (e.g. coincidentally similar surnames pulled in by blocking) —
    these aren't one of the three case types the trace schema models and are
    not included in the final export, the same way a hand-picked case study
    wouldn't surface every true negative a blocking pass considered. The
    governance thresholds applied in conflict_resolver_agent.py are the
    single source of truth for this classification."""
    if cr_result["final_confidence"] < CONFIDENT_REJECT_THRESHOLD:
        return None
    if cr_result["flagged_for_review"]:
        return "flagged_for_review"
    if not cr_result["conflicting_fields"]:
        return "clean_match"
    return "ambiguous_match_resolved"


def run_case(graph, case_id: str, carrier_mappings: dict, carrier_a, raw_a, carrier_b, raw_b) -> dict:
    final_state = graph.invoke({
        "case_id": case_id,
        "carrier_a": carrier_a, "raw_a": raw_a,
        "carrier_b": carrier_b, "raw_b": raw_b,
        "carrier_mappings": carrier_mappings,
    })

    cr_result = final_state["cr_result"]
    case_type = determine_case_type(cr_result)
    if case_type is None:
        return None
    flagged = cr_result["flagged_for_review"]

    final_result = {
        "matched": case_type != "flagged_for_review",
        "canonical_entity": (
            {} if flagged else merge_canonical_entity(final_state["mapped_a"], final_state["mapped_b"], cr_result)
        ),
        "confidence": cr_result["final_confidence"],
        "flagged_for_review": flagged,
    }

    source_records = [
        {"carrier": carrier_a, "raw_fields": raw_a},
        {"carrier": carrier_b, "raw_fields": raw_b},
    ]
    steps = [final_state["schema_step"], final_state["er_step"], final_state["cr_step"]]
    return build_case(case_id, case_type, source_records, steps, final_result)


def main():
    print("Mapping carrier schemas (one Gemini call per carrier)...")
    carrier_mappings = {c: map_carrier_schema(c, load_raw_carrier(c)[:2]) for c in CARRIERS}
    for carrier, mapping in carrier_mappings.items():
        print(f"  {carrier}: {mapping['field_mapping']}")

    print("Building candidate cross-carrier cases via blocking...")
    candidates = build_candidate_cases()
    print(f"  {len(candidates)} candidate case(s) found.")

    graph = build_graph()
    cases = []
    for i, candidate in enumerate(candidates, start=1):
        case_id = f"case_{i:03d}"
        print(f"Running {case_id}: {candidate['carrier_a']} x {candidate['carrier_b']}...")
        case = run_case(graph, case_id, carrier_mappings, **candidate)
        if case is None:
            print("  -> rejected as a non-match, excluded from trace export")
            continue
        print(f"  -> case_type={case['case_type']}, confidence={case['final_result']['confidence']}")
        cases.append(case)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    write_trace_export(cases, OUTPUT_PATH)
    print(f"Wrote trace export -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
