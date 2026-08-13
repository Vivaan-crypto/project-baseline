import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/app/_components/marketing-header";
import { SignupForm } from "@/app/_components/signup-form";
import { RhythmMap } from "@/app/_components/rhythm-map";
import { TierDiagram } from "@/app/_components/tier-diagram";

const FREE_FEATURES = [
  {
    name: "Activity",
    description:
      "A clear breakdown of exactly where your active time went, per app and site.",
  },
  {
    name: "Trace",
    description:
      "A visual timeline mapping how your focus shifted across the day, block by block.",
  },
] as const;

const PAID_FEATURES = [
  {
    name: "Bedrock",
    headline: "Bedrock: 12 minutes, 10:15–10:27, Code.exe.",
    subtitle:
      "Pinpoints your single longest stretch of uninterrupted deep work — the solid layer under everything else.",
  },
  {
    name: "Residue",
    headline: "That standup left 14 minutes of residue.",
    subtitle:
      "Measures the hidden recovery time lost every time you get interrupted.",
  },
  {
    name: "Core",
    headline: "38% core.",
    subtitle:
      "The percentage of your active day spent in solid, unbroken 25+ minute focus blocks.",
  },
] as const;

const CAPTURED = [
  "Keyboard and mouse interaction timing (clicks, scrolls, movement).",
  "Active window and application process names.",
  "Five-minute local activity rollups: active seconds, key counts, and window switches.",
  "Data processed strictly on your local machine.",
] as const;

const NEVER_CAPTURED = [
  "The actual letters or words you type. We never log keystroke content.",
  "Screenshots or screen recordings. Your visual workspace remains entirely private.",
  "Clipboard contents, personal files, or network traffic.",
  "Cloud servers. Your raw data never leaves your device, so there is nothing to breach.",
] as const;

const COMPARISON = [
  {
    question: "Where did the hours go?",
    tracker: "Logs totals per app",
    baseline: "App & site activity breakdown",
  },
  {
    question: "Was my focus fragmented?",
    tracker: "Not measured",
    baseline: "Fragments",
  },
  {
    question: "What was my longest deep work run?",
    tracker: "Not measured",
    baseline: "Bedrock",
  },
  {
    question: "What did that quick meeting actually cost me?",
    tracker: "Logs meeting length only",
    baseline: "Residue (Measures recovery lag)",
  },
  {
    question: "When am I naturally most productive?",
    tracker: "Not measured",
    baseline: "Rhythm Map",
  },
] as const;

function SectionHeading({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-cobalt">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {children}
      </h2>
    </header>
  );
}

function FreeBadge() {
  return (
    <span className="shrink-0 border-[3px] border-on-lime bg-lime px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-on-lime">
      Free forever
    </span>
  );
}

function IncludedBadge() {
  return (
    <span className="shrink-0 border-[3px] border-on-lime bg-lime px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-on-lime">
      Included
    </span>
  );
}

