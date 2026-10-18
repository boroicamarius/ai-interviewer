"""Interview policy: configuration translated into application rules."""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.errors import InvalidRequestError


@dataclass(frozen=True, slots=True)
class InterviewPolicy:
    min_questions: int
    max_questions: int
    default_questions: int
    min_answer_chars: int
    max_answer_chars: int
    topic_max_chars: int
    context_max_chars: int
    language: str
    default_persona: str

    def resolve_question_count(self, requested: int | None) -> int:
        count = self.default_questions if requested is None else requested
        if not self.min_questions <= count <= self.max_questions:
            raise InvalidRequestError(
                f"Choose between {self.min_questions} and {self.max_questions} questions.",
                details={
                    "min_questions": self.min_questions,
                    "max_questions": self.max_questions,
                },
            )
        return count

    def clean_topic(self, topic: str) -> str:
        cleaned = " ".join(topic.split())
        if len(cleaned) < 3:
            raise InvalidRequestError("Please choose a topic with at least 3 characters.")
        if len(cleaned) > self.topic_max_chars:
            raise InvalidRequestError(
                f"Topics are limited to {self.topic_max_chars} characters.",
                details={"max_chars": self.topic_max_chars},
            )
        return cleaned

    def clean_context(self, context: str | None) -> str | None:
        if context is None:
            return None
        cleaned = " ".join(context.split())
        if not cleaned:
            return None
        if len(cleaned) > self.context_max_chars:
            raise InvalidRequestError(
                f"Context is limited to {self.context_max_chars} characters.",
                details={"max_chars": self.context_max_chars},
            )
        return cleaned
