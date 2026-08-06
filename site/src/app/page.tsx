import type { ReactNode } from "react";
import { SignupForm } from "@/app/_components/signup-form";
import { RhythmMap } from "@/app/_components/rhythm-map";

const FEATURES = [
  {
    name: "Fragments",
    description:
      "Your focus came in eleven pieces today. Longest block: nine minutes.",
  },
  {
    name: "Trace",
    description:
      "A timeline of your day, broken into blocks. What you were in, and for how long.",
  },
  {
    name: "Activity",
    description: "Where your time actually went, broken down by app and by site.",
  },
  {
    name: "Switch Rate",
    description: "How many times you switch context, hour by hour.",
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
    baseline: "Activity",
  },
  {
    question: "What did the day actually look like?",
    tracker: "Just a log",
    baseline: "Trace",
  },
  {
    question: "Did focus come in one piece or ten?",
    tracker: "Not measured",
    baseline: "Fragments",
  },
  {
    question: "How often did you get pulled away?",
    tracker: "Doesn't track it",
    baseline: "Switch Rate",
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

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 sm:px-8">
      {/* 1 — Hero */}
      <section className="py-20 sm:py-28">
        <p className="mb-5 font-mono text-xs uppercase tracking-widest text-muted">
          v1 · Windows
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          It learns how you normally work, then tells you when you&rsquo;ve
          drifted from it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Baseline reads the rhythm of your keyboard, mouse, and window focus.
          v1 gives you four ways to see that: Fragments, Trace, Activity, and
          Switch Rate, all working from your first day. Drift, the two-week
          comparison against your own normal, is next.
        </p>
        <div className="mt-9">
          <SignupForm location="hero" />
        </div>
      </section>

      {/* 2 — Roadmap */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="v1">What ships first</SectionHeading>
        <p className="mb-8 max-w-2xl text-muted">
          Four features, working from day one, so you&rsquo;re not waiting on
          two weeks of calibration to see anything. Try them free for a week.
          We won&rsquo;t ask for a card.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.name}
              className="border-[3px] border-ink bg-white p-6 shadow-[8px_8px_0_0_var(--ink)]"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold">{feature.name}</h3>
                <span className="shrink-0 border-[3px] border-ink bg-lime px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
                  Included
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — What it sees vs. what it never sees */}
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

      {/* 4 — Why not a time tracker */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Positioning">
          Why this isn&rsquo;t a time tracker
        </SectionHeading>
        <p className="mb-8 max-w-2xl text-muted">
          Time tracking is commoditised and free. Baseline includes it anyway,
          because the app would feel stripped without it. But a total isn&rsquo;t
          a reference point. It tells you where the hours went, not whether the
          day itself was normal for you.
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

      {/* 5 — Rhythm Map (premium, not part of the trial) */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Premium">
          When you actually sustain work
        </SectionHeading>
        <p className="mb-8 max-w-2xl text-muted">
          Weekday by hour, thirty days deep. Most people are wrong about when
          they actually do their best work. This chart settles it, and it&rsquo;s
          what you&rsquo;ll compare against on the days that feel off. It needs
          more history than a week can give you, so it isn&rsquo;t part of the
          trial. You buy it once, separately.
        </p>
        <RhythmMap />
      </section>

      {/* 6 — Honest status */}
      <section className="border-t border-border py-16 sm:py-20">
        <SectionHeading eyebrow="Status">Where this actually is</SectionHeading>
        <div className="border-[3px] border-ink bg-white p-6 shadow-[8px_8px_0_0_var(--ink)] sm:p-7">
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
                Platform
              </dt>
              <dd className="leading-relaxed">
                Windows 10 and 11 only.
              </dd>
            </div>
            <div className="sm:flex sm:gap-6">
              <dt className="mb-1 w-40 shrink-0 font-mono text-xs uppercase tracking-wide text-muted sm:mb-0">
                Installer
              </dt>
              <dd className="leading-relaxed">
                Unsigned. Windows SmartScreen will warn you and hide the run
                button behind &ldquo;More info&rdquo;. That&rsquo;s expected.
                Code signing costs money, and I&rsquo;d rather spend it once I
                know this is worth building on.
              </dd>
            </div>
            <div className="sm:flex sm:gap-6">
              <dt className="mb-1 w-40 shrink-0 font-mono text-xs uppercase tracking-wide text-muted sm:mb-0">
                Day one
              </dt>
              <dd className="leading-relaxed">
                Fragments, Trace, Activity, and Switch Rate work from your very
                first session. No two-week wait. Rhythm Map, the premium one,
                still wants a few weeks of history before it means much.
              </dd>
            </div>
            <div className="sm:flex sm:gap-6">
              <dt className="mb-1 w-40 shrink-0 font-mono text-xs uppercase tracking-wide text-muted sm:mb-0">
                Cost
              </dt>
              <dd className="leading-relaxed">
                Fragments, Trace, Activity, and Switch Rate: free for 7 days,
                no card needed. Rhythm Map is a one-time purchase on top.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-xs text-muted">
        <p>Baseline finds anomalies against your own history. It runs locally.</p>
      </footer>
    </main>
  );
}
