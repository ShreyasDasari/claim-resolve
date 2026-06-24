"""
Conflict-Resolver Agent.

Given a candidate entity match and any conflicting identity-field values
between the two source records, decides the canonical value for each
conflicting field — or, when the match itself is too uncertain to act on,
explicitly flags the case for human review instead of forcing a resolution.
This is the governance-relevant step: surfacing uncertainty rather than
hiding it.
"""

from agents.llm import call_json

IDENTITY_FIELDS = [
    "first_name", "last_name", "dob", "ssn_last4",
    "address_line1", "city", "state", "zip_code",
]

# Governance thresholds on the upstream entity-resolution confidence (the
# probability the two records are the same person). These are decided in
# code, not left to the LLM's own judgment call, so that whether a case
# gets escalated for human review is a deterministic, auditable rule —
# the LLM's job is to explain the decision, not make the threshold call.
CONFIDENT_MATCH_THRESHOLD = 0.75
CONFIDENT_REJECT_THRESHOLD = 0.15

RESOLVE_PROMPT = """You are the governance step in an entity-resolution pipeline. \
An upstream agent compared two insurance claim records and is confident \
(probability {confidence}) that they belong to the same person:

  reasoning: {er_reasoning}

Record A (carrier: {carrier_a}):
{record_a}

Record B (carrier: {carrier_b}):
{record_b}

Conflicting identity fields between the two records: {conflicting_fields}

For each conflicting field, decide the canonical value, with a short reason \
for each choice (treat the conflicts as formatting differences, typos, or \
stale data rather than evidence of two different people — the upstream \
confidence already establishes that).

Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{{
  "field_resolutions": [{{"field": "<field_name>", "canonical_value": "<value>", "reasoning": "<short reason>"}}],
  "overall_reasoning": "<2-4 sentences explaining your resolution>"
}}
"""

FLAG_PROMPT = """You are the governance step in an entity-resolution pipeline. \
An upstream agent compared two insurance claim records and could not \
confidently determine whether they're the same person (probability \
estimate: {confidence}, right in the ambiguous zone):

  reasoning: {er_reasoning}

Record A (carrier: {carrier_a}):
{record_a}

Record B (carrier: {carrier_b}):
{record_b}

Conflicting identity fields between the two records: {conflicting_fields}

This case is being escalated for human review rather than auto-resolved. \
Explain in plain language what a human reviewer should look at — which \
fields support a match, which argue against one, and what additional \
information (if any) would resolve the ambiguity. Do not pick a side.

Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{{
  "overall_reasoning": "<2-4 sentences a human reviewer would find useful>"
}}
"""


def find_conflicts(record_a: dict, record_b: dict) -> list[str]:
    return [
        field for field in IDENTITY_FIELDS
        if str(record_a.get(field, "")).strip().lower()
        != str(record_b.get(field, "")).strip().lower()
    ]


def resolve_conflicts(
    carrier_a, record_a, carrier_b, record_b, entity_resolution_result
) -> dict:
    """Applies the governance thresholds to the upstream confidence, then
    asks Gemini to either resolve the conflicting fields (confident match)
    or explain what a human reviewer should examine (ambiguous zone).
    Confident non-matches are handled entirely in code with no LLM call —
    there's nothing to govern once the upstream agent has clearly rejected
    a pairing."""
    conflicting_fields = find_conflicts(record_a, record_b)
    confidence = entity_resolution_result["confidence"]

    if confidence < CONFIDENT_REJECT_THRESHOLD:
        return {
            "flagged_for_review": False,
            "field_resolutions": [],
            "overall_reasoning": (
                f"Entity-resolution confidence ({confidence}) is low enough to "
                "confidently treat this as two different people; not escalated "
                "for review."
            ),
            "final_confidence": confidence,
            "conflicting_fields": conflicting_fields,
        }

    if confidence >= CONFIDENT_MATCH_THRESHOLD:
        prompt = RESOLVE_PROMPT.format(
            confidence=confidence, er_reasoning=entity_resolution_result["reasoning"],
            carrier_a=carrier_a, record_a=record_a,
            carrier_b=carrier_b, record_b=record_b,
            conflicting_fields=conflicting_fields,
        )
        result = call_json(prompt)
        result["flagged_for_review"] = False
        result["final_confidence"] = confidence
        result["conflicting_fields"] = conflicting_fields
        return result

    prompt = FLAG_PROMPT.format(
        confidence=confidence, er_reasoning=entity_resolution_result["reasoning"],
        carrier_a=carrier_a, record_a=record_a,
        carrier_b=carrier_b, record_b=record_b,
        conflicting_fields=conflicting_fields,
    )
    result = call_json(prompt)
    result["flagged_for_review"] = True
    result["field_resolutions"] = []
    result["final_confidence"] = confidence
    result["conflicting_fields"] = conflicting_fields
    return result
