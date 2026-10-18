"""Interview lifecycle endpoints."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Query, Response, status

from app.api.dependencies import get_service
from app.api.presenters import present_interview, present_list_item
from app.application.interview_service import InterviewService
from app.schemas.interview import (
    InterviewListResponse,
    InterviewResponse,
    StartInterviewRequest,
    SubmitAnswerRequest,
)

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start an interview and generate its question plan",
)
async def start_interview(
    payload: StartInterviewRequest,
    service: InterviewService = Depends(get_service),
) -> InterviewResponse:
    interview = await service.create(
        topic=payload.topic,
        context=payload.context,
        question_count=payload.question_count,
        persona_id=payload.persona,
    )
    return present_interview(interview)


@router.get("", response_model=InterviewListResponse, summary="List recent interviews")
async def list_interviews(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: InterviewService = Depends(get_service),
) -> InterviewListResponse:
    interviews, total = await service.list(limit=limit, offset=offset)
    return InterviewListResponse(
        items=[present_list_item(interview) for interview in interviews],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{interview_id}", response_model=InterviewResponse, summary="Load an interview")
async def get_interview(
    interview_id: str,
    service: InterviewService = Depends(get_service),
) -> InterviewResponse:
    return present_interview(await service.get(interview_id))


@router.post(
    "/{interview_id}/answers",
    response_model=InterviewResponse,
    summary="Save an answer",
)
async def submit_answer(
    interview_id: str,
    payload: SubmitAnswerRequest,
    service: InterviewService = Depends(get_service),
) -> InterviewResponse:
    interview = await service.answer(
        interview_id,
        question_id=payload.question_id,
        text=payload.answer,
    )
    return present_interview(interview)


@router.post(
    "/{interview_id}/complete",
    response_model=InterviewResponse,
    summary="Generate the summary and complete the interview",
)
async def complete_interview(
    interview_id: str,
    service: InterviewService = Depends(get_service),
) -> InterviewResponse:
    return present_interview(await service.complete(interview_id))


@router.get(
    "/{interview_id}/export",
    summary="Download the stored transcript and summary as JSON",
    response_class=Response,
)
async def export_interview(
    interview_id: str,
    service: InterviewService = Depends(get_service),
) -> Response:
    interview = await service.get(interview_id)
    slug = re.sub(r"[^a-z0-9]+", "-", interview.topic.lower()).strip("-")[:40] or "interview"
    filename = f"ai-interviewer-{slug}-{interview.id[:8]}.json"
    return Response(
        content=interview.model_dump_json(indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete(
    "/{interview_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an interview",
)
async def delete_interview(
    interview_id: str,
    service: InterviewService = Depends(get_service),
) -> Response:
    await service.delete(interview_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
