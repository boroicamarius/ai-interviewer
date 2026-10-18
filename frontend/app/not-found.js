import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container flex flex-1 flex-col items-center justify-center py-24 text-center">
        <span className="font-display text-8xl leading-none text-primary/20">404</span>
        <span className="mt-6 grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <SearchX className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-4xl tracking-tight">This page wandered off.</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          The interview may have been deleted, or the link might be incomplete. The archive is a
          good place to look next.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/interviews">Past interviews</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
