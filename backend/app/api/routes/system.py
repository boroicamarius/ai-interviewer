"""System routes: health and UI metadata."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app import __version__
from app.api.dependencies import get_app_settings, get_service
from app.application.interview_service import InterviewService
from app.core.config import Settings
from app.core.personas import persona_list
from app.schemas.interview import (
    HealthResponse,
    MetaLimits,
    MetaResponse,
    PersonaView,
)

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Liveness and provider status")
async def health(
    service: InterviewService = Depends(get_service),
    settings: Settings = Depends(get_app_settings),
) -> HealthResponse:
    info = service.agent_info
    return HealthResponse(
        status="ok" if info.ready else "degraded",
        version=__version__,
        environment=settings.app_env,
        provider_ready=info.ready,
        provider=info.provider,
        model=info.model,
        storage_backend=settings.storage_backend,
    )


@router.get("/meta", response_model=MetaResponse, summary="Configuration for the web client")
async def meta(
    service: InterviewService = Depends(get_service),
    settings: Settings = Depends(get_app_settings),
) -> MetaResponse:
    policy = service.policy
    return MetaResponse(
        app_name=settings.app_name,
        version=__version__,
        environment=settings.app_env,
        provider=service.agent_info,
        limits=MetaLimits(
            min_questions=policy.min_questions,
            max_questions=policy.max_questions,
            default_questions=policy.default_questions,
            max_answer_chars=policy.max_answer_chars,
            max_context_chars=policy.context_max_chars,
            topic_max_chars=policy.topic_max_chars,
        ),
        personas=[PersonaView(**persona) for persona in persona_list()],
        suggested_topics=settings.suggested_topics,
        default_persona=policy.default_persona,
        analysis_enabled=settings.analysis_enabled,
    )
