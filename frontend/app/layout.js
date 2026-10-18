import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: {
    default: "AI Interviewer — A thoughtful interview, on any topic",
    template: "%s · AI Interviewer",
  },
  description:
    "Pick a topic. AI Interviewer asks 3–5 well-crafted questions, listens to your answers, and turns them into a clear summary of themes, sentiment and key takeaways.",
  applicationName: "AI Interviewer",
  keywords: ["AI interviewer", "qualitative research", "interview", "summary", "AI Interviewer"],
  openGraph: {
    title: "AI Interviewer — A thoughtful interview, on any topic",
    description:
      "A short, focused AI interview on any topic, followed by a grounded summary of themes, sentiment and key points.",
    type: "website",
    siteName: "AI Interviewer",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Interviewer — A thoughtful interview, on any topic",
    description:
      "A short, focused AI interview on any topic, followed by a grounded summary.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f3" },
    { media: "(prefers-color-scheme: dark)", color: "#111514" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <div className="relative flex min-h-screen flex-col">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
