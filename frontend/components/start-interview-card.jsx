"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Info,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { useMeta } from "@/lib/use-meta";
import { cn } from "@/lib/utils";

export function StartInterviewCard() {
  const router = useRouter();
  const { meta, loading: metaLoading } = useMeta();
  const inputRef = useRef(null);

  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [persona, setPersona] = useState(meta.default_persona);
  const [count, setCount] = useState(meta.limits.default_questions);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const { min_questions: min, max_questions: max } = meta.limits;
    const total = Math.max(0, max - min + 1);
    return Array.from({ length: total }, (_, index) => min + index);
  }, [meta.limits]);

  useEffect(() => {
    if (!meta.personas.some((item) => item.id === persona)) {
      setPersona(meta.default_persona);
    }
    if (!counts.includes(count)) {
      setCount(meta.limits.default_questions);
    }
  }, [meta, persona, counts, count]);

  const selectedPersona = meta.personas.find((item) => item.id === persona);
  const providerReady = meta.provider?.ready !== false;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const cleanTopic = topic.trim();
    if (cleanTopic.length < 3) {
      setError("Please choose a topic with at least 3 characters.");
      inputRef.current?.focus();
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const interview = await api.startInterview({
        topic: cleanTopic,
        context: context.trim(),
        questionCount: count,
        persona,
      });
      router.push(`/interview/${interview.id}`);
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error("Could not start the interview", { description: message });
      setSubmitting(false);
    }
  }

  return (
    <Card className="relative overflow-hidden border-border/70 bg-card/90 shadow-lift">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary/30 to-accent" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="soft" className="border border-primary/10 bg-primary/10 text-primary">
            <Sparkles className="size-3" />
            Start here
          </Badge>
          <span className="text-xs text-muted-foreground">3–5 minutes</span>
        </div>
        <CardTitle className="mt-2 font-display text-3xl font-normal tracking-tight">
          What should we talk about?
        </CardTitle>
        <CardDescription>
          Choose a topic and a little context. The interviewer will take it from there.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="topic" className="text-sm font-medium">
              Topic
            </label>
            <Input
              ref={inputRef}
              id="topic"
              name="topic"
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                if (error) setError("");
              }}
              maxLength={meta.limits.topic_max_chars}
              placeholder="e.g. AI in the workplace"
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "topic-error" : undefined}
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <Lightbulb className="size-3.5" />
              Need an idea?
            </div>
            <div className="flex flex-wrap gap-1.5">
              {meta.suggested_topics.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setTopic(suggestion);
                    setError("");
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent hover:text-foreground",
                    topic === suggestion && "border-primary/30 bg-accent text-foreground",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="context" className="text-sm font-medium">
                Your perspective <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <span className="text-[0.7rem] tabular-nums text-muted-foreground">
                {context.length}/{meta.limits.max_context_chars}
              </span>
            </div>
            <Input
              id="context"
              name="context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              maxLength={meta.limits.max_context_chars}
              placeholder="e.g. I'm a designer at a small startup"
              autoComplete="off"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="persona" className="text-sm font-medium">
                Interviewer style
              </label>
              <Select value={persona} onValueChange={setPersona} disabled={submitting}>
                <SelectTrigger id="persona" aria-label="Interviewer style">
                  <SelectValue placeholder="Choose a style" />
                </SelectTrigger>
                <SelectContent>
                  {meta.personas.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="min-h-[2rem] text-xs leading-relaxed text-muted-foreground">
                {selectedPersona?.description}
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Questions</span>
              <div
                className="flex items-center gap-1 rounded-xl border border-input bg-muted/50 p-1"
                role="group"
                aria-label="Number of questions"
              >
                {counts.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCount(option)}
                    aria-pressed={count === option}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-2 text-sm font-medium transition-all",
                      count === option
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    disabled={submitting}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="min-h-[2rem] text-xs leading-relaxed text-muted-foreground">
                A focused conversation, not a survey.
              </p>
            </div>
          </div>

          {error ? (
            <div
              id="topic-error"
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {!providerReady ? (
            <div className="flex items-start gap-2 rounded-xl border border-negative/25 bg-negative/5 p-3 text-xs leading-relaxed text-negative">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                The language model is not configured. {meta.provider.detail || "Check your .env file."}
              </span>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            className="group w-full"
            disabled={submitting || metaLoading || !providerReady}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Preparing your interview…
              </>
            ) : (
              <>
                Begin the interview
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </Button>

          {meta.provider?.demo ? (
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-[0.72rem] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-medium text-foreground">Demo mode.</span> Questions come from
                built-in templates. Add an LLM key in <code className="font-mono">.env</code> to use
                a real model.
              </span>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
