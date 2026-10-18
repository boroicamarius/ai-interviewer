"""Repository factory."""

from __future__ import annotations

import logging

from app.core.config import Settings
from app.domain.ports import InterviewRepository
from app.infrastructure.repositories.json_repository import JsonInterviewRepository
from app.infrastructure.repositories.memory_repository import InMemoryInterviewRepository

logger = logging.getLogger(__name__)


def build_repository(settings: Settings) -> InterviewRepository:
    if settings.storage_backend == "memory":
        logger.info("Using in-memory interview storage (data will not persist).")
        return InMemoryInterviewRepository()

    repository = JsonInterviewRepository(settings.data_path)
    logger.info("Storing interviews in %s", repository.directory)
    return repository
