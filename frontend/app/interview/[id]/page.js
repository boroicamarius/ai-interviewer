import { InterviewRoom } from "@/components/interview-room";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Interview",
  description: "A short, focused conversation with AI Interviewer.",
};

export default function InterviewPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <InterviewRoom />
      </main>
      <SiteFooter />
    </>
  );
}
