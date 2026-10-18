"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageSquare, RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import { sentimentMeta, statusMeta } from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/utils";

export function RecentInterviews({ limit = 3 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .listInterviews({ limit })
      .then((data) => {
        if (!active) return;
        setItems(data.items || []);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: Math.min(limit, 3) }).map((_, index) => (
          <Card key={index} className="p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-4 h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col items-start gap-3 border-dashed p-6">
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RotateCw className="size-3.5" />
          Try again
        </Button>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card className="flex flex-col items-start gap-3 border-dashed bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
            <MessageSquare className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">No interviews yet</p>
            <p className="text-sm text-muted-foreground">
              Your next good conversation starts with a topic above.
            </p>
          </div>
        </div>
        <Button asChild variant="soft" size="sm">
          <a href="#start">Start one now</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const status = statusMeta(item.status);
        const sentiment = item.sentiment_label ? sentimentMeta(item.sentiment_label) : null;
        return (
          <Card
            key={item.id}
            className="group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift"
          >
            <Link href={`/interview/${item.id}`} className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
              </div>

              <h3 className="mt-4 font-display text-xl leading-snug tracking-tight transition-colors group-hover:text-primary">
                {item.topic}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {item.summary_preview ||
                  `${item.answered_count} of ${item.question_count} ${pluralize(
                    item.question_count,
                    "question",
                  )} answered`}
              </p>

              <div className="mt-auto flex items-center justify-between pt-5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  {sentiment ? (
                    <span className={`size-1.5 rounded-full ${sentiment.dot}`} aria-hidden="true" />
                  ) : null}
                  {item.persona.name}
                </span>
                <span className="inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                  {item.status === "completed" ? "Read" : "Continue"}
                  <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </Link>
          </Card>
        );
      })}
    </div>
  );
}

export function RecentInterviewsSection() {
  return (
    <section className="container pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your archive
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
            Recent conversations
          </h2>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/interviews">
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <div className="mt-7">
        <RecentInterviews limit={3} />
      </div>
    </section>
  );
}
