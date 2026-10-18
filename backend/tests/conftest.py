from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture()
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        log_level="WARNING",
        storage_backend="json",
        data_dir=tmp_path,
        llm_provider="mock",
        analysis_enabled=True,
        interview_min_questions=3,
        interview_max_questions=5,
        interview_default_questions=4,
        interview_default_persona="curious-researcher",
    )


@pytest.fixture()
def client(settings: Settings):
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def started_interview(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/interviews",
        json={
            "topic": "AI in the workplace",
            "context": "I'm a product designer at a small startup.",
            "question_count": 4,
            "persona": "curious-researcher",
        },
    )
    assert response.status_code == 201
    return response.json()
