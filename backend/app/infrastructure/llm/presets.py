"""Provider catalogue and resolution.

Every remote provider here speaks the OpenAI chat-completions protocol, so the
same ``ChatOpenAI`` adapter works for hosted APIs and local servers.  Switching
providers is a two-line change in ``.env``.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.errors import LLMConfigurationError


@dataclass(frozen=True, slots=True)
class ProviderPreset:
    key: str
    label: str
    default_model: str
    base_url: str | None = None
    requires_api_key: bool = True
    local: bool = False
    demo: bool = False
    docs_url: str = ""


PRESETS: dict[str, ProviderPreset] = {
    "mock": ProviderPreset(
        key="mock",
        label="Built-in demo interviewer",
        default_model="ai-interviewer-demo",
        requires_api_key=False,
        demo=True,
    ),
    "openai": ProviderPreset(
        key="openai",
        label="OpenAI",
        default_model="gpt-4o-mini",
        docs_url="https://platform.openai.com/api-keys",
    ),
    "openrouter": ProviderPreset(
        key="openrouter",
        label="OpenRouter",
        default_model="openai/gpt-4o-mini",
        base_url="https://openrouter.ai/api/v1",
        docs_url="https://openrouter.ai/keys",
    ),
    "groq": ProviderPreset(
        key="groq",
        label="Groq",
        default_model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
        docs_url="https://console.groq.com/keys",
    ),
    "deepseek": ProviderPreset(
        key="deepseek",
        label="DeepSeek",
        default_model="deepseek-chat",
        base_url="https://api.deepseek.com/v1",
        docs_url="https://platform.deepseek.com/api_keys",
    ),
    "mistral": ProviderPreset(
        key="mistral",
        label="Mistral",
        default_model="mistral-small-latest",
        base_url="https://api.mistral.ai/v1",
        docs_url="https://console.mistral.ai/api-keys",
    ),
    "together": ProviderPreset(
        key="together",
        label="Together AI",
        default_model="meta-llama/Llama-3.3-70B-Instruct-Turbo",
        base_url="https://api.together.xyz/v1",
        docs_url="https://api.together.ai/settings/api-keys",
    ),
    "ollama": ProviderPreset(
        key="ollama",
        label="Ollama (local)",
        default_model="llama3.2",
        base_url="http://localhost:11434/v1",
        requires_api_key=False,
        local=True,
        docs_url="https://ollama.com",
    ),
    "lmstudio": ProviderPreset(
        key="lmstudio",
        label="LM Studio (local)",
        default_model="local-model",
        base_url="http://localhost:1234/v1",
        requires_api_key=False,
        local=True,
        docs_url="https://lmstudio.ai",
    ),
    "vllm": ProviderPreset(
        key="vllm",
        label="vLLM (local)",
        default_model="local-model",
        base_url="http://localhost:8000/v1",
        requires_api_key=False,
        local=True,
        docs_url="https://docs.vllm.ai",
    ),
    "custom": ProviderPreset(
        key="custom",
        label="Custom OpenAI-compatible endpoint",
        default_model="",
        base_url=None,
        requires_api_key=False,
        docs_url="",
    ),
}

ALIASES: dict[str, str] = {
    "openai-compatible": "custom",
    "openai_compatible": "custom",
    "lm-studio": "lmstudio",
    "lm_studio": "lmstudio",
    "local": "ollama",
    "demo": "mock",
}


@dataclass(frozen=True, slots=True)
class ProviderConfig:
    key: str
    label: str
    model: str
    base_url: str | None
    api_key: str | None
    local: bool
    demo: bool
    docs_url: str


def resolve_provider(
    *,
    provider: str,
    model: str,
    api_key: str | None,
    base_url: str,
) -> ProviderConfig:
    raw_key = (provider or "mock").strip().lower()
    key = ALIASES.get(raw_key, raw_key)
    preset = PRESETS.get(key)
    if preset is None:
        valid = ", ".join(sorted(PRESETS))
        raise LLMConfigurationError(
            f"Unknown LLM_PROVIDER '{provider}'. Choose one of: {valid}.",
            details={"providers": sorted(PRESETS)},
        )

    resolved_model = (model or preset.default_model).strip()
    resolved_base = (base_url or preset.base_url or "").strip() or None
    resolved_key = (api_key or "").strip() or None

    if not resolved_model:
        raise LLMConfigurationError(
            f"LLM_MODEL is required for provider '{key}'.",
            details={"provider": key},
        )
    if preset.requires_api_key and not resolved_key:
        raise LLMConfigurationError(
            f"LLM_API_KEY is required for provider '{key}'. "
            f"Create a key at {preset.docs_url or 'the provider dashboard'} or set "
            "LLM_PROVIDER=mock to try the app without a model.",
            details={"provider": key},
        )
    if not preset.demo and key == "custom" and not resolved_base:
        raise LLMConfigurationError(
            "LLM_BASE_URL is required when LLM_PROVIDER=custom.",
            details={"provider": key},
        )

    return ProviderConfig(
        key=preset.key,
        label=preset.label,
        model=resolved_model,
        base_url=resolved_base,
        api_key=resolved_key or ("not-needed" if not preset.requires_api_key else None),
        local=preset.local,
        demo=preset.demo,
        docs_url=preset.docs_url,
    )
