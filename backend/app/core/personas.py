"""Interviewer personas.

A persona changes how the interviewer sounds, never what a good question is.
Keeping the catalogue in one place means the prompt, the API metadata and the
frontend all describe the same thing.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.errors import InvalidRequestError


@dataclass(frozen=True, slots=True)
class Persona:
    id: str
    name: str
    description: str
    prompt: str

    def as_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


PERSONAS: dict[str, Persona] = {
    "curious-researcher": Persona(
        id="curious-researcher",
        name="Curious researcher",
        description="Warm, neutral and genuinely curious. Draws out lived experience.",
        prompt=(
            "Sound warm, unhurried and neutral. Be genuinely curious about specifics; "
            "use plain language and avoid research jargon."
        ),
    ),
    "friendly-peer": Persona(
        id="friendly-peer",
        name="Friendly peer",
        description="Relaxed and conversational, like a thoughtful colleague over coffee.",
        prompt=(
            "Sound like a thoughtful colleague over coffee: relaxed, empathetic and "
            "conversational. Contractions and natural phrasing are welcome."
        ),
    ),
    "sharp-analyst": Persona(
        id="sharp-analyst",
        name="Sharp analyst",
        description="Crisp and direct. Probes assumptions, trade-offs and edge cases.",
        prompt=(
            "Sound crisp, direct and analytical. Gently probe assumptions, trade-offs "
            "and edge cases, without ever becoming confrontational."
        ),
    ),
}


def get_persona(persona_id: str | None) -> Persona:
    """Return a persona or raise a 400-mapped domain error."""

    if not persona_id:
        return PERSONAS["curious-researcher"]
    try:
        return PERSONAS[persona_id]
    except KeyError as exc:
        valid = ", ".join(PERSONAS)
        raise InvalidRequestError(
            f"Unknown persona '{persona_id}'. Choose one of: {valid}.",
            details={"personas": list(PERSONAS)},
        ) from exc


def persona_list() -> list[dict[str, str]]:
    return [persona.as_dict() for persona in PERSONAS.values()]
