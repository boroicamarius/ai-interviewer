"""HTTP request/response schemas (the API's public contract)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.entities import (
    InterviewAnalysis,
    InterviewStatus,
    InterviewSummary,
)
from app.domain.values import AgentInfo


class StartInterviewRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=300, examples=["AI in the workplace"])
    context: str | None = Field(
        default=None,
        max_length=1000,
        examples=["I'm a product designer at a small startup."],
    )
    question_count: int | None = Field(default=None, ge=1, le=10)
    persona: str | None = Field(default=None, examples=["curious-researcher"])


class SubmitAnswerRequest(BaseModel):
    question_id: str = Field(min_length=1, max_length=64)
    answer: str = Field(min_length=1, max_length=10000)


class PersonaView(BaseModel):
    id: str
    name: str
    description: str


class QuestionView(BaseModel):
    id: str
    index: int
    text: str
    intent: str
    answer: str | None = None
    answered_at: datetime | None = None


class ProgressView(BaseModel):
    answered: int
    total: int
    percent: int


class InterviewResponse(BaseModel):
    id: str
    topic: str
    context: str | None
    persona: PersonaView
    language: str
    status: InterviewStatus
    questions: list[QuestionView]
    progress: ProgressView
    summary: InterviewSummary | None = None
    analysis: InterviewAnalysis | None = None
    provider: str
    model: str
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class InterviewListItem(BaseModel):
    id: str
    topic: str
    status: InterviewStatus
    persona: PersonaView
    question_count: int
    answered_count: int
    sentiment_label: str | None = None
    summary_preview: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class InterviewListResponse(BaseModel):
    items: list[InterviewListItem]
    total: int
    limit: int
    offset: int


class MetaLimits(BaseModel):
    min_questions: int
    max_questions: int
    default_questions: int
    max_answer_chars: int
    max_context_chars: int
    topic_max_chars: int


class MetaResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    provider: AgentInfo
    limits: MetaLimits
    personas: list[PersonaView]
    suggested_topics: list[str]
    default_persona: str
    analysis_enabled: bool


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    provider_ready: bool
    provider: str
    model: str
    storage_backend: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
