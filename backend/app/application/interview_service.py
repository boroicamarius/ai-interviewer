"""Interview use cases.

The service orchestrates the lifecycle and is unaware of HTTP, JSON files or
LangChain.  Its collaborators are injected through the ports in
``app.domain.ports``, which makes the whole flow testable with fakes.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.application.policy import InterviewPolicy
from app.core.personas import get_persona
from app.domain.entities import (
    Interview,
    InterviewStatus,
    InterviewSummary,
    Question,
    SummarySentiment,
    Theme,
)
from app.domain.errors import (
    IncompleteInterview,
    InterviewNotFound,
    LLMResponseError,
)
from app.domain.ports import InterviewerAgent, InterviewRepository, TextAnalyzer
from app.domain.values import AgentInfo, SummaryDraft

logger = logging.getLogger(__name__)


class InterviewService:
    """Coordinates interview creation, answering, completion and retrieval."""

    def __init__(
        self,
        *,
        repository: InterviewRepository,
        agent: InterviewerAgent,
        analyzer: TextAnalyzer | None,
        policy: InterviewPolicy,
    ) -> None:
        self._repository = repository
        self._agent = agent
        self._analyzer = analyzer
        self._policy = policy
        self._locks: dict[str, asyncio.Lock] = {}
        self._locks_guard = asyncio.Lock()

    @property
    def agent_info(self) -> AgentInfo:
        return self._agent.info

    @property
    def policy(self) -> InterviewPolicy:
        return self._policy

    async def create(
        self,
        *,
        topic: str,
        context: str | None,
        question_count: int | None,
        persona_id: str | None,
    ) -> Interview:
        clean_topic = self._policy.clean_topic(topic)
        clean_context = self._policy.clean_context(context)
        count = self._policy.resolve_question_count(question_count)
        persona = get_persona(persona_id or self._policy.default_persona)

        drafts = await self._agent.plan_questions(
            topic=clean_topic,
            context=clean_context,
            persona=persona.id,
            persona_prompt=persona.prompt,
            count=count,
            language=self._policy.language,
        )
        drafts = [draft for draft in drafts if draft.text.strip()][:count]
        if len(drafts) < self._policy.min_questions:
            raise LLMResponseError(
                "The interviewer could not produce a usable question plan. Please try again.",
                details={"questions_returned": len(drafts)},
            )

        info = self._agent.info
        questions = [
            Question(
                index=index,
                text=" ".join(draft.text.split()),
                intent=" ".join(draft.intent.split())[:200],
            )
            for index, draft in enumerate(drafts)
        ]
        interview = Interview(
            topic=clean_topic,
            context=clean_context,
            persona=persona.id,
            language=self._policy.language,
            questions=questions,
            provider=info.provider,
            model=info.model,
        )
        await self._repository.save(interview)
        logger.info(
            "Created interview %s (topic=%r, questions=%s, provider=%s)",
            interview.id,
            clean_topic,
            len(questions),
            info.provider,
        )
        return interview

    async def list(self, *, limit: int = 20, offset: int = 0) -> tuple[list[Interview], int]:
        return await self._repository.list(
            limit=max(1, min(limit, 100)),
            offset=max(0, offset),
        )

    async def get(self, interview_id: str) -> Interview:
        interview = await self._repository.get(interview_id)
        if interview is None:
            raise InterviewNotFound("That interview could not be found.")
        return interview

    async def answer(self, interview_id: str, *, question_id: str, text: str) -> Interview:
        async with self._lock_for(interview_id):
            interview = await self.get(interview_id)
            interview.record_answer(
                question_id,
                text,
                min_chars=self._policy.min_answer_chars,
                max_chars=self._policy.max_answer_chars,
            )
            await self._repository.save(interview)
            logger.info(
                "Saved answer for interview %s (%s/%s)",
                interview.id,
                interview.answered_count,
                interview.total_questions,
            )
            return interview

    async def complete(self, interview_id: str) -> Interview:
        async with self._lock_for(interview_id):
            interview = await self.get(interview_id)

            # Completing twice is harmless: return the stored result.
            if interview.status is InterviewStatus.COMPLETED and interview.summary is not None:
                return interview
            if not interview.is_ready_to_complete:
                remaining = interview.total_questions - interview.answered_count
                raise IncompleteInterview(
                    "Answer every question before generating the summary.",
                    details={"remaining": remaining},
                )

            draft = await self._agent.summarize(interview=interview)
            summary = self._build_summary(draft)
            analysis = self._analyzer.analyze(interview) if self._analyzer else None
            interview.complete(summary, analysis)
            await self._repository.save(interview)
            logger.info("Completed interview %s", interview.id)
            return interview

    async def delete(self, interview_id: str) -> None:
        async with self._lock_for(interview_id):
            deleted = await self._repository.delete(interview_id)
            if not deleted:
                raise InterviewNotFound("That interview could not be found.")
            logger.info("Deleted interview %s", interview_id)

    # ------------------------------------------------------------- internals
    def _build_summary(self, draft: SummaryDraft) -> InterviewSummary:
        overview = " ".join(draft.overview.split())
        if not overview:
            raise LLMResponseError("The summary came back empty. Please try again.")

        themes = [
            Theme(
                title=" ".join(theme.title.split())[:100],
                insight=" ".join(theme.insight.split()),
                quote=(" ".join(theme.quote.split()) if theme.quote else None),
            )
            for theme in draft.themes
            if theme.title.strip() and theme.insight.strip()
        ][:4]
        key_points = [" ".join(point.split()) for point in draft.key_points if point.strip()][:5]

        return InterviewSummary(
            overview=overview,
            themes=themes,
            sentiment=SummarySentiment(
                label=draft.sentiment.label,
                score=draft.sentiment.score,
                explanation=" ".join(draft.sentiment.explanation.split()),
            ),
            key_points=key_points,
            notable_quote=(" ".join(draft.notable_quote.split()) if draft.notable_quote else None),
        )

    @asynccontextmanager
    async def _lock_for(self, interview_id: str) -> AsyncIterator[None]:
        # Serialize mutations per interview so two tabs cannot interleave writes.
        async with self._locks_guard:
            lock = self._locks.setdefault(interview_id, asyncio.Lock())
        async with lock:
            yield
