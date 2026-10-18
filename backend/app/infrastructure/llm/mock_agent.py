"""A deterministic, offline interviewer used for demos and tests.

This is intentionally transparent: it is labelled as demo mode in the API and
UI, and it never pretends to be an LLM.  It lets someone run the full product
with zero credentials, while still producing summaries grounded in the
participant's actual words.
"""

from __future__ import annotations

import re

from app.domain.entities import Interview, SentimentLabel, Theme
from app.domain.values import AgentInfo, QuestionDraft, SummaryDraft, SummarySentimentDraft

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’-]{2,}")
_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")

_STOPWORDS = {
    "about",
    "after",
    "again",
    "also",
    "always",
    "and",
    "another",
    "anything",
    "are",
    "because",
    "been",
    "before",
    "being",
    "both",
    "but",
    "can",
    "could",
    "does",
    "doing",
    "don",
    "down",
    "during",
    "each",
    "even",
    "every",
    "actually",
    "especially",
    "genuinely",
    "largely",
    "mostly",
    "particularly",
    "probably",
    "simply",
    "slightly",
    "surprisingly",
    "feel",
    "feels",
    "first",
    "for",
    "from",
    "getting",
    "have",
    "having",
    "here",
    "how",
    "into",
    "just",
    "like",
    "make",
    "makes",
    "more",
    "most",
    "much",
    "need",
    "never",
    "not",
    "now",
    "one",
    "only",
    "other",
    "our",
    "out",
    "over",
    "really",
    "right",
    "said",
    "same",
    "some",
    "something",
    "still",
    "such",
    "than",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "thing",
    "things",
    "think",
    "worth",
    "this",
    "those",
    "through",
    "time",
    "very",
    "want",
    "way",
    "well",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "will",
    "with",
    "would",
    "your",
}

_POSITIVE = {
    "better",
    "easy",
    "easier",
    "efficient",
    "enjoy",
    "excited",
    "good",
    "great",
    "happy",
    "help",
    "helpful",
    "hope",
    "hopeful",
    "improve",
    "improved",
    "love",
    "optimistic",
    "productive",
    "save",
    "saved",
    "useful",
    "valuable",
}

_NEGATIVE = {
    "afraid",
    "annoying",
    "anxious",
    "bad",
    "broken",
    "concern",
    "concerned",
    "difficult",
    "exhausted",
    "fear",
    "frustrating",
    "frustrated",
    "hard",
    "hate",
    "lose",
    "overwhelmed",
    "risk",
    "skeptical",
    "stress",
    "stressed",
    "waste",
    "worse",
    "worried",
    "worry",
}

_QUESTION_TEMPLATES: list[tuple[str, str]] = [
    (
        "To start, tell me about your experience with {topic}. What does it look like day to day?",
        "Ground the conversation in current, concrete experience",
    ),
    (
        "What's a recent moment that captures {topic} in practice? What happened?",
        "Surface a specific story and its consequences",
    ),
    (
        "What is one thing about {topic} that people often misunderstand?",
        "Reveal assumptions and untold nuance",
    ),
    (
        "Where do you draw the line with {topic}? What would you not hand over?",
        "Explore boundaries, trust and trade-offs",
    ),
    (
        "If you could change one thing about {topic}, what would it be?",
        "Invite a concrete improvement",
    ),
    (
        "What would a good outcome around {topic} look like for you a year from now?",
        "Capture hopes and a forward-looking view",
    ),
    (
        "Who else is affected by {topic}, and how?",
        "Widen the lens beyond the individual",
    ),
]

