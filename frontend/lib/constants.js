export const FALLBACK_TOPICS = [
  "AI in the workplace",
  "productivity tools",
  "scientific research",
  "the future of education",
  "remote work",
];

export const FALLBACK_PERSONAS = [
  {
    id: "curious-researcher",
    name: "Curious researcher",
    description: "Warm, neutral and genuinely curious. Draws out lived experience.",
  },
  {
    id: "friendly-peer",
    name: "Friendly peer",
    description: "Relaxed and conversational, like a thoughtful colleague over coffee.",
  },
  {
    id: "sharp-analyst",
    name: "Sharp analyst",
    description: "Crisp and direct. Probes assumptions, trade-offs and edge cases.",
  },
];

export const FALLBACK_META = {
  app_name: "AI Interviewer",
  version: "1.0.0",
  environment: "production",
  provider: {
    provider: "mock",
    label: "Built-in demo interviewer",
    model: "ai-interviewer-demo",
    ready: true,
    demo: true,
    local: true,
    detail: "",
  },
  limits: {
    min_questions: 3,
    max_questions: 5,
    default_questions: 4,
    max_answer_chars: 4000,
    max_context_chars: 300,
    topic_max_chars: 160,
  },
  personas: FALLBACK_PERSONAS,
  suggested_topics: FALLBACK_TOPICS,
  default_persona: "curious-researcher",
  analysis_enabled: true,
};

export const SENTIMENT_META = {
  positive: {
    label: "Positive",
    badge: "border-positive/25 bg-positive/10 text-positive",
    bar: "bg-positive",
    dot: "bg-positive",
  },
  negative: {
    label: "Cautious",
    badge: "border-negative/25 bg-negative/10 text-negative",
    bar: "bg-negative",
    dot: "bg-negative",
  },
  neutral: {
    label: "Neutral",
    badge: "border-border bg-muted text-muted-foreground",
    bar: "bg-muted-foreground/60",
    dot: "bg-muted-foreground",
  },
  mixed: {
    label: "Mixed",
    badge: "border-warning/30 bg-warning/10 text-warning",
    bar: "bg-warning",
    dot: "bg-warning",
  },
};

export const STATUS_META = {
  in_progress: {
    label: "In progress",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  completed: {
    label: "Complete",
    className: "border-positive/25 bg-positive/10 text-positive",
  },
};

export function sentimentMeta(label) {
  return SENTIMENT_META[label] || SENTIMENT_META.neutral;
}

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.in_progress;
}
