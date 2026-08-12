import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { THEME_INIT_SCRIPT } from "@/app/_components/theme";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const TITLE = "Baseline — it learns how you normally work";
const DESCRIPTION =
  "Baseline reads the rhythm of your keyboard, mouse, and window focus. Your focus came in eleven pieces today, longest block nine minutes — that's the kind of thing it tells you. Activity and Trace are free forever. Runs entirely on your machine.";

export const metadata: Metadata = {
  // TODO: point at the real domain once it's registered. Wrong value here only
  // affects absolute URLs in OG tags, not rendering.
  metadataBase: new URL("https://baseline.local"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Runs before first paint so the correct theme is already on <html>
          when the page renders — otherwise a dark-theme user gets a flash of
          the light background on every navigation. It has to be inline and
          synchronous for that; a React effect runs far too late.

          suppressHydrationWarning above is required and specific: this
          script mutates <html> before React hydrates, so the server's markup
          and the client's differ on that one attribute by design.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {/* Cookieless, no visitor identifiers, and a no-op in development. */}
        <Analytics />
        {/*
          Core Web Vitals (LCP, CLS, INP) measured on real visits rather than a
          synthetic lab run. The `/next` entrypoint reports the App Router route
          pattern instead of the raw URL, so samples aggregate per page.

          Same privacy shape as <Analytics /> above, and the same reason it's
          allowed here at all (AGENTS.md §3.1, §4): this measures how fast the
          marketing site paints in a visitor's browser. It has no connection to
          captured event data — that never leaves the device.
        */}
        <SpeedInsights />
      </body>
    </html>
  );
}
