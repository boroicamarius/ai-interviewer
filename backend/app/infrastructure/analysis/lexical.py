"""Lexicon-based text analysis (the assignment's bonus feature).

This runs locally and deterministically: VADER for sentence-level sentiment and
a small frequency/co-occurrence extractor for keywords.  No extra API calls, no
model downloads, and it works even when the interviewer is in demo mode.
"""

from __future__ import annotations

import re
from collections import Counter

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from app.domain.entities import (
    AnswerSentiment,
    Interview,
    InterviewAnalysis,
    Keyword,
    SentimentLabel,
    SummarySentiment,
    TextStats,
)

_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z'’-]{2,}")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")

_STOPWORDS = {
    "about", "actually", "after", "again", "against", "also", "always", "among", "and",
    "another", "any", "anything", "are", "around", "because", "been", "before", "being", "both",
    "but", "can", "could", "did", "does", "doing", "don", "down", "during", "each",
    "even", "ever", "every", "especially", "few", "first", "for", "from", "genuinely",
    "get", "gets", "getting", "got", "largely", "mostly", "particularly", "probably",
    "had", "has", "have", "having", "her", "here", "hers", "him", "his", "how", "into",
    "its", "just", "know", "like", "lot", "make", "makes", "many", "may", "mean",
    "might", "more", "most", "much", "must", "need", "never", "not", "now", "off",
    "often", "one", "only", "other", "our", "out", "over", "per", "put", "quite",
    "rather", "really", "right", "said", "same", "say", "says", "see", "seem", "she",
    "simply", "slightly",
    "should", "since", "so", "some", "something", "sometimes", "still", "stuff",
    "such", "surprisingly", "than", "that", "the", "their", "them", "then", "there",
    "these", "they", "though",
    "thing", "things", "think", "this", "those", "through", "time", "too", "under",
    "until", "up", "very", "want", "way", "well", "were", "what", "when", "where",
    "which", "while", "who", "why", "will", "with", "worth", "would", "you", "your",
}


class LexicalInterviewAnalyzer:
    def __init__(self, *, keywords_top_n: int = 8) -> None:
        self._vader = SentimentIntensityAnalyzer()
        self._top_n = max(1, keywords_top_n)

    def analyze(self, interview: Interview) -> InterviewAnalysis:
        ordered_answers = [
            answer
            for question in interview.questions
            if (answer := interview.answer_for(question.id)) is not None
        ]
        texts = [answer.text for answer in ordered_answers]
        combined = " ".join(texts)

        answer_sentiments: list[AnswerSentiment] = []
        weighted_total = 0.0
        word_total = 0
        for answer in ordered_answers:
            score = round(self._vader.polarity_scores(answer.text)["compound"], 3)
            words = len(answer.text.split())
            weighted_total += score * max(1, words)
            word_total += max(1, words)
            answer_sentiments.append(
                AnswerSentiment(
                    question_id=answer.question_id,
                    label=_label_for_score(score),
                    score=score,
                )
            )

        overall_score = round(weighted_total / word_total, 3) if word_total else 0.0
        if (
            len(answer_sentiments) >= 2
            and any(item.score >= 0.25 for item in answer_sentiments)
            and any(item.score <= -0.25 for item in answer_sentiments)
            and abs(overall_score) < 0.4
        ):
            overall_label = SentimentLabel.MIXED
        else:
            overall_label = _label_for_score(overall_score)

        total_words = len(combined.split())
        duration = 0
        if interview.completed_at is not None:
            duration = max(0, int((interview.completed_at - interview.created_at).total_seconds()))

        return InterviewAnalysis(
            sentiment=SummarySentiment(
                label=overall_label,
                score=overall_score,
                explanation=(
                    "Lexicon-based tone score across all answers "
                    f"({len(texts)} answers, {total_words} words)."
                ),
            ),
            answer_sentiments=answer_sentiments,
            keywords=self._extract_keywords(combined),
            stats=TextStats(
                answer_count=len(texts),
                word_count=total_words,
                average_answer_words=round(total_words / len(texts), 1) if texts else 0.0,
                duration_seconds=duration,
            ),
        )

    def _extract_keywords(self, text: str) -> list[Keyword]:
        unigrams: Counter[str] = Counter()
        bigrams: Counter[str] = Counter()

        # Tokenise sentence by sentence so a phrase is never assembled from
        # words that were merely close after stopword removal.
        for sentence in _SENTENCE_SPLIT_RE.split(text):
            tokens = [match.group(0).lower() for match in _TOKEN_RE.finditer(sentence)]
            unigrams.update(token for token in tokens if token not in _STOPWORDS)
            for first, second in zip(tokens, tokens[1:], strict=False):
                if first in _STOPWORDS or second in _STOPWORDS or first == second:
                    continue
                bigrams[f"{first} {second}"] += 1

        if not unigrams:
            return []

        scored: dict[str, tuple[int, float]] = {}
        for term, count in unigrams.items():
            scored[term] = (count, float(count))
        for term, count in bigrams.items():
            # Phrases get a small bonus, but a one-off phrase should not beat a
            # genuinely repeated single word.
            scored[term] = (count, float(count) + 0.75)

        ranked = sorted(
            scored.items(),
            key=lambda item: (-item[1][1], -item[1][0], item[0]),
        )
        return [
            Keyword(term=term, count=count, weight=round(weight, 2))
            for term, (count, weight) in ranked[: self._top_n]
        ]


def _label_for_score(score: float) -> SentimentLabel:
    if score >= 0.15:
        return SentimentLabel.POSITIVE
    if score <= -0.15:
        return SentimentLabel.NEGATIVE
    return SentimentLabel.NEUTRAL
