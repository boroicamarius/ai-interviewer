"""JSON-file interview repository.

One human-readable file per interview under ``DATA_DIR/interviews``.  Writes are
atomic (temp file + ``os.replace``) and file I/O is pushed off the event loop.
This is intentionally a simple format for a small tool; the repository port
makes a database adapter a drop-in replacement later.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from pathlib import Path

from pydantic import ValidationError

from app.domain.entities import Interview
from app.domain.ports import InterviewRepository

logger = logging.getLogger(__name__)

_ID_RE = re.compile(r"^[0-9a-f]{32}$")


class JsonInterviewRepository:
    def __init__(self, data_dir: Path) -> None:
        self._directory = Path(data_dir) / "interviews"
        self._directory.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    @property
    def directory(self) -> Path:
        return self._directory

    async def save(self, interview: Interview) -> None:
        async with self._lock:
            await asyncio.to_thread(self._write, interview)

    async def get(self, interview_id: str) -> Interview | None:
        path = self._path(interview_id)
        if path is None:
            return None
        return await asyncio.to_thread(self._read, path)

    async def list(self, *, limit: int, offset: int) -> tuple[list[Interview], int]:
        async with self._lock:
            interviews = await asyncio.to_thread(self._read_all)
        interviews.sort(key=lambda item: item.created_at, reverse=True)
        return interviews[offset : offset + limit], len(interviews)

    async def delete(self, interview_id: str) -> bool:
        path = self._path(interview_id)
        if path is None:
            return False
        async with self._lock:
            return await asyncio.to_thread(self._delete, path)

    # ------------------------------------------------------------- internals
    def _path(self, interview_id: str) -> Path | None:
        if not _ID_RE.fullmatch(interview_id):
            return None
        return self._directory / f"{interview_id}.json"

    def _write(self, interview: Interview) -> None:
        path = self._path(interview.id)
        if path is None:  # pragma: no cover - IDs are generated internally
            raise ValueError("Invalid interview id")
        temporary = path.with_suffix(".json.tmp")
        temporary.write_text(interview.model_dump_json(indent=2), encoding="utf-8")
        os.replace(temporary, path)

    def _read(self, path: Path) -> Interview | None:
        if not path.exists():
            return None
        try:
            return Interview.model_validate_json(path.read_text(encoding="utf-8"))
        except (ValidationError, OSError):
            logger.exception("Could not read interview file %s", path.name)
            return None

    def _read_all(self) -> list[Interview]:
        interviews: list[Interview] = []
        for path in self._directory.glob("*.json"):
            interview = self._read(path)
            if interview is not None:
                interviews.append(interview)
        return interviews

    def _delete(self, path: Path) -> bool:
        if not path.exists():
            return False
        path.unlink()
        return True
