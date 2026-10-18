"""Application settings.

Everything that can reasonably vary between environments lives here and is
read from environment variables (and an optional ``.env`` file).  The module
also contains the small number of derived values the rest of the app needs.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Running from ``backend/`` (local development) reads the repository-level
# .env first; running inside Docker relies on compose's env_file instead.
_ENV_FILES = (".env", "../.env", "../../.env")


class Settings(BaseSettings):
    """Flat, environment-driven configuration.

    Grouped by concern with comments for readability.  Flat fields keep the
    variable names identical to what operators see in ``.env.example``.
    """

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------ app
    app_name: str = "AI Interviewer"
    app_env: Literal["development", "production", "test"] = "development"
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ------------------------------------------------------------ interview
    interview_min_questions: int = 3
    interview_max_questions: int = 5
    interview_default_questions: int = 4
    interview_min_answer_chars: int = 2
    interview_max_answer_chars: int = 4000
    interview_topic_max_chars: int = 160
    interview_context_max_chars: int = 300
    interview_language: str = "English"
    interview_default_persona: str = "curious-researcher"
    interview_suggested_topics: str = (
        "AI in the workplace|productivity tools|scientific research|"
        "the future of education|remote work"
    )

    # ------------------------------------------------------------------ llm
    llm_provider: str = "mock"
    llm_model: str = ""
    llm_api_key: SecretStr | None = None
    llm_base_url: str = ""
    llm_temperature: float = 0.6
    llm_max_tokens: int = 1200
    llm_timeout_seconds: float = 60.0
    llm_max_retries: int = 2
    llm_json_attempts: int = 2
    llm_json_mode: bool = False

    # -------------------------------------------------------------- storage
    storage_backend: Literal["json", "memory"] = "json"
    data_dir: Path = Path("./data")

    # ------------------------------------------------------------- analysis
    analysis_enabled: bool = True
    analysis_keywords_top_n: int = 8

    @model_validator(mode="after")
    def _validate_ranges(self) -> "Settings":
        if self.interview_min_questions < 1:
            raise ValueError("INTERVIEW_MIN_QUESTIONS must be at least 1")
        if self.interview_max_questions < self.interview_min_questions:
            raise ValueError("INTERVIEW_MAX_QUESTIONS must be >= INTERVIEW_MIN_QUESTIONS")
        if not (
            self.interview_min_questions
            <= self.interview_default_questions
            <= self.interview_max_questions
        ):
            raise ValueError("INTERVIEW_DEFAULT_QUESTIONS must be within the min/max range")
        if self.interview_min_answer_chars < 1:
            raise ValueError("INTERVIEW_MIN_ANSWER_CHARS must be at least 1")
        if self.interview_max_answer_chars < self.interview_min_answer_chars:
            raise ValueError("INTERVIEW_MAX_ANSWER_CHARS must be >= the minimum")
        if not 0 <= self.llm_temperature <= 2:
            raise ValueError("LLM_TEMPERATURE must be between 0 and 2")
        if not 1 <= self.llm_json_attempts <= 4:
            raise ValueError("LLM_JSON_ATTEMPTS must be between 1 and 4")
        return self

    # ------------------------------------------------------------ derived
    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def suggested_topics(self) -> list[str]:
        return [topic.strip() for topic in self.interview_suggested_topics.split("|") if topic.strip()]

    @property
    def data_path(self) -> Path:
        return Path(self.data_dir).expanduser().resolve()

    @property
    def llm_api_key_value(self) -> str | None:
        if self.llm_api_key is None:
            return None
        value = self.llm_api_key.get_secret_value().strip()
        return value or None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings accessor used by the production app factory."""

    return Settings()
