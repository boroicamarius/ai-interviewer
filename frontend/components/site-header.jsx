import Link from "next/link";
import { History, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Logo href="/" />

        <nav className="hidden items-center gap-0.5 sm:flex" aria-label="Main navigation">
          <Button asChild variant="ghost" size="sm">
            <Link href="/#how-it-works">How it works</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/interviews">Past interviews</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Past interviews"
          >
            <Link href="/interviews">
              <History />
            </Link>
          </Button>
          <ThemeToggle />
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/#start">
              <Sparkles className="size-3.5" />
              <span className="hidden xs:inline">New interview</span>
              <span className="xs:hidden">New</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
