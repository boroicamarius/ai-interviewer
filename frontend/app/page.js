import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  HardDrive,
  MessageSquareQuote,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecentInterviewsSection } from "@/components/recent-interviews";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StartInterviewCard } from "@/components/start-interview-card";

const STEPS = [
  {
    icon: Compass,
    title: "Choose a topic",
    description:
      "Bring a question you are curious about. Add a little context if it helps the interviewer ask better questions.",
  },
  {
    icon: MessageSquareQuote,
    title: "Answer one at a time",
    description:
      "Open-ended prompts, a calm pace, and a progress bar. Every answer is saved the moment you send it.",
  },
  {
    icon: Sparkles,
    title: "Get the signal",
    description:
      "A grounded summary with themes, sentiment, key points and exact quotes — plus a transcript you can keep.",
  },
];

const FEATURES = [
  "A real interview arc: lived experience, reflection, then outlook.",
  "Quotes are checked against the transcript, so nothing is invented.",
  "Sentiment and keywords are computed locally — no extra API calls.",
  "Every transcript is saved as readable JSON in your own data volume.",
];

const PROVIDERS = ["OpenAI", "OpenRouter", "Groq", "DeepSeek", "Ollama", "LM Studio", "vLLM"];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
          <div className="pointer-events-none absolute -right-24 top-24 size-80 rounded-full bg-accent/50 blur-3xl dark:bg-accent/20" />
          <div className="container relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.04fr_0.96fr] lg:gap-20 lg:py-28">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                A mini AI interviewer
              </div>

              <h1 className="mt-7 max-w-2xl font-display text-[3.35rem] leading-[0.95] tracking-[-0.025em] sm:text-7xl lg:text-[5.3rem]">
                A thoughtful interview,{" "}
                <span className="block italic text-primary">on any topic.</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Pick a topic. AI Interviewer asks 3–5 well-crafted questions, listens to your answers, and
                turns them into a clear summary of themes, sentiment and key takeaways.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="group">
                  <a href="#start">
                    Start an interview
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how-it-works">How it works</a>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary/70" />
                  No account needed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <HardDrive className="size-3.5 text-primary/70" />
                  Saved as local JSON
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5 text-primary/70" />
                  3–5 minutes
                </span>
              </div>
            </div>

            <div id="start" className="relative scroll-mt-24 animate-fade-up [animation-delay:120ms]">
              <StartInterviewCard />
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-20 border-y border-border/60 bg-card/35"
        >
          <div className="container py-20 lg:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  How it works
                </p>
                <h2 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
                  Three steps, one good conversation.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Not a survey and not a chatbot. A short, structured interview designed to surface
                what you actually think.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="group relative rounded-2xl border border-border/70 bg-background/60 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-soft"
                  >
                    <div className="flex items-center justify-between">
                      <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-xs text-muted-foreground/70">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    {index < STEPS.length - 1 ? (
                      <ArrowRight className="absolute -right-4 top-1/2 hidden size-4 text-border md:block" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="container py-20 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative mx-auto w-full max-w-md lg:mx-0">
              <div className="absolute -inset-5 rounded-[2.25rem] bg-accent/40 blur-2xl dark:bg-accent/20" />
              <Card className="relative -rotate-1 p-6">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="positive">
                    <Check className="size-3" />
                    Interview complete
                  </Badge>
                  <span className="text-xs text-muted-foreground">4 questions · 4m</span>
                </div>
                <h3 className="mt-5 font-display text-2xl tracking-tight">AI in the workplace</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  A designer describes using AI for early drafts while protecting the decisions
                  that require judgement.
                </p>

                <div className="mt-5 space-y-3">
                  <SampleTheme title="Everyday leverage" score="92%" />
                  <SampleTheme title="Trust and boundaries" score="78%" />
                  <SampleTheme title="What comes next" score="64%" />
                </div>

                <blockquote className="mt-5 rounded-xl border border-border/70 bg-muted/40 p-4 font-display text-base italic leading-relaxed">
                  “Let AI handle the blank page. Don&apos;t let it make the final call.”
                </blockquote>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
                  <span className="text-muted-foreground">Overall tone</span>
                  <Badge variant="positive">Optimistic, with caveats</Badge>
                </div>
              </Card>
              <div className="absolute -right-3 -top-5 rotate-3 rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-soft sm:-right-6">
                <span className="inline-flex items-center gap-1.5">
                  <Quote className="size-3.5 text-primary" />
                  Exact quotes, kept
                </span>
              </div>
            </div>

            <div>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Beyond a chatbot
              </p>
              <h2 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
                Structured questions.
                <br />
                Grounded summaries.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                The question plan is designed before the conversation begins. The summary is
                written afterwards, anchored to what you said, and checked by a local analysis pass.
              </p>

              <ul className="mt-7 space-y-3.5">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 border-t border-border/60 pt-6">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Bring your own model
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PROVIDERS.map((provider) => (
                    <span
                      key={provider}
                      className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {provider}
                    </span>
                  ))}
                  <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                    + any OpenAI-compatible API
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <RecentInterviewsSection />

        <section className="container pb-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-primary px-6 py-12 text-primary-foreground shadow-lift sm:px-12">
            <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full border border-primary-foreground/10" />
            <div className="pointer-events-none absolute -bottom-24 right-24 size-72 rounded-full border border-primary-foreground/10" />
            <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                  Ready when you are.
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/75">
                  One topic. A few good questions. A clearer picture of what you think.
                </p>
              </div>
              <Button asChild size="lg" variant="secondary" className="group shrink-0">
                <a href="#start">
                  Start an interview
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function SampleTheme({ title, score }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">{title}</span>
        <span className="tabular-nums text-muted-foreground">{score}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: score }}
        />
      </div>
    </div>
  );
}
