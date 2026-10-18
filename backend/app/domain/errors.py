"""Domain-level errors.

The API layer translates these into HTTP responses; the domain and
application layers never import FastAPI.
"""

from __future__ import annotations

from typing import Any


class DomainError(Exception):
    """Base class for expected, user-facing failures."""

    code = "domain_error"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class InvalidRequestError(DomainError):
    code = "invalid_request"


class NotFoundError(DomainError):
    code = "not_found"


class ConflictError(DomainError):
    code = "conflict"


class InterviewNotFound(NotFoundError):
    code = "interview_not_found"


class InterviewAlreadyCompleted(ConflictError):
    code = "interview_completed"


class IncompleteInterview(ConflictError):
    code = "interview_incomplete"


class QuestionNotFound(NotFoundError):
    code = "question_not_found"


class InvalidAnswer(InvalidRequestError):
    code = "invalid_answer"


class AnswerTooLong(InvalidAnswer):
    code = "answer_too_long"


class LLMError(DomainError):
    code = "llm_error"


class LLMConfigurationError(LLMError):
    code = "llm_not_configured"


class LLMResponseError(LLMError):
    code = "llm_invalid_response"
