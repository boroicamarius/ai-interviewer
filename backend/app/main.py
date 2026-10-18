"""Application factory and HTTP wiring."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app import __version__
from app.api.errors import install_error_handlers
from app.api.routes import interviews, system
from app.application.interview_service import InterviewService
from app.application.policy import InterviewPolicy
from app.core.config import Settings, get_settings
from app.infrastructure.analysis.factory import build_analyzer
from app.infrastructure.llm.factory import build_interviewer_agent
from app.infrastructure.repositories.factory import build_repository

logger = logging.getLogger(__name__)

DESCRIPTION = """
A small, layered service for running short AI-powered interviews.

Start an interview, answer 3–5 questions, and receive a grounded summary of
themes, sentiment and key points. Transcripts are stored as readable JSON.

* **Demo mode** works with no API key (`LLM_PROVIDER=mock`).
* **Real models** use any OpenAI-compatible endpoint through `ChatOpenAI`.
"""


def configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s  %(levelname)-7s %(name)s: %(message)s",
    )
    for noisy in ("httpx", "httpcore", "openai", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    policy = InterviewPolicy(
        min_questions=settings.interview_min_questions,
        max_questions=settings.interview_max_questions,
        default_questions=settings.interview_default_questions,
        min_answer_chars=settings.interview_min_answer_chars,
        max_answer_chars=settings.interview_max_answer_chars,
        topic_max_chars=settings.interview_topic_max_chars,
        context_max_chars=settings.interview_context_max_chars,
        language=settings.interview_language,
        default_persona=settings.interview_default_persona,
    )
    repository = build_repository(settings)
    agent = build_interviewer_agent(settings)
    analyzer = build_analyzer(settings)
    service = InterviewService(
        repository=repository,
        agent=agent,
        analyzer=analyzer,
        policy=policy,
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        info = service.agent_info
        logger.info(
            "%s v%s starting (env=%s, provider=%s/%s, storage=%s)",
            settings.app_name,
            __version__,
            settings.app_env,
            info.provider,
            info.model or "n/a",
            settings.storage_backend,
        )
        if not info.ready:
            logger.warning("LLM provider is not ready: %s", info.detail)
        yield
        logger.info("%s shutting down", settings.app_name)

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=DESCRIPTION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_tags=[
            {"name": "interviews", "description": "Create and run an interview."},
            {"name": "system", "description": "Health, metadata and configuration."},
        ],
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.service = service

    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    install_error_handlers(app)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid4().hex[:12]
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
        if request.url.path not in (f"{settings.api_prefix}/health",):
            logger.info(
                "%s %s %s -> %s (%.1f ms)",
                request_id,
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
        return response

    app.include_router(system.router, prefix=settings.api_prefix)
    app.include_router(interviews.router, prefix=settings.api_prefix)

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "version": __version__,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        }

    return app


# ASGI entry point for `uvicorn app.main:app`.
app = create_app()

