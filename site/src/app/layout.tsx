import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Logo } from "@/app/_components/logo";
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
  "Baseline reads the rhythm of your keyboard, mouse, and window focus. v1 gives you four ways to see your day clearly: Fragments, Trace, Activity, and Switch Rate, free for 7 days from the moment you install it. It runs entirely on your machine.";

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
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="mx-auto w-full max-w-4xl px-6 pt-8 sm:px-8">
          <Logo />
        </header>
        {children}
        {/* Cookieless, no visitor identifiers, and a no-op in development. */}
        <Analytics />
      </body>
    </html>
  );
}
