"""Pydantic schemas describing what the LLM must return.

They are intentionally forgiving (extra keys ignored, numeric coercion) and
validated again by the application service.  The JSON contract in the prompt
still asks for these exact shapes.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class QuestionOutput(BaseModel):
    text: str
    intent: str = ""


class QuestionPlanOutput(BaseModel):
    questions: list[QuestionOutput] = Field(default_factory=list)


class ThemeOutput(BaseModel):
    title: str
    insight: str
    quote: str | None = None


class SentimentOutput(BaseModel):
    label: str = "neutral"
    score: float = 0.0
    explanation: str = ""

    @field_validator("label", mode="before")
    @classmethod
    def _lower_label(cls, value: object) -> str:
        return str(value or "neutral").strip().lower()


class SummaryOutput(BaseModel):
    overview: str
    themes: list[ThemeOutput] = Field(default_factory=list)
    sentiment: SentimentOutput = Field(default_factory=SentimentOutput)
    key_points: list[str] = Field(default_factory=list)
    notable_quote: str | None = None
