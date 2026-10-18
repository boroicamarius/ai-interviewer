"""Interview domain model.

These objects are deliberately free of FastAPI, LangChain and storage
concerns.  They own the rules that make an interview an interview: a question
plan, one answer per question, and a summary at the end.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Self
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.domain.errors import (
    AnswerTooLong,
    IncompleteInterview,
    InterviewAlreadyCompleted,
    InvalidAnswer,
    QuestionNotFound,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InterviewStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


class Question(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    index: int = Field(ge=0)
    text: str
    intent: str = ""


class Answer(BaseModel):
    question_id: str
    text: str
    answered_at: datetime = Field(default_factory=utcnow)


class Theme(BaseModel):
    title: str
    insight: str
    quote: str | None = None


class SummarySentiment(BaseModel):
    label: SentimentLabel = SentimentLabel.NEUTRAL
    score: float = Field(default=0.0, ge=-1.0, le=1.0)
    explanation: str = ""


class InterviewSummary(BaseModel):
    overview: str
    themes: list[Theme] = Field(default_factory=list)
    sentiment: SummarySentiment = Field(default_factory=SummarySentiment)
    key_points: list[str] = Field(default_factory=list)
    notable_quote: str | None = None
    generated_at: datetime = Field(default_factory=utcnow)


class AnswerSentiment(BaseModel):
    question_id: str
    label: SentimentLabel
    score: float = Field(ge=-1.0, le=1.0)


class Keyword(BaseModel):
    term: str
    count: int = Field(ge=1)
    weight: float = Field(ge=0)


class TextStats(BaseModel):
    answer_count: int = Field(ge=0)
    word_count: int = Field(ge=0)
    average_answer_words: float = Field(ge=0)
    duration_seconds: int = Field(ge=0)


class InterviewAnalysis(BaseModel):
    sentiment: SummarySentiment
    answer_sentiments: list[AnswerSentiment] = Field(default_factory=list)
    keywords: list[Keyword] = Field(default_factory=list)
    stats: TextStats


class Interview(BaseModel):
    """Aggregate root for a single interview."""

    model_config = ConfigDict(validate_assignment=True)

    id: str = Field(default_factory=lambda: uuid4().hex)
    topic: str
    context: str | None = None
    persona: str = "curious-researcher"
    language: str = "English"
    status: InterviewStatus = InterviewStatus.IN_PROGRESS
    questions: list[Question] = Field(default_factory=list)
    answers: list[Answer] = Field(default_factory=list)
    summary: InterviewSummary | None = None
    analysis: InterviewAnalysis | None = None
    provider: str = ""
    model: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
    completed_at: datetime | None = None

    # ------------------------------------------------------------- helpers
    @property
    def answered_count(self) -> int:
        return len({answer.question_id for answer in self.answers})

    @property
    def total_questions(self) -> int:
        return len(self.questions)

    @property
    def is_ready_to_complete(self) -> bool:
        return (
            self.status is InterviewStatus.IN_PROGRESS
            and self.total_questions > 0
            and self.answered_count >= self.total_questions
        )

    @property
    def next_question(self) -> Question | None:
        answered = {answer.question_id for answer in self.answers}
        return next((question for question in self.questions if question.id not in answered), None)

    def question_by_id(self, question_id: str) -> Question:
        for question in self.questions:
            if question.id == question_id:
                return question
        raise QuestionNotFound(f"Question '{question_id}' does not belong to this interview.")

    def answer_for(self, question_id: str) -> Answer | None:
        return next(
            (answer for answer in self.answers if answer.question_id == question_id),
            None,
        )

    # -------------------------------------------------------------- actions
    def record_answer(
        self,
        question_id: str,
        text: str,
        *,
        min_chars: int = 2,
        max_chars: int = 4000,
    ) -> Answer:
        if self.status is InterviewStatus.COMPLETED:
            raise InterviewAlreadyCompleted("This interview is already complete.")

        question = self.question_by_id(question_id)
        cleaned = text.strip()
        if len(cleaned) < min_chars:
            raise InvalidAnswer(
                f"Please write at least {min_chars} characters.",
                details={"min_chars": min_chars},
            )
        if len(cleaned) > max_chars:
            raise AnswerTooLong(
                f"Answers are limited to {max_chars} characters.",
                details={"max_chars": max_chars},
            )

        answer = Answer(question_id=question.id, text=cleaned)
        for index, existing in enumerate(self.answers):
            if existing.question_id == question_id:
                self.answers[index] = answer
                break
        else:
            self.answers.append(answer)

        self.updated_at = utcnow()
        return answer

    def complete(self, summary: InterviewSummary, analysis: InterviewAnalysis | None) -> Self:
        if self.status is InterviewStatus.COMPLETED:
            raise InterviewAlreadyCompleted("This interview is already complete.")
        if not self.is_ready_to_complete:
            remaining = self.total_questions - self.answered_count
            raise IncompleteInterview(
                f"{remaining} question(s) still need an answer before the summary.",
                details={"remaining": remaining},
            )

        now = utcnow()
        self.summary = summary
        self.analysis = analysis
        self.status = InterviewStatus.COMPLETED
        self.completed_at = now
        self.updated_at = now
        return self
