"""LangChain-backed implementation of the interviewer agent."""

from __future__ import annotations

import json
import logging
from typing import TypeVar

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

from app.application.prompts import InterviewPromptBuilder, PromptPair
from app.domain.entities import Interview, SentimentLabel, Theme
from app.domain.errors import LLMResponseError
from app.domain.values import AgentInfo, QuestionDraft, SummaryDraft, SummarySentimentDraft
from app.infrastructure.llm.chat_client import ChatCompletionClient
from app.infrastructure.llm.outputs import QuestionPlanOutput, SummaryOutput
from app.infrastructure.llm.parsing import JsonExtractionError, clean_quote, extract_json_payload

logger = logging.getLogger(__name__)

SchemaT = TypeVar("SchemaT", bound=BaseModel)

_REPAIR_INSTRUCTION = """Your previous response could not be interpreted as valid JSON for the required schema.

Validation error: {error}

Return ONLY the corrected JSON object. No markdown fences, no explanation, no extra keys."""


class LangChainInterviewerAgent:
    """Turns the prompt builder's messages into typed, grounded objects."""

    def __init__(
        self,
        *,
        client: ChatCompletionClient,
        prompts: InterviewPromptBuilder,
        info: AgentInfo,
        json_attempts: int = 2,
    ) -> None:
        self._client = client
        self._prompts = prompts
        self._info = info
        self._json_attempts = max(1, json_attempts)

    @property
    def info(self) -> AgentInfo:
        return self._info

    async def plan_questions(
        self,
        *,
        topic: str,
        context: str | None,
        persona: str,
        persona_prompt: str,
        count: int,
        language: str,
    ) -> list[QuestionDraft]:
        from app.core.personas import get_persona

        persona_obj = get_persona(persona)
        prompt = self._prompts.question_plan(
            topic=topic,
            context=context,
            persona_name=persona_obj.name,
            persona_prompt=persona_prompt,
            count=count,
            language=language,
        )
        output = await self._ask(
            prompt,
            QuestionPlanOutput,
            wrap_list_key="questions",
        )
        return [
            QuestionDraft(text=" ".join(item.text.split()), intent=" ".join(item.intent.split()))
            for item in output.questions
            if item.text.strip()
        ]

    async def summarize(self, *, interview: Interview) -> SummaryDraft:
        prompt = self._prompts.summary(interview=interview)
        output = await self._ask(prompt, SummaryOutput)
        transcript = "\n".join(answer.text for answer in interview.answers)

        themes: list[Theme] = []
        for theme in output.themes[:4]:
            title = " ".join(theme.title.split())
            insight = " ".join(theme.insight.split())
            if not title or not insight:
                continue
            themes.append(
                Theme(
                    title=title[:100],
                    insight=insight,
                    quote=clean_quote(theme.quote, transcript),
                )
            )

        key_points = [" ".join(point.split()) for point in output.key_points if point.strip()][:5]

        try:
            label = SentimentLabel(str(output.sentiment.label).strip().lower())
        except ValueError:
            label = SentimentLabel.NEUTRAL
        try:
            score = max(-1.0, min(1.0, float(output.sentiment.score)))
        except (TypeError, ValueError):
            score = 0.0

        return SummaryDraft(
            overview=" ".join(output.overview.split()),
            themes=themes,
            sentiment=SummarySentimentDraft(
                label=label,
                score=score,
                explanation=" ".join(output.sentiment.explanation.split()),
            ),
            key_points=key_points,
            notable_quote=clean_quote(output.notable_quote, transcript),
        )

    async def _ask(
        self,
        prompt: PromptPair,
        schema: type[SchemaT],
        *,
        wrap_list_key: str | None = None,
    ) -> SchemaT:
        messages: list[BaseMessage] = [
            SystemMessage(content=prompt.system),
            HumanMessage(content=prompt.user),
        ]
        last_error = "unknown validation error"

        for attempt in range(1, self._json_attempts + 1):
            raw = await self._client.complete(messages)
            try:
                payload = extract_json_payload(raw)
                if wrap_list_key and isinstance(payload, list):
                    payload = {wrap_list_key: payload}
                return schema.model_validate(payload)
            except (JsonExtractionError, ValueError) as exc:
                last_error = _short_error(exc)
                logger.warning(
                    "Structured LLM response rejected (attempt %s/%s): %s",
                    attempt,
                    self._json_attempts,
                    last_error,
                )
                if attempt < self._json_attempts:
                    messages.extend(
                        [
                            AIMessage(content=raw),
                            HumanMessage(
                                content=_REPAIR_INSTRUCTION.format(error=last_error)
                            ),
                        ]
                    )

        raise LLMResponseError(
            "The language model returned a response we could not interpret. Please try again.",
            details={"provider": self._info.provider, "attempts": self._json_attempts},
        )


def _short_error(exc: Exception) -> str:
    if isinstance(exc, json.JSONDecodeError):
        return f"invalid JSON at line {exc.lineno}: {exc.msg}"
    message = str(exc)
    return message[:300] if message else exc.__class__.__name__
