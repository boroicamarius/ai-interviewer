import Link from "next/link";

import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Logo href="/" />
          <p className="text-xs text-muted-foreground">An exercise in listening well.</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/interviews" className="transition-colors hover:text-foreground">
            Past interviews
          </Link>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-foreground"
          >
            API docs
          </a>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span>FastAPI · Next.js · ChatOpenAI-compatible</span>
        </div>
      </div>
    </footer>
  );
}
