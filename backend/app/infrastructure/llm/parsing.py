"""Robust JSON extraction and quote grounding helpers."""

from __future__ import annotations

import json
import re
from typing import Any

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)


class JsonExtractionError(ValueError):
    """Raised when a model response contains no parseable JSON object."""


def extract_json_payload(text: str) -> Any:
    """Best-effort extraction of the first JSON value in an LLM response.

    Handles fenced blocks, small talk before/after the object, and JSON arrays.
    """

    if not text or not text.strip():
        raise JsonExtractionError("The model returned an empty response.")

    cleaned = text.strip()

    fenced = _FENCE_RE.search(cleaned)
    candidates = [fenced.group(1).strip()] if fenced else []
    candidates.append(cleaned)

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            pass

        decoder = json.JSONDecoder()
        for match in re.finditer(r"[\[{]", candidate):
            try:
                payload, _ = decoder.raw_decode(candidate[match.start() :])
                return payload
            except json.JSONDecodeError:
                continue

    raise JsonExtractionError("No valid JSON value found in the model response.")


def normalise_text(text: str) -> str:
    return " ".join(text.split()).strip().casefold()


def clean_quote(quote: str | None, transcript: str) -> str | None:
    """Return a verbatim quote only if it really occurs in the transcript."""

    if not quote:
        return None
    candidate = " ".join(quote.split()).strip().strip('"“”\'').strip()
    if not candidate:
        return None
    if normalise_text(candidate) in normalise_text(transcript):
        return candidate
    return None
