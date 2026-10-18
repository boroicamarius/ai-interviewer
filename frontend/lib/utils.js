import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(value, options = {}) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 1) return "<1s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  if (minutes < 60) return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function truncate(value, max = 120) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function summaryToText(interview) {
  if (!interview?.summary) return "";
  const { summary, topic } = interview;
  const lines = [
    `AI Interviewer — ${topic}`,
    `Tone: ${summary.sentiment?.label ?? "neutral"} (${summary.sentiment?.score ?? 0})`,
    "",
    summary.overview,
  ];

  if (summary.themes?.length) {
    lines.push("", "Themes:");
    summary.themes.forEach((theme) => {
      lines.push(`• ${theme.title}: ${theme.insight}`);
    });
  }
  if (summary.key_points?.length) {
    lines.push("", "Key points:");
    summary.key_points.forEach((point) => lines.push(`• ${point}`));
  }
  if (summary.notable_quote) {
    lines.push("", `“${summary.notable_quote}”`);
  }
  return lines.join("\n");
}
