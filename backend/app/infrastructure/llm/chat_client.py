"""The ChatOpenAI-backed chat-completion client."""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Protocol

from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI

from app.domain.errors import LLMError
from app.infrastructure.llm.presets import ProviderConfig

logger = logging.getLogger(__name__)


class ChatCompletionClient(Protocol):
    async def complete(self, messages: Sequence[BaseMessage]) -> str: ...


class LangChainChatClient:
    """Thin wrapper around LangChain's ``ChatOpenAI``.

    ``ChatOpenAI`` is the common denominator for OpenAI, OpenRouter, Groq,
    DeepSeek, Together, Ollama, LM Studio, vLLM and most self-hosted servers.
    """

    def __init__(
        self,
        config: ProviderConfig,
        *,
        temperature: float,
        max_tokens: int,
        timeout_seconds: float,
        max_retries: int,
        json_mode: bool,
    ) -> None:
        self._config = config
        kwargs: dict[str, object] = {
            "model": config.model,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timeout": timeout_seconds,
            "max_retries": max_retries,
            "api_key": config.api_key or "not-needed",
        }
        if config.base_url:
            kwargs["base_url"] = config.base_url
        if json_mode:
            kwargs["model_kwargs"] = {"response_format": {"type": "json_object"}}

        self._model = ChatOpenAI(**kwargs)

    async def complete(self, messages: Sequence[BaseMessage]) -> str:
        try:
            response = await self._model.ainvoke(list(messages))
        except Exception as exc:  # noqa: BLE001 - provider errors vary wildly
            logger.exception("Chat completion failed for provider %s", self._config.key)
            raise LLMError(
                "The language model request failed. Check the provider settings in .env "
                "and try again.",
                details={"provider": self._config.key},
            ) from exc
        return _message_text(response.content)


def _message_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "".join(parts)
    return str(content or "")
