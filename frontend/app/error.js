"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container flex flex-1 flex-col items-center justify-center py-24">
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl">Something went sideways.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          An unexpected error interrupted the page. Your saved interviews are safe.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCw className="size-4" />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
