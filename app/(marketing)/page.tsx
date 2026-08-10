import type { ReactNode } from "react";
import { SignupForm } from "@/app/_components/signup-form";
import { RhythmMap } from "@/app/_components/rhythm-map";
import { TierDiagram } from "@/app/_components/tier-diagram";

const FREE_FEATURES = [
  {
    name: "Activity",
    description:
      "Where your time actually went, broken down by app and by site.",
  },
  {
    name: "Trace",
    description:
      "A timeline of your day in blocks. What you were in, for how long, and where it broke.",
  },
] as const;

const PAID_FEATURES = [
  {
    name: "Bedrock",
    headline: "Bedrock: 12 minutes, 10:15–10:27, Code.exe.",
    subtitle:
      "Your single longest unbroken block of real focus that day — the solid layer under everything else.",
  },
  {
    name: "Residue",
    headline: "That standup left 14 minutes of residue.",
    subtitle:
      "After an interruption, how long it takes you to get back into a sustained block.",
  },
  {
    name: "Core",
    headline: "38% core.",
    subtitle:
      "The share of your active day that held together in blocks of 25 minutes or more.",
  },
] as const;

const CAPTURED = [
  "Key event timestamps, plus a coarse class: character, correction, navigation, modifier, space, enter.",
  "Mouse event timestamps and kind: click, move, scroll.",
  "The active window's process name and title.",
  "Five-minute rollups: active seconds, key counts, inter-key delay and its variation, window switches.",
] as const;

const NEVER_CAPTURED = [
  "The characters you type. We keep the class of key, never the key itself.",
  "Your screen. Baseline doesn't take screenshots, locally or otherwise.",
  "Clipboard contents, file contents, or network traffic.",
  "Your typing pattern as an identity. It's never used to recognise or authenticate you.",
  "Anything on a server. Raw data does not leave the machine, so there is nothing to breach.",
] as const;

const COMPARISON = [
  {
    question: "Where did the time go?",
    tracker: "Answers it",
    baseline: "Activity — free here too",
  },
  {
    question: "Did focus come in one piece or ten?",
    tracker: "Not measured",
    baseline: "Fragments",
  },
  {
    question: "What was your best stretch today?",
    tracker: "Not measured",
    baseline: "Bedrock",
  },
  {
    question: "What did that meeting actually cost you?",
    tracker: "Doesn't track it",
    baseline: "Residue",
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 sm:px-8">
      {/* 1 — Hero */}
      <section className="py-20 sm:py-28">
        <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted">
          Version 1
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          It learns how you normally work, then tells you when you&rsquo;ve
          drifted from it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Baseline reads the rhythm of your keyboard, mouse, and window focus.
          Fragments tells you your focus came in eleven pieces today, longest
          block nine minutes — no time tracker does that. Activity and Trace
          are free, forever. Bedrock, Residue, Core, and Rhythm Map round out
          the rest. Drift, the two-week comparison against your own normal,
          is next.
        </p>
        <div className="mt-9">
          <SignupForm location="hero" />
        </div>
      </section>

      {/* 1a — What's free vs. what's paid, before any of the detail below.
              It's the first thing anyone wants to know about a paid product,
              and it was previously only inferable by reading four sections. */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="What you get">
          Two things free, five things paid
        </SectionHeading>
        <TierDiagram />
      </section>

      {/* 2 — Free forever */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Free, forever">
          Table stakes, not a hook
        </SectionHeading>
        <p className="mb-8 max-w-2xl text-muted">
          Activity and Trace are free forever, not a trial and not a tease.
          Every time tracker gives these away — ActivityWatch, RescueTime,
          Toggl, Clockify. Charging for them here would just invite a
          comparison Baseline loses.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {FREE_FEATURES.map((feature) => (
            <div
              key={feature.name}
              className="border-[3px] border-border bg-white p-6 shadow-[var(--shadow-lg)]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">{feature.name}</h3>
                <FreeBadge />
              </div>
              <p className="text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — Fragments, headlined */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="The one thing nothing else does">
          Fragments
        </SectionHeading>
        <div className="border-[3px] border-border bg-white p-8 shadow-[var(--shadow-lg)]">
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
            Every tracker reports total focus time. None of them tell you
            whether it arrived in chunks or shards.
          </p>
          <div className="mt-6">
            <IncludedBadge />
          </div>
        </div>
      </section>

      {/* 4 — Bedrock, Residue, Core */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Paid">
          The rest of what held the day together
        </SectionHeading>
        <div className="grid gap-6 sm:grid-cols-3">
          {PAID_FEATURES.map((feature) => (
            <div
              key={feature.name}
              className="border-[3px] border-border bg-white p-6 shadow-[var(--shadow-lg)]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">{feature.name}</h3>
                <IncludedBadge />
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {feature.headline}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {feature.subtitle}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 — What it sees vs. what it never sees */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Capture">
          What it sees. What it never sees.
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
        <p className="mt-10 max-w-2xl text-sm leading-relaxed">
          If a feature ever needs the actual key you pressed, the feature is
          designed wrong. The collector is AGPL-licensed and public, so you can
          read the capture path yourself rather than take this on trust.
        </p>
      </section>

      {/* 6 — Why not a time tracker */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Positioning">
          Why this isn&rsquo;t a time tracker
        </SectionHeading>
        <p className="mb-8 max-w-2xl text-muted">
          Time tracking is commoditised and free. Baseline includes it anyway,
          because the app would feel stripped without it. But a total
          isn&rsquo;t a reference point. It tells you where the hours went, not
          whether the day itself was normal for you.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 pr-4 font-medium text-muted">Question</th>
                <th className="py-3 pr-4 font-medium text-muted">
                  A time tracker
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

        <p className="mt-8 max-w-2xl text-base">
          A time tracker just clocks your hours. Baseline tells you whether the
          day actually looked like you.
        </p>
      </section>

      {/* 7 — Rhythm Map (paid, ships ungated from day one) */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Paid">
          When you actually sustain work
        </SectionHeading>
        <p className="mb-8 max-w-2xl text-muted">
          Thirty days of your own history, weekday by hour. Most people think
          they&rsquo;re sharpest at 9am and the chart says 4pm. When a day
          feels wrong, this is what it looked wrong against. It fills in as
          you go — even your first session shows something, it just gets
          sharper with time.
        </p>
        <RhythmMap />
        <div className="mt-6">
          <IncludedBadge />
        </div>
      </section>

      {/* 8 — Honest status */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Status">Where this actually is</SectionHeading>
        <div className="border-[3px] border-border bg-white p-6 shadow-[var(--shadow-lg)] sm:p-7">
          <dl className="space-y-4 text-sm">
            <div className="sm:flex sm:gap-6">
              <dt className="mb-1 w-40 shrink-0 font-mono text-xs uppercase tracking-wide text-muted sm:mb-0">
                Stage
              </dt>
              <dd className="leading-relaxed">
                v1. This is the first real release, not a prototype anymore.
                Whether it holds up on anyone&rsquo;s data but mine is still
                up in the air.
              </dd>
            </div>
            <div className="sm:flex sm:gap-6">
              <dt className="mb-1 w-40 shrink-0 font-mono text-xs uppercase tracking-wide text-muted sm:mb-0">
                Day one
              </dt>
              <dd className="leading-relaxed">
                Activity, Trace, and Fragments work from your first session.
                Bedrock, Residue, and Core are close behind. Rhythm Map fills
                in as you go — even day one shows something.
              </dd>
            </div>
            <div className="sm:flex sm:gap-6">
              <dt className="mb-1 w-40 shrink-0 font-mono text-xs uppercase tracking-wide text-muted sm:mb-0">
                Cost
              </dt>
              <dd className="leading-relaxed">
                Activity and Trace: free, forever. Fragments, Bedrock,
                Residue, Core, and Rhythm Map: free 7-day trial, no card.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-xs text-muted">
        <p>
          Baseline finds anomalies against your own history. It runs on your
          machine.
        </p>
      </footer>
    </main>
  );
}
