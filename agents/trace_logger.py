"""
Captures the full input/output/reasoning of every agent step into the trace
JSON structure the dashboard consumes (see PROJECT_BRIEF.md for the schema).
This is first-class output of the pipeline, not a debugging side effect.
"""

import json
import uuid
from datetime import datetime, timezone


def new_run_id() -> str:
    return f"run_{uuid.uuid4().hex[:12]}"


def build_step(agent: str, input_summary: str, reasoning: str, output_summary: str, confidence: float) -> dict:
    return {
        "agent": agent,
        "input_summary": input_summary,
        "reasoning": reasoning,
        "output_summary": output_summary,
        "confidence": confidence,
    }


def build_case(case_id: str, case_type: str, source_records: list, steps: list, final_result: dict) -> dict:
    return {
        "case_id": case_id,
        "case_type": case_type,
        "source_records": source_records,
        "steps": steps,
        "final_result": final_result,
    }


def write_trace_export(cases: list, output_path: str, run_id: str = None) -> dict:
    trace = {
        "run_id": run_id or new_run_id(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cases": cases,
    }
    with open(output_path, "w") as f:
        json.dump(trace, f, indent=2)
    return trace
