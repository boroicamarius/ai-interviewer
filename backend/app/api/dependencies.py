"""Dependency accessors for FastAPI routes."""

from __future__ import annotations

from fastapi import Request

from app.application.interview_service import InterviewService
from app.core.config import Settings


def get_service(request: Request) -> InterviewService:
    return request.app.state.service


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings
