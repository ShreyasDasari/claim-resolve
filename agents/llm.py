"""
Shared LLM client and a small helper for getting structured JSON back from
the model. All agent reasoning calls in this project go through here.

Per PROJECT_BRIEF.md, Gemini (via langchain-google-genai) is the project's
chosen LLM. This module defaults to it. It also supports a Groq fallback
(LLM_PROVIDER=groq), used in practice when Gemini's Google AI Studio free
tier — a hard 20 requests/day cap per model on this project's API key — was
exhausted mid-build across every available Gemini variant. See the README
"Notes on deviations from the brief" section for the full explanation.
"""

import hashlib
import json
import os
import re

from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL_NAME = "gemini-2.5-flash-lite"
GROQ_MODEL_NAME = "llama-3.3-70b-versatile"

PROVIDER = os.environ.get("LLM_PROVIDER", "gemini")
MODEL_NAME = GROQ_MODEL_NAME if PROVIDER == "groq" else GEMINI_MODEL_NAME

# Disk cache for LLM calls, keyed by a hash of (model, prompt). The free
# tier's daily request quota is small, so re-running the pipeline while
# iterating on case data or prompts shouldn't re-spend it on calls that
# would return an identical result. Not used to fabricate output: every
# cached entry was produced by a real LLM call at some point.
CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", ".llm_cache.json")

_llm = None


def get_llm():
    global _llm
    if _llm is not None:
        return _llm

    if PROVIDER == "groq":
        from langchain_groq import ChatGroq

        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set but LLM_PROVIDER=groq.")
        _llm = ChatGroq(model=GROQ_MODEL_NAME, temperature=0, api_key=api_key)
        return _llm

    from langchain_google_genai import ChatGoogleGenerativeAI

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. Copy .env.example to .env and add "
            "a Google AI Studio API key before running the agent pipeline."
        )
    _llm = ChatGoogleGenerativeAI(model=GEMINI_MODEL_NAME, temperature=0, google_api_key=api_key)
    return _llm


def _load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH) as f:
            return json.load(f)
    return {}


def _save_cache(cache: dict) -> None:
    with open(CACHE_PATH, "w") as f:
        json.dump(cache, f, indent=2)


def _cache_key(prompt: str) -> str:
    return hashlib.sha256(f"{PROVIDER}:{MODEL_NAME}:{prompt}".encode()).hexdigest()


def call_json(prompt: str) -> dict:
    """Calls the configured LLM with `prompt` and parses the response as
    JSON, caching the result on disk so identical prompts don't re-spend
    API quota.

    Models sometimes wrap JSON output in markdown code fences even when
    asked not to — this strips those before parsing.
    """
    cache = _load_cache()
    key = _cache_key(prompt)
    if key in cache:
        return cache[key]

    response = get_llm().invoke(prompt)
    text = response.content.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    result = json.loads(text)

    cache[key] = result
    _save_cache(cache)
    return result
