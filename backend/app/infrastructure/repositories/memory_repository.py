"""In-memory repository used by tests and ``STORAGE_BACKEND=memory``."""

from __future__ import annotations

import asyncio

from app.domain.entities import Interview


class InMemoryInterviewRepository:
    def __init__(self) -> None:
        self._interviews: dict[str, Interview] = {}
        self._lock = asyncio.Lock()

    async def save(self, interview: Interview) -> None:
        async with self._lock:
            self._interviews[interview.id] = interview.model_copy(deep=True)

    async def get(self, interview_id: str) -> Interview | None:
        async with self._lock:
            interview = self._interviews.get(interview_id)
            return interview.model_copy(deep=True) if interview else None

    async def list(self, *, limit: int, offset: int) -> tuple[list[Interview], int]:
        async with self._lock:
            interviews = sorted(
                self._interviews.values(),
                key=lambda item: item.created_at,
                reverse=True,
            )
            return (
                [item.model_copy(deep=True) for item in interviews[offset : offset + limit]],
                len(interviews),
            )

    async def delete(self, interview_id: str) -> bool:
        async with self._lock:
            return self._interviews.pop(interview_id, None) is not None
