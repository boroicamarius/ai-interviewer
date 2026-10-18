"""Factory for the local text analyzer."""

from __future__ import annotations

from app.core.config import Settings
from app.domain.ports import TextAnalyzer
from app.infrastructure.analysis.lexical import LexicalInterviewAnalyzer


def build_analyzer(settings: Settings) -> TextAnalyzer | None:
    if not settings.analysis_enabled:
        return None
    return LexicalInterviewAnalyzer(keywords_top_n=settings.analysis_keywords_top_n)