export default function Home() {
  return (
    <>
      {/* The public header used to come from app/(marketing)/layout.tsx. It is
          rendered per page now so the policy page can put a Back link opposite
          the wordmark; a layout cannot vary by which child it wraps. Nothing in
          the right-hand slot here — there is nowhere to go back to from the
          root. */}
      <MarketingHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 sm:px-8">
        {/* 1 — Hero */}
        <section className="py-20 sm:py-28">
          <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted">
            Baseline for Windows
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            You were online for 8 hours today. How much of it was productive?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Baseline reads the natural cadence of your work to show you how
            fragmented your attention was. Track continuous focus runs, context
            switches, and recovery time—all without invasive screenshots or
            keylogging. Protect your attention, don't just clock your hours.
          </p>
          <div className="mt-9">
            <SignupForm location="hero" />
          </div>
        </section>

        {/* 5 — Why not a time tracker */}
        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading eyebrow="The Difference">
            Built for focus, not just time tracking
          </SectionHeading>
          <p className="mb-8 max-w-2xl text-muted">
            Stop counting hours and start protecting your focus. Traditional
            tools log where your time went, but Baseline tells you the
            structural health of your workday.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-136 border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-3 pr-4 font-medium text-muted">
                    What you want to know
                  </th>
                  <th className="py-3 pr-4 font-medium text-muted">
                    Traditional App Logs
                  </th>
                  <th className="py-3 font-medium text-muted">Baseline</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.question} className="border-b border-border">
                    <td className="py-3.5 pr-4 align-top">{row.question}</td>
                    <td className="py-3.5 pr-4 align-top text-muted">
                      {row.tracker}
                    </td>
                    <td className="py-3.5 align-top font-bold text-cobalt">
                      {row.baseline}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>  

        {/* 3 — Fragments, headlined */}
        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading eyebrow="Fragments">
            Did your day come in blocks or shards?
          </SectionHeading>
          <div className="border-[3px] border-border bg-white p-8 shadow-(--shadow-lg)">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-5xl font-bold tabular-nums sm:text-6xl">
                11
              </span>
              <span className="text-lg text-muted">pieces today</span>
            </div>
            <p className="mt-2 font-mono text-sm text-muted">
              Longest block: nine minutes.
            </p>
            <p className="mt-6 max-w-xl text-base leading-relaxed">
              Most tools just total up your screen time. Baseline looks deeper
              into your rhythm: did you get a solid two-hour stretch of flow, or
              did constant tab-switching shatter your morning into 11 less
              productive fragments?
            </p>
            <div className="mt-6">
              <IncludedBadge />
            </div>
          </div>
        </section>

        {/* 4 — What it sees vs. what it never sees */}
        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading eyebrow="Privacy By Design">
            Your data stays on your machine. Period.
          </SectionHeading>
          <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <span aria-hidden="true" className="text-cobalt">
                  ●
                </span>
                Captured
              </h3>
              <ul className="space-y-3.5">
                {CAPTURED.map((item) => (
                  <li
                    key={item}
                    className="border-l-[3px] border-cobalt/50 pl-4 text-sm leading-relaxed text-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <span aria-hidden="true" className="text-negative">
                  ○
                </span>
                Never captured
              </h3>
              <ul className="space-y-3.5">
                {NEVER_CAPTURED.map((item) => (
                  <li
                    key={item}
                    className="border-l-[3px] border-negative/50 pl-4 text-sm leading-relaxed text-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* The section's payoff line, so it gets the card treatment used for
              the Fragments headline rather than sitting as body copy under two
              lists. Cobalt on the leading edge per §14: this is an emphasis
              accent, and the rules directly above already use cobalt the same
              way. Not lime (reserved for action/focus) and not red — a privacy
              guarantee is an intentional absence, not a warning. */}
          <div className="mt-10 border-[3px] border-l-12 border-border border-l-cobalt bg-white p-6 shadow-(--shadow-lg) sm:p-8">
            <p className="max-w-2xl text-base leading-relaxed">
              Baseline monitors rhythm and focus patterns—never your private
              content. Our core collector is AGPL-licensed and open source. You
              don't have to take our word for it; you can inspect the code
              anytime.
            </p>
          </div>
        </section>

        {/* 6 — Rhythm Map */}
        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading eyebrow="Baseline Pro">
            Discover when you actually sustain work
          </SectionHeading>
          <p className="mb-8 max-w-2xl text-muted">
            Most people think they’re sharpest at 9am, but their data says 4pm.
            Baseline builds a 30-day map of your history, weekday by hour, to
            pinpoint your natural flow states. It fills in as you go—even your
            first session shows something, getting sharper with time.
          </p>
          <RhythmMap />
          <div className="mt-6">
            <IncludedBadge />
          </div>
        </section>

        {/* 1a — What's free vs. what's paid */}
        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading eyebrow="Depth Over Duration">
            Focus isn't total hours. It’s unbroken time.
          </SectionHeading>
          <TierDiagram />
        </section>

        {/* 7 — Closing CTA. Tagged `footer` so it stays separable from the hero
          form in the sheet: a signup from down here has read the capture and
          privacy sections first, and one from the hero has not. */}
        <section className="border-t border-border py-16 sm:py-20">
          <SectionHeading eyebrow="Beta list">
            Want it when the build is ready?
          </SectionHeading>
          <p className="mb-8 max-w-xl text-muted">
            One email when there’s something to install. Nothing else.
          </p>
          <SignupForm location="footer" />
        </section>

        <footer className="border-t border-border py-10 text-xs text-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Baseline protects your attention and runs entirely on your local
              machine.
            </p>
            <Link
              href="/privacy"
              className="shrink-0 underline underline-offset-4 hover:text-cobalt"
            >
              Privacy Policy
            </Link>
          </div>
        </footer>
      </main>
    </>
  );
}
