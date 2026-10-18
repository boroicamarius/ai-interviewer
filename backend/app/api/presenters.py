"""Mapping domain entities to API schemas."""

from __future__ import annotations

from app.core.personas import PERSONAS, get_persona
from app.domain.entities import Interview
from app.domain.errors import InvalidRequestError
from app.schemas.interview import (
    InterviewListItem,
    InterviewResponse,
    PersonaView,
    ProgressView,
    QuestionView,
)


def _persona(interview: Interview) -> PersonaView:
    try:
        persona = get_persona(interview.persona)
    except InvalidRequestError:
        persona = PERSONAS["curious-researcher"]
    return PersonaView(id=persona.id, name=persona.name, description=persona.description)


def present_interview(interview: Interview) -> InterviewResponse:
    answers = {answer.question_id: answer for answer in interview.answers}
    questions = [
        QuestionView(
            id=question.id,
            index=question.index,
            text=question.text,
            intent=question.intent,
            answer=answers[question.id].text if question.id in answers else None,
            answered_at=answers[question.id].answered_at if question.id in answers else None,
        )
        for question in interview.questions
    ]
    total = len(interview.questions)
    answered = sum(1 for question in questions if question.answer is not None)
    return InterviewResponse(
        id=interview.id,
        topic=interview.topic,
        context=interview.context,
        persona=_persona(interview),
        language=interview.language,
        status=interview.status,
        questions=questions,
        progress=ProgressView(
            answered=answered,
            total=total,
            percent=round((answered / total) * 100) if total else 0,
        ),
        summary=interview.summary,
        analysis=interview.analysis,
        provider=interview.provider,
        model=interview.model,
        created_at=interview.created_at,
        updated_at=interview.updated_at,
        completed_at=interview.completed_at,
    )


def present_list_item(interview: Interview) -> InterviewListItem:
    summary = interview.summary
    preview = None
    if summary and summary.overview:
        preview = summary.overview[:160] + ("…" if len(summary.overview) > 160 else "")
    return InterviewListItem(
        id=interview.id,
        topic=interview.topic,
        status=interview.status,
        persona=_persona(interview),
        question_count=len(interview.questions),
        answered_count=interview.answered_count,
        sentiment_label=summary.sentiment.label.value if summary else None,
        summary_preview=preview,
        created_at=interview.created_at,
        completed_at=interview.completed_at,
    )
