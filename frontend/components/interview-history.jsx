"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Inbox,
  Loader2,
  MessageSquare,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import { sentimentMeta, statusMeta } from "@/lib/constants";
import { formatDate, pluralize } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "completed", label: "Complete" },
  { id: "in_progress", label: "In progress" },
];

export function InterviewHistory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listInterviews({ limit: 100 });
      setItems(data.items || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      completed: items.filter((item) => item.status === "completed").length,
      in_progress: items.filter((item) => item.status === "in_progress").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (query && !item.topic.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, filter, search]);

  async function handleDelete(item) {
    setDeletingId(item.id);
    try {
      await api.deleteInterview(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      toast.success("Interview deleted", { description: item.topic });
    } catch (err) {
      toast.error("Could not delete the interview", { description: errorMessage(err) });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="container py-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-7 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-6 h-px w-full" />
              <Skeleton className="mt-4 h-8 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" />
          </span>
          <h2 className="mt-5 font-display text-2xl">We couldn&apos;t load your interviews.</h2>
          <p className="mt-2 text-sm text-muted-foreground">{errorMessage(error)}</p>
          <Button className="mt-6" onClick={load}>
            <RotateCw className="size-4" />
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container py-16">
        <Card className="mx-auto max-w-xl border-dashed p-10 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="size-6" />
          </span>
          <h2 className="mt-5 font-display text-3xl">Your archive is empty.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Start a short interview on any topic. Your answers and the summary will appear here.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/#start">
              <Sparkles className="size-4" />
              Start an interview
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                filter === option.id
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
              <span className="tabular-nums text-[0.65rem] opacity-70">{counts[option.id]}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics…"
            className="pl-10"
            aria-label="Search topics"
          />
        </div>
      </div>

      {filtered.length ? (
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const status = statusMeta(item.status);
            const sentiment = item.sentiment_label ? sentimentMeta(item.sentiment_label) : null;
            const isCompleted = item.status === "completed";
            return (
              <Card
                key={item.id}
                className="group flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lift"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                    {sentiment ? (
                      <Badge variant="outline" className={sentiment.badge}>
                        <span className={`size-1.5 rounded-full ${sentiment.dot}`} />
                        {sentiment.label}
                      </Badge>
                    ) : null}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${item.topic}`}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this interview?</AlertDialogTitle>
                        <AlertDialogDescription>
                          “{item.topic}” and its transcript will be removed from storage. This
                          cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep it</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(item)}>
                          Delete interview
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <Link href={`/interview/${item.id}`} className="mt-3 block rounded-lg">
                  <h2 className="font-display text-2xl leading-snug tracking-tight transition-colors group-hover:text-primary">
                    {item.topic}
                  </h2>
                </Link>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {item.summary_preview ||
                    `${item.answered_count} of ${item.question_count} ${pluralize(
                      item.question_count,
                      "question",
                    )} answered`}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-foreground">
                  <span>{formatDate(item.created_at)}</span>
                  <span className="size-1 rounded-full bg-border" />
                  <span>{item.persona.name}</span>
                  <span className="size-1 rounded-full bg-border" />
                  <span>
                    {item.question_count} {pluralize(item.question_count, "question")}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4">
                  <span className="text-[0.7rem] text-muted-foreground">
                    {isCompleted ? "Summary available" : `${item.answered_count} answered`}
                  </span>
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link href={`/interview/${item.id}`}>
                      {isCompleted ? "Read summary" : "Continue"}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-7 flex flex-col items-center border-dashed p-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <p className="mt-4 text-sm font-medium">No interviews match those filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search or clear the filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setFilter("all");
              setSearch("");
            }}
          >
            Clear filters
          </Button>
        </Card>
      )}

      <div className="mt-10 flex justify-center">
        <Button asChild variant="soft">
          <Link href="/#start">
            <Sparkles className="size-4" />
            Start a new interview
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
