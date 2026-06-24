"""
Entity-Resolution Agent.

Takes two schema-mapped (canonical) records from different carriers and
decides whether they likely represent the same real-world claimant, with a
0-1 confidence score and plain-language reasoning.
"""

from agents.llm import call_json

PROMPT_TEMPLATE = """You are resolving whether two insurance claim records from \
different carriers belong to the same real-world claimant.

Record A (carrier: {carrier_a}):
{record_a}

Record B (carrier: {carrier_b}):
{record_b}

Consider name similarity (typos and formatting differences should not by \
themselves rule out a match), date of birth, address, and the SSN-last-4 \
field. Treat ssn_last4 as a WEAK identifier on its own — it's only 4 digits, \
so an exact match is supportive but not conclusive, and a mismatch on its \
own does not rule out a match if other fields strongly agree. Weigh the \
full combination of evidence rather than any single field.

IMPORTANT: "confidence" always means how likely it is that these two records \
are the SAME PERSON — it is NOT how confident you are in your own verdict. \
A pair you're sure are two different people should get a LOW confidence \
(close to 0.0), not a high one. A pair you're sure are the same person \
should get a HIGH confidence (close to 1.0). Reserve the middle of the \
range (roughly 0.3-0.7) for cases where the evidence is genuinely mixed.

Respond with ONLY a JSON object, no markdown fences, in this exact shape:
{{
  "matched": <true|false>,
  "confidence": <float 0.0-1.0, the probability these are the same person — NOT your confidence in the verdict>,
  "reasoning": "<2-4 sentences in plain language explaining the decision, citing the specific fields that agree or disagree>"
}}
"""


def resolve_entities(carrier_a, record_a, carrier_b, record_b) -> dict:
    prompt = PROMPT_TEMPLATE.format(
        carrier_a=carrier_a, record_a=record_a,
        carrier_b=carrier_b, record_b=record_b,
    )
    return call_json(prompt)
