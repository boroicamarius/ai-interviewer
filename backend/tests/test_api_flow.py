from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

ANSWERS = [
    "I use AI to draft first-pass copy and explore directions when I'm stuck. It saves time, "
    "but I still rewrite anything that goes to a client.",
    "Last week I used it to summarise user interviews. It was genuinely helpful and cut an hour "
    "of grunt work, though I double-checked every quote.",
    "I worry about over-reliance. The blank page is easier now, but I don't want to lose the "
    "muscle of thinking things through myself.",
    "A year from now I'd like AI to handle the repetitive parts so I can spend more time with "
    "people. I want to stay in control of the final decision.",
]


def _answer_all(client: TestClient, interview: dict) -> dict:
    latest = interview
    for question, answer in zip(interview["questions"], ANSWERS, strict=False):
        response = client.post(
            f"/api/v1/interviews/{interview['id']}/answers",
            json={"question_id": question["id"], "answer": answer},
        )
        assert response.status_code == 200, response.text
        latest = response.json()
    return latest


def test_health_and_meta(client: TestClient) -> None:
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["provider"] == "mock"

    meta = client.get("/api/v1/meta").json()
    assert meta["provider"]["demo"] is True
    assert meta["limits"]["min_questions"] == 3
    assert meta["limits"]["max_questions"] == 5
    assert len(meta["personas"]) == 3
    assert "AI in the workplace" in meta["suggested_topics"]
    assert meta["analysis_enabled"] is True


def test_full_interview_lifecycle_saves_json(
    client: TestClient, started_interview: dict, settings
) -> None:
    interview = started_interview
    assert interview["status"] == "in_progress"
    assert 3 <= len(interview["questions"]) <= 5
    assert interview["progress"] == {"answered": 0, "total": len(interview["questions"]), "percent": 0}
    assert Path(settings.data_path, "interviews", f"{interview['id']}.json").exists()

    updated = _answer_all(client, interview)
    assert updated["progress"]["answered"] == len(updated["questions"])
    assert updated["progress"]["percent"] == 100

    completed = client.post(f"/api/v1/interviews/{interview['id']}/complete")
    assert completed.status_code == 200, completed.text
    final = completed.json()
    assert final["status"] == "completed"
    assert final["summary"]["overview"]
    assert final["summary"]["themes"]
    assert final["summary"]["key_points"]
    assert final["summary"]["sentiment"]["label"] in {"positive", "neutral", "negative", "mixed"}
    assert final["analysis"] is not None
    assert final["analysis"]["keywords"]
    assert final["analysis"]["stats"]["answer_count"] == len(updated["questions"])
    assert final["analysis"]["stats"]["word_count"] > 0

    # Every generated quote must be grounded in a real answer.
    transcript = " ".join(answer for answer in ANSWERS)
    for theme in final["summary"]["themes"]:
        if theme["quote"]:
            assert theme["quote"] in transcript
    if final["summary"]["notable_quote"]:
        assert final["summary"]["notable_quote"] in transcript

    listing = client.get("/api/v1/interviews").json()
    assert listing["total"] == 1
    assert listing["items"][0]["status"] == "completed"
    assert listing["items"][0]["sentiment_label"] == final["summary"]["sentiment"]["label"]

    exported = client.get(f"/api/v1/interviews/{interview['id']}/export")
    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("application/json")
    assert "attachment" in exported.headers["content-disposition"]
    assert exported.json()["topic"] == "AI in the workplace"

    deleted = client.delete(f"/api/v1/interviews/{interview['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/v1/interviews/{interview['id']}").status_code == 404
    assert not Path(settings.data_path, "interviews", f"{interview['id']}.json").exists()


def test_complete_is_idempotent(client: TestClient, started_interview: dict) -> None:
    interview = started_interview
    _answer_all(client, interview)
    first = client.post(f"/api/v1/interviews/{interview['id']}/complete")
    second = client.post(f"/api/v1/interviews/{interview['id']}/complete")
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["summary"] == second.json()["summary"]


def test_cannot_complete_early(client: TestClient, started_interview: dict) -> None:
    response = client.post(f"/api/v1/interviews/{started_interview['id']}/complete")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "interview_incomplete"


def test_question_count_is_bounded(client: TestClient) -> None:
    for count in (2, 6):
        response = client.post(
            "/api/v1/interviews",
            json={"topic": "Remote work", "question_count": count},
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "invalid_request"


def test_topic_and_persona_validation(client: TestClient) -> None:
    short = client.post("/api/v1/interviews", json={"topic": "AI"})
    assert short.status_code == 400

    persona = client.post(
        "/api/v1/interviews",
        json={"topic": "Remote work", "persona": "not-a-persona"},
    )
    assert persona.status_code == 400
    assert "Unknown persona" in persona.json()["error"]["message"]


def test_unknown_interview_returns_404(client: TestClient) -> None:
    missing = "0" * 32
    assert client.get(f"/api/v1/interviews/{missing}").status_code == 404
    assert (
        client.post(
            f"/api/v1/interviews/{missing}/answers",
            json={"question_id": "nope", "answer": "Hello"},
        ).status_code
        == 404
    )
    assert client.post(f"/api/v1/interviews/{missing}/complete").status_code == 404
    assert client.delete(f"/api/v1/interviews/{missing}").status_code == 404


def test_answer_validation(client: TestClient, started_interview: dict) -> None:
    interview = started_interview
    question = interview["questions"][0]

    too_long = client.post(
        f"/api/v1/interviews/{interview['id']}/answers",
        json={"question_id": question["id"], "answer": "x" * 5000},
    )
    assert too_long.status_code == 400
    assert too_long.json()["error"]["code"] == "answer_too_long"

    unknown = client.post(
        f"/api/v1/interviews/{interview['id']}/answers",
        json={"question_id": "a" * 32, "answer": "A real answer"},
    )
    assert unknown.status_code == 404
    assert unknown.json()["error"]["code"] == "question_not_found"

    # Answers can be revised before completion.
    first = client.post(
        f"/api/v1/interviews/{interview['id']}/answers",
        json={"question_id": question["id"], "answer": "First version"},
    )
    assert first.status_code == 200
    revised = client.post(
        f"/api/v1/interviews/{interview['id']}/answers",
        json={"question_id": question["id"], "answer": "Revised version"},
    )
    assert revised.status_code == 200
    stored = next(
        item for item in revised.json()["questions"] if item["id"] == question["id"]
    )
    assert stored["answer"] == "Revised version"
    assert revised.json()["progress"]["answered"] == 1


def test_request_validation_is_structured(client: TestClient) -> None:
    response = client.post("/api/v1/interviews", json={"context": "no topic"})
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["details"]
