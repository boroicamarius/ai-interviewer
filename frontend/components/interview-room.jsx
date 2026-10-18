"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  RotateCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SummaryView } from "@/components/summary-view";
import { api, errorMessage } from "@/lib/api";
import { statusMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMeta } from "@/lib/use-meta";

export function InterviewRoom() {
  const params = useParams();
  const id = params?.id;
  const { meta } = useMeta();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState("");

  const textareaRef = useRef(null);
  const currentQuestionRef = useRef(null);
  const previousQuestionId = useRef(null);
  const didInitialScroll = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getInterview(id);
      setInterview(data);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const currentQuestion =
    interview?.questions.find((question) => question.answer === null) || null;
  const answeredQuestions = interview?.questions.filter((question) => question.answer) || [];

  useEffect(() => {
    if (!currentQuestion?.id) return;

    const focusAnswer = () => {
      if (window.matchMedia("(pointer: fine)").matches) {
        textareaRef.current?.focus({ preventScroll: true });
      }
    };

    if (!didInitialScroll.current) {
      didInitialScroll.current = true;
      previousQuestionId.current = currentQuestion.id;
      // On a fresh interview, start at the top so the topic and progress are visible.
      if ((interview?.progress?.answered ?? 0) === 0) return undefined;
      const timer = setTimeout(() => {
        currentQuestionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        focusAnswer();
      }, 280);
      return () => clearTimeout(timer);
    }

    if (previousQuestionId.current && previousQuestionId.current !== currentQuestion.id) {
      previousQuestionId.current = currentQuestion.id;
      const timer = setTimeout(() => {
        currentQuestionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        focusAnswer();
      }, 120);
      return () => clearTimeout(timer);
    }
    previousQuestionId.current = currentQuestion.id;
    return undefined;
  }, [currentQuestion?.id, interview?.progress?.answered]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 120), 260)}px`;
  }, [answer]);

  async function runCompletion(targetId) {
    setCompleting(true);
    setCompletionError("");
    try {
      const final = await api.completeInterview(targetId);
      setInterview(final);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const message = errorMessage(err);
      setCompletionError(message);
      toast.error("Could not generate the summary", { description: message });
    } finally {
      setCompleting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!currentQuestion || submitting || completing) return;

    const trimmed = answer.trim();
    if (trimmed.length < 2) {
      setAnswerError("Add a few more words before sending.");
      textareaRef.current?.focus();
      return;
    }

    setAnswerError("");
    setSubmitting(true);
    try {
      const updated = await api.submitAnswer(id, {
        questionId: currentQuestion.id,
        answer: trimmed,
      });
      setInterview(updated);
      setAnswer("");
      if (updated.progress.answered >= updated.progress.total) {
        await runCompletion(updated.id);
      }
    } catch (err) {
      setAnswerError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  if (loading) {
    return <InterviewSkeleton />;
  }

  if (loadError) {
    return (
      <div className="container flex-1 py-20">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <h1 className="mt-5 font-display text-3xl">We couldn&apos;t load this interview.</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {errorMessage(loadError)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={load}>
              <RotateCw className="size-4" />
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/interviews">All interviews</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!interview) return null;

  if (interview.status === "completed" && interview.summary) {
    return <SummaryView interview={interview} />;
  }

  const progress = interview.progress;
  const total = interview.questions.length;
  const status = statusMeta(interview.status);
  const allAnswered = !currentQuestion && progress.answered >= total;

  if (completing) {
    return <AnalyzingState topic={interview.topic} />;
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
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary/70" />
            Saved automatically
          </span>
        </div>
      </div>

      <div className="container flex-1 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              <div>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight">
                  {interview.topic}
                </h1>
                {interview.context ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Context: {interview.context}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Progress</span>
                  <span className="tabular-nums text-muted-foreground">
                    {progress.answered} / {progress.total}
                  </span>
                </div>
                <Progress value={progress.percent} className="mt-2.5 h-1.5" />
                <ol className="mt-4 space-y-2.5">
                  {interview.questions.map((question, index) => {
                    const isCurrent = currentQuestion?.id === question.id;
                    const isAnswered = Boolean(question.answer);
                    return (
                      <li key={question.id} className="flex items-start gap-2.5 text-xs">
                        <span
                          className={cn(
                            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[0.55rem]",
                            isAnswered &&
                              "border-primary/30 bg-primary/10 text-primary",
                            isCurrent && "border-primary bg-primary text-primary-foreground",
                            !isAnswered &&
                              !isCurrent &&
                              "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {isAnswered ? (
                            <Check className="size-2.5" strokeWidth={3} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span
                          className={cn(
                            "line-clamp-2 leading-relaxed",
                            isCurrent ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {question.text}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="space-y-2.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Interviewer</span>
                  <span className="text-right font-medium text-foreground">
                    {interview.persona.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Questions</span>
                  <span className="font-medium text-foreground">{total}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Model</span>
                  <span className="max-w-[140px] truncate text-right font-medium text-foreground">
                    {interview.provider === "mock" ? "Demo interviewer" : interview.model}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                  <h1 className="mt-2 font-display text-2xl leading-tight">{interview.topic}</h1>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {progress.answered}/{progress.total}
                </span>
              </div>
              <Progress value={progress.percent} className="mt-3 h-1.5" />
            </div>

            {answeredQuestions.length > 0 ? (
              <div className="space-y-5">
                {answeredQuestions.map((question) => (
                  <div key={question.id} className="space-y-3">
                    <ChatQuestion question={question} total={total} />
                    <ChatAnswer text={question.answer} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Take your time. There are no wrong answers.</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Answer one question at a time. You can leave and come back whenever you like.
                  </p>
                </div>
              </div>
            )}

            {currentQuestion ? (
              <div ref={currentQuestionRef} className="mt-8 scroll-mt-24">
                <div className="rounded-2xl border border-primary/15 bg-card/90 p-6 shadow-soft sm:p-8">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Sparkles className="size-3.5" />
                    </span>
                    <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Question {currentQuestion.index + 1} of {total}
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-[1.7rem] leading-snug tracking-tight sm:text-3xl">
                    {currentQuestion.text}
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="mt-4">
                  <Card className="p-4 sm:p-5">
                    <label htmlFor="answer" className="sr-only">
                      Your answer
                    </label>
                    <Textarea
                      ref={textareaRef}
                      id="answer"
                      value={answer}
                      onChange={(event) => {
                        setAnswer(event.target.value);
                        if (answerError) setAnswerError("");
                      }}
                      onKeyDown={handleKeyDown}
                      maxLength={meta.limits.max_answer_chars}
                      placeholder="Take your time. A few honest sentences are enough…"
                      rows={4}
                      disabled={submitting}
                      aria-describedby={answerError ? "answer-error" : "answer-hint"}
                      className="min-h-[120px] border-0 bg-transparent px-1 py-1 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    {answerError ? (
                      <p
                        id="answer-error"
                        role="alert"
                        className="mt-2 flex items-center gap-1.5 text-xs text-destructive"
                      >
                        <AlertCircle className="size-3.5" />
                        {answerError}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                      <p id="answer-hint" className="text-[0.7rem] text-muted-foreground">
                        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.65rem]">
                          ⌘ / Ctrl
                        </kbd>{" "}
                        +{" "}
                        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-sans text-[0.65rem]">
                          Enter
                        </kbd>{" "}
                        to send
                        <span className="ml-3 tabular-nums">
                          {answer.length}/{meta.limits.max_answer_chars}
                        </span>
                      </p>
                      <Button
                        type="submit"
                        disabled={submitting || answer.trim().length < 2}
                        className="gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            Send answer
                            <Send className="size-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </form>
              </div>
            ) : null}

            {allAnswered ? (
              <Card className="mt-8 p-8 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="size-6" />
                </span>
                <h2 className="mt-5 font-display text-3xl">All answers are in.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  AI Interviewer will read your answers, find the themes, and write a short summary you can
                  keep.
                </p>
                {completionError ? (
                  <p
                    role="alert"
                    className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-left text-xs leading-relaxed text-destructive"
                  >
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                    {completionError}
                  </p>
                ) : null}
                <Button
                  onClick={() => runCompletion(interview.id)}
                  size="lg"
                  className="mt-6"
                  disabled={completing}
                >
                  {completing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate my summary
                    </>
                  )}
                </Button>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function ChatQuestion({ question, total }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </span>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border/70 bg-card/80 px-4 py-3 shadow-sm">
        <p className="text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Question {question.index + 1} of {total}
        </p>
        <p className="mt-1 text-sm leading-relaxed sm:text-[0.95rem]">{question.text}</p>
      </div>
    </div>
  );
}

function ChatAnswer({ text }) {
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-border/60 bg-secondary/70 px-4 py-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
      </div>
      <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground">
        <UserRound className="size-3.5" />
      </span>
    </div>
  );
}

const ANALYZING_STEPS = [
  "Reading your answers",
  "Grouping emergent themes",
  "Weighing the overall tone",
  "Writing the summary",
];

function AnalyzingState({ topic }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((value) => Math.min(value + 1, ANALYZING_STEPS.length - 1));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container flex flex-1 items-center py-20">
      <div className="mx-auto w-full max-w-xl text-center">
        <div className="relative mx-auto grid size-20 place-items-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/15" />
          <span className="relative grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift">
            <Sparkles className="size-7 animate-pulse" />
          </span>
        </div>

        <p className="mt-8 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {topic}
        </p>
        <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
          Finding the signal…
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Reading your answers, grouping themes, and writing a short summary. This usually takes a
          few seconds.
        </p>

        <div className="mx-auto mt-8 max-w-sm space-y-3 rounded-2xl border border-border/70 bg-card/60 p-5 text-left">
          {ANALYZING_STEPS.map((step, index) => {
            const done = index < active;
            const current = index === active;
            return (
              <div key={step} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border",
                    done && "border-primary/30 bg-primary/10 text-primary",
                    current && "border-primary bg-primary text-primary-foreground",
                    !done && !current && "border-border text-muted-foreground/50",
                  )}
                >
                  {done ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : current ? (
                    <span className="size-1.5 animate-ping rounded-full bg-primary-foreground" />
                  ) : (
                    <span className="size-1 rounded-full bg-current" />
                  )}
                </span>
                <span className={cn(current ? "text-foreground" : "text-muted-foreground")}>
                  {step}
                </span>
                {current ? (
                  <span className="ml-auto flex gap-0.5">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="size-1 animate-typing rounded-full bg-primary"
                        style={{ animationDelay: `${dot * 150}ms` }}
                      />
                    ))}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InterviewSkeleton() {
  return (
    <>
      <div className="border-b border-border/60">
        <div className="container flex h-14 items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="container py-10">
        <div className="grid gap-10 lg:grid-cols-[270px_minmax(0,1fr)]">
          <div className="hidden space-y-5 lg:block">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="ml-auto h-20 w-3/4 rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  );
}
