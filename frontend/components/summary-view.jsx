"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  Hash,
  MessageSquareQuote,
  Quote,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { sentimentMeta } from "@/lib/constants";
import {
  formatDateTime,
  formatDuration,
  pluralize,
  summaryToText,
} from "@/lib/utils";

const PROVIDER_LABELS = {
  mock: "Built-in demo interviewer",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  groq: "Groq",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  together: "Together AI",
  ollama: "Ollama (local)",
  lmstudio: "LM Studio (local)",
  vllm: "vLLM (local)",
  custom: "Custom endpoint",
};

export function SummaryView({ interview }) {
  const { summary, analysis, questions, persona } = interview;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (interview.topic) document.title = `${interview.topic} — AI Interviewer`;
    return () => {
      document.title = "AI Interviewer — A thoughtful interview, on any topic";
    };
  }, [interview.topic]);

  const sentiment = summary?.sentiment || { label: "neutral", score: 0, explanation: "" };
  const tone = sentimentMeta(sentiment.label);
  const scorePercent = Math.round(((Number(sentiment.score) + 1) / 2) * 100);
  const keywordMeta = analysis?.keywords || [];
  const stats = analysis?.stats;

  const duration =
    stats?.duration_seconds ??
    (interview.completed_at
      ? Math.max(
          0,
          Math.round(
            (new Date(interview.completed_at).getTime() -
              new Date(interview.created_at).getTime()) /
              1000,
          ),
        )
      : 0);

  const answerSentiments = useMemo(() => {
    const map = new Map();
    (analysis?.answer_sentiments || []).forEach((item) => map.set(item.question_id, item));
    return map;
  }, [analysis]);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryToText(interview));
      setCopied(true);
      toast.success("Summary copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("The clipboard isn't available in this browser");
    }
  }

  if (!summary) {
    return (
      <div className="container py-20">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <h1 className="font-display text-3xl">This interview has no summary yet.</h1>
          <Button asChild className="mt-6">
            <Link href={`/interview/${interview.id}`}>Back to the interview</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-border/60 bg-background/45">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link
            href="/interviews"
            className="inline-flex items-center gap-1.5 rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All interviews
          </Link>
          <Badge variant="positive">
            <CheckCircle2 className="size-3" />
            Interview complete
          </Badge>
        </div>
      </div>

      <div className="container flex-1 py-10 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <header>
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Interview summary
            </p>
            <h1 className="mt-2 max-w-4xl font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
              {interview.topic}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span>{formatDateTime(interview.completed_at)}</span>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span>{persona.name}</span>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span>
                {questions.length} {pluralize(questions.length, "question")}
              </span>
              <span className="hidden size-1 rounded-full bg-border sm:block" />
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {formatDuration(duration)}
              </span>
            </div>

            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {summary.overview}
            </p>
          </header>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
            <div className="space-y-8">
              {summary.themes?.length ? (
                <section>
                  <SectionHeading
                    eyebrow="Themes"
                    title="What came up"
                    description="Recurring threads, anchored to what you said."
                  />
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {summary.themes.map((theme, index) => (
                      <Card
                        key={`${theme.title}-${index}`}
                        className="relative overflow-hidden p-5 transition-colors hover:border-primary/20"
                      >
                        <span className="font-mono text-[0.65rem] text-muted-foreground/70">
                          0{index + 1}
                        </span>
                        <h3 className="mt-2 font-display text-xl leading-snug tracking-tight">
                          {theme.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {theme.insight}
                        </p>
                        {theme.quote ? (
                          <blockquote className="mt-4 border-l-2 border-primary/25 pl-3 font-display text-[0.95rem] italic leading-relaxed text-foreground/80">
                            “{theme.quote}”
                          </blockquote>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}

              {summary.key_points?.length ? (
                <section>
                  <SectionHeading
                    eyebrow="Key points"
                    title="In your own words"
                    description="The short version of what you told us."
                  />
                  <Card className="mt-5 p-6">
                    <ul className="space-y-3.5">
                      {summary.key_points.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                          <p className="text-sm leading-relaxed text-foreground/85">{point}</p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </section>
              ) : null}

              {summary.notable_quote ? (
                <figure className="relative overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.045] px-6 py-9 text-center sm:px-10">
                  <Quote className="mx-auto size-6 text-primary/35" />
                  <blockquote className="mx-auto mt-4 max-w-2xl font-display text-2xl leading-snug tracking-tight sm:text-3xl">
                    “{summary.notable_quote}”
                  </blockquote>
                  <figcaption className="mt-4 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Participant · {interview.topic}
                  </figcaption>
                </figure>
              ) : null}

              <section>
                <SectionHeading
                  eyebrow="Transcript"
                  title="The full conversation"
                  description="Every question and answer, exactly as stored."
                />
                <details className="group mt-5 overflow-hidden rounded-2xl border border-border/70 bg-card/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-medium transition-colors hover:bg-accent/40">
                    <span className="inline-flex items-center gap-2">
                      <MessageSquareQuote className="size-4 text-primary" />
                      Read the transcript
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {questions.length} {pluralize(questions.length, "answer")}
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <div className="divide-y divide-border/60 border-t border-border/60">
                    {questions.map((question) => {
                      const answerTone = answerSentiments.get(question.id);
                      return (
                        <div key={question.id} className="p-5 sm:p-6">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                answerTone ? sentimentMeta(answerTone.label).dot : "bg-border"
                              }`}
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                                Question {question.index + 1}
                              </p>
                              <p className="mt-1 text-sm font-medium leading-relaxed">
                                {question.text}
                              </p>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                                {question.answer || "No answer recorded."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <Card className="p-5">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Overall tone
                </p>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl tracking-tight">{tone.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Score {Number(sentiment.score) >= 0 ? "+" : ""}
                      {Number(sentiment.score).toFixed(2)} · from −1 to +1
                    </p>
                  </div>
                  <Badge variant="outline" className={tone.badge}>
                    <span className={`size-1.5 rounded-full ${tone.dot}`} />
                    {tone.label}
                  </Badge>
                </div>

                <div className="mt-5" aria-hidden="true">
                  <div className="relative h-2 rounded-full bg-gradient-to-r from-negative/70 via-warning/50 to-positive/70">
                    <span
                      className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-background bg-foreground shadow-sm"
                      style={{ left: `${Math.min(98, Math.max(2, scorePercent))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Cautious</span>
                    <span>Neutral</span>
                    <span>Positive</span>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {sentiment.explanation}
                </p>

                {analysis?.sentiment ? (
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[0.7rem] text-muted-foreground">
                    <span>Lexicon-based tone check</span>
                    <span className="font-medium text-foreground">
                      {sentimentMeta(analysis.sentiment.label).label}
                    </span>
                  </div>
                ) : null}
              </Card>

              {analysis ? (
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Text signals
                    </p>
                    <Badge variant="muted">Local</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <SignalStat
                      icon={MessageSquareQuote}
                      label="Answers"
                      value={stats?.answer_count ?? questions.length}
                    />
                    <SignalStat icon={Hash} label="Words" value={stats?.word_count ?? 0} />
                    <SignalStat
                      icon={Clock3}
                      label="Duration"
                      value={formatDuration(duration)}
                    />
                    <SignalStat
                      icon={Sparkles}
                      label="Avg. answer"
                      value={`${stats?.average_answer_words ?? 0} words`}
                    />
                  </div>

                  {keywordMeta.length ? (
                    <>
                      <Separator className="my-4" />
                      <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Keywords
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {keywordMeta.map((keyword) => (
                          <span
                            key={keyword.term}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs"
                          >
                            {keyword.term}
                            <span className="tabular-nums text-[0.6rem] text-muted-foreground">
                              ×{keyword.count}
                            </span>
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}
                </Card>
              ) : null}

              <Card className="space-y-2 p-4">
                <Button asChild className="w-full justify-start">
                  <Link href="/#start">
                    <Sparkles className="size-4" />
                    Start another interview
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={copySummary}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy summary"}
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <a href={api.exportUrl(interview.id)} download>
                    <Download className="size-4" />
                    Download JSON
                  </a>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/interviews">
                    <ArrowLeft className="size-4" />
                    All interviews
                  </Link>
                </Button>
              </Card>

              <div className="rounded-xl border border-dashed border-border bg-muted/25 p-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  Generated with
                </div>
                <p className="mt-1.5 font-medium">
                  {PROVIDER_LABELS[interview.provider] || interview.provider}
                </p>
                <p className="mt-0.5 font-mono text-[0.65rem] text-muted-foreground">
                  {interview.model || "—"}
                </p>
                <p className="mt-2 leading-relaxed text-[0.65rem] text-muted-foreground">
                  AI-generated summaries can be imperfect. The transcript above is the source of
                  truth.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div>
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1.5 font-display text-2xl tracking-tight sm:text-3xl">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function SignalStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <Icon className="size-3.5 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{value}</p>
      <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
    </div>
  );
}
