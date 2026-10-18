"""Small domain value objects shared by ports and adapters."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.domain.entities import SentimentLabel, Theme


class QuestionDraft(BaseModel):
    """A question as produced by an interviewer agent, before persistence."""

    text: str = Field(min_length=1)
    intent: str = ""


class SummarySentimentDraft(BaseModel):
    label: SentimentLabel = SentimentLabel.NEUTRAL
    score: float = Field(default=0.0, ge=-1.0, le=1.0)
    explanation: str = ""


class SummaryDraft(BaseModel):
    """A summary as produced by an interviewer agent, before persistence."""

    overview: str = Field(min_length=1)
    themes: list[Theme] = Field(default_factory=list)
    sentiment: SummarySentimentDraft = Field(default_factory=SummarySentimentDraft)
    key_points: list[str] = Field(default_factory=list)
    notable_quote: str | None = None


class AgentInfo(BaseModel):
    """Everything the UI needs to explain which model is answering."""

    provider: str
    label: str
    model: str
    ready: bool = True
    demo: bool = False
    local: bool = False
    detail: str = ""
