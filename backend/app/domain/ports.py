"""Ports (the boundaries of the application core).

Adapters in ``app.infrastructure`` implement these interfaces; application
services depend only on the interfaces.  That is what keeps the LLM provider,
storage engine and analysis implementation swappable.
"""

from __future__ import annotations

from typing import Protocol

from app.domain.entities import Interview, InterviewAnalysis
from app.domain.values import AgentInfo, QuestionDraft, SummaryDraft


class InterviewRepository(Protocol):
    async def save(self, interview: Interview) -> None: ...

    async def get(self, interview_id: str) -> Interview | None: ...

    async def list(self, *, limit: int, offset: int) -> tuple[list[Interview], int]: ...

    async def delete(self, interview_id: str) -> bool: ...


class InterviewerAgent(Protocol):
    @property
    def info(self) -> AgentInfo: ...

    async def plan_questions(
        self,
        *,
        topic: str,
        context: str | None,
        persona: str,
        persona_prompt: str,
        count: int,
        language: str,
    ) -> list[QuestionDraft]: ...

    async def summarize(self, *, interview: Interview) -> SummaryDraft: ...


class TextAnalyzer(Protocol):
    def analyze(self, interview: Interview) -> InterviewAnalysis: ...
