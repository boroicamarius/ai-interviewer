import Link from "next/link";
import { Asterisk } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className, showWordmark = true, href = null }) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Asterisk className="size-4" strokeWidth={2.6} />
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
      </span>
      {showWordmark ? (
        <span className="font-display text-[1.35rem] leading-none tracking-tight">AI Interviewer</span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="AI Interviewer home" className="rounded-full">
        {content}
      </Link>
    );
  }
  return content;
}
