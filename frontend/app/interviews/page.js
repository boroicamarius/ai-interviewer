import { InterviewHistory } from "@/components/interview-history";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Past interviews",
  description: "Your saved interviews, summaries and transcripts.",
};

export default function InterviewsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60 bg-card/30">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="container relative py-12 sm:py-16">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Your archive
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
              Past interviews
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Every conversation is saved as a readable JSON transcript. Revisit a summary, pick up
              an unfinished interview, or clear out old notes.
            </p>
          </div>
        </section>
        <InterviewHistory />
      </main>
      <SiteFooter />
    </>
  );
}