_SEQUENCES: dict[int, list[int]] = {
    3: [0, 1, 5],
    4: [0, 1, 3, 5],
    5: [0, 1, 2, 3, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
}


class MockInterviewerAgent:
    """Offline fallback that keeps the full product experience available."""

    def __init__(self) -> None:
        self._info = AgentInfo(
            provider="mock",
            label="Built-in demo interviewer",
            model="ai-interviewer-demo",
            ready=True,
            demo=True,
            local=True,
            detail="Set LLM_PROVIDER and LLM_API_KEY in .env to use a real model.",
        )

    @property
    def info(self) -> AgentInfo:
        return self._info

    async def plan_questions(
        self,
        *,
        topic: str,
        context: str | None,
        persona: str,
        persona_prompt: str,
        count: int,
        language: str,
    ) -> list[QuestionDraft]:
        del context, persona, persona_prompt, language
        sequence = _SEQUENCES.get(count, list(range(len(_QUESTION_TEMPLATES))))[:count]
        if len(sequence) < count:
            sequence += [index for index in range(len(_QUESTION_TEMPLATES)) if index not in sequence][
                : count - len(sequence)
            ]
        inline_topic = _inline_topic(topic)
        return [
            QuestionDraft(
                text=_QUESTION_TEMPLATES[index][0].format(topic=inline_topic),
                intent=_QUESTION_TEMPLATES[index][1],
            )
            for index in sequence
        ]

    async def summarize(self, *, interview: Interview) -> SummaryDraft:
        answers = [
            interview.answer_for(question.id).text
            for question in interview.questions
            if interview.answer_for(question.id) is not None
        ]
        combined = " ".join(answers)
        positive, negative = _sentiment_hits(combined)
        label, score = _sentiment(positive, negative)

        keywords = _keywords(combined, limit=2)
        focus = " and ".join(keywords) if keywords else interview.topic
        tone_words = {
            SentimentLabel.POSITIVE: "mostly positive",
            SentimentLabel.NEGATIVE: "mostly cautious",
            SentimentLabel.MIXED: "mixed",
            SentimentLabel.NEUTRAL: "measured and neutral",
        }
        overview = (
            f"Across {len(answers)} answers about {interview.topic}, the participant "
            f"focused on {focus}. The overall tone was {tone_words[label]}."
        )

        themes: list[Theme] = []
        theme_specs = [
            ("Everyday reality", answers[0] if answers else ""),
            ("Friction and trust", answers[min(1, len(answers) - 1)] if answers else ""),
            ("What comes next", answers[-1] if answers else ""),
        ]
        seen: set[str] = set()
        for title, answer in theme_specs:
            if not answer or answer in seen:
                continue
            seen.add(answer)
            insight = _first_sentence(answer)
            if insight:
                themes.append(
                    Theme(
                        title=title,
                        insight=insight,
                        quote=_clip(answer, 25),
                    )
                )

        key_points = [_clip(_first_sentence(answer), 24) for answer in answers if answer.strip()][:5]
        notable_quote = _clip(max(answers, key=len), 30) if answers else None

        if positive and negative:
            explanation = (
                f"The participant's wording was mixed, with {positive} positive and "
                f"{negative} cautious or negative signals."
            )
        elif positive:
            explanation = (
                f"The participant's wording leaned positive, with {positive} positive "
                "signals and no strong negative wording."
            )
        elif negative:
            explanation = (
                f"The participant's wording leaned cautious, with {negative} negative "
                "signals and little positive wording."
            )
        else:
            explanation = "The participant's wording was largely neutral, with few evaluative words."

        return SummaryDraft(
            overview=overview,
            themes=themes,
            sentiment=SummarySentimentDraft(
                label=label,
                score=score,
                explanation=explanation,
            ),
            key_points=[point for point in key_points if point],
            notable_quote=notable_quote,
        )


def _inline_topic(topic: str) -> str:
    """Lowercase the topic only when it reads naturally inside a sentence."""

    cleaned = topic.strip().rstrip(".!?")
    if not cleaned:
        return cleaned
    first_word = cleaned.split(maxsplit=1)[0]
    if len(first_word) > 1 and first_word.isupper():
        return cleaned  # Preserve acronyms such as "AI".
    return cleaned[:1].lower() + cleaned[1:]


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_RE.split(text) if part.strip()]


def _first_sentence(text: str) -> str:
    sentences = _sentences(text)
    return sentences[0] if sentences else ""


def _clip(text: str, words: int) -> str:
    parts = text.split()
    return " ".join(parts[:words]) if parts else ""


def _keywords(text: str, *, limit: int) -> list[str]:
    counts: dict[str, int] = {}
    for match in _WORD_RE.finditer(text.lower()):
        word = match.group(0)
        if word in _STOPWORDS:
            continue
        counts[word] = counts.get(word, 0) + 1
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [word for word, _ in ranked[:limit]]


def _sentiment_hits(text: str) -> tuple[int, int]:
    words = [match.group(0).lower() for match in _WORD_RE.finditer(text)]
    positive = sum(1 for word in words if word in _POSITIVE)
    negative = sum(1 for word in words if word in _NEGATIVE)
    return positive, negative


def _sentiment(positive: int, negative: int) -> tuple[SentimentLabel, float]:
    total = positive + negative
    if total == 0:
        return SentimentLabel.NEUTRAL, 0.0
    score = round(max(-1.0, min(1.0, (positive - negative) / (total + 1))), 3)
    if positive and negative and abs(positive - negative) <= 1:
        return SentimentLabel.MIXED, score
    if positive > negative:
        return SentimentLabel.POSITIVE, score
    if negative > positive:
        return SentimentLabel.NEGATIVE, score
    return SentimentLabel.NEUTRAL, score
