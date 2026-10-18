"""Factory for the configured interviewer agent."""

from __future__ import annotations

import logging

from app.application.prompts import InterviewPromptBuilder
from app.core.config import Settings
from app.domain.errors import LLMConfigurationError
from app.domain.ports import InterviewerAgent
from app.domain.values import AgentInfo, QuestionDraft, SummaryDraft
from app.infrastructure.llm.agent import LangChainInterviewerAgent
from app.infrastructure.llm.chat_client import LangChainChatClient
from app.infrastructure.llm.mock_agent import MockInterviewerAgent
from app.infrastructure.llm.presets import ALIASES, PRESETS, resolve_provider

logger = logging.getLogger(__name__)


def _provider_identity(provider: str, model: str) -> tuple[str, str, str]:
    """Best-effort provider label/model even when configuration is incomplete."""

    raw_key = (provider or "unknown").strip().lower()
    key = ALIASES.get(raw_key, raw_key)
    preset = PRESETS.get(key)
    if preset is None:
        return raw_key, f"{raw_key} (not configured)", model.strip()
    return preset.key, preset.label, (model.strip() or preset.default_model)


def build_interviewer_agent(settings: Settings) -> InterviewerAgent:
    """Build the agent described by ``LLM_PROVIDER``.

    A misconfigured remote provider does not prevent the API from starting;
    instead a clearly-labelled unavailable agent is returned so ``/meta`` and
    ``/health`` can explain the problem while the UI stays usable.
    """

    try:
        config = resolve_provider(
            provider=settings.llm_provider,
            model=settings.llm_model,
            api_key=settings.llm_api_key_value,
            base_url=settings.llm_base_url,
        )
    except LLMConfigurationError as exc:
        logger.error("LLM configuration problem: %s", exc.message)
        provider_key, label, model = _provider_identity(
            settings.llm_provider, settings.llm_model
        )
        return UnavailableInterviewerAgent(
            provider=provider_key,
            label=label,
            model=model,
            reason=exc.message,
        )

    if config.demo:
        logger.info("Using the built-in demo interviewer (no LLM calls).")
        return MockInterviewerAgent()

    logger.info(
        "Using LLM provider=%s model=%s base_url=%s",
        config.key,
        config.model,
        config.base_url or "provider default",
    )
    try:
        client = LangChainChatClient(
            config,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            timeout_seconds=settings.llm_timeout_seconds,
            max_retries=settings.llm_max_retries,
            json_mode=settings.llm_json_mode,
        )
        info = AgentInfo(
            provider=config.key,
            label=config.label,
            model=config.model,
            ready=True,
            demo=False,
            local=config.local,
        )
        return LangChainInterviewerAgent(
            client=client,
            prompts=InterviewPromptBuilder(),
            info=info,
            json_attempts=settings.llm_json_attempts,
        )
    except LLMConfigurationError:
        raise
    except Exception as exc:  # noqa: BLE001 - surface dependency/config problems
        logger.exception("Could not initialize the LLM provider")
        return UnavailableInterviewerAgent(
            provider=config.key,
            label=config.label,
            model=config.model,
            reason=f"Could not initialize the language model client: {exc.__class__.__name__}.",
        )


class UnavailableInterviewerAgent:
    """A fail-closed agent that explains instead of crashing the app."""

    def __init__(self, *, provider: str, label: str, model: str, reason: str) -> None:
        self._info = AgentInfo(
            provider=provider,
            label=label,
            model=model,
            ready=False,
            demo=False,
            local=False,
            detail=reason,
        )

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
        del topic, context, persona, persona_prompt, count, language
        raise LLMConfigurationError(self._info.detail)

    async def summarize(self, *, interview) -> SummaryDraft:
        del interview
        raise LLMConfigurationError(self._info.detail)
