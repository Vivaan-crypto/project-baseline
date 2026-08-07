"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_COLOR,
  fmtClock,
  fmtDuration,
  type Day,
  type TraceEntry,
} from "@/app/dashboard/_lib/data";
import { Card, CardHead, NoData } from "./ui";

/**
 * The day as a timeline. Blocks are positioned by real clock time, so the
 * empty stretches are as legible as the full ones — a day of six blocks
 * spread over twelve hours has to look different from six blocks back to
 * back, which is precisely what a bar-chart-of-durations would hide.
 */
export function Trace({ day }: { day: Day }) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Bound the axis to the day's actual activity, rounded out to whole
  // hours, rather than always drawing a full 24h. Most of a real day is
  // asleep; showing all of it would squeeze the working hours into a third
  // of the width and waste the rest on nothing.
  const { from, to, ticks } = useMemo(() => {
    if (day.trace.length === 0) return { from: 0, to: 1440, ticks: [] };
    const lo = Math.floor(Math.min(...day.trace.map((e) => e.startMin)) / 60) * 60;
    const hi = Math.ceil(Math.max(...day.trace.map((e) => e.endMin)) / 60) * 60;
    const span = Math.max(hi - lo, 60);
    // Aim for ~8 labelled hours regardless of how long the day ran.
    const step = Math.max(1, Math.round(span / 60 / 8)) * 60;
    const out: number[] = [];
    for (let t = lo; t <= hi; t += step) out.push(t);
    return { from: lo, to: lo + span, ticks: out };
  }, [day.trace]);

  const span = to - from;
  const pct = (minutes: number) => ((minutes - from) / span) * 100;

  const active = hovered === null ? null : day.trace[hovered];

  if (day.trace.length === 0) {
    return (
      <Card>
        <CardHead label="Trace" tier="free" />
        <NoData>No activity recorded on this day.</NoData>
      </Card>
    );
  }

  return (
    <Card>
      <CardHead
        label="Trace"
        tier="free"
        hint="Your day in blocks, on a real clock. Gaps are stretches with no input at all — not just a change of app."
        right={<Legend />}
      />

      <div className="p-4">
        <div
          className="relative h-20 border-[3px] border-border bg-background"
          onMouseLeave={() => setHovered(null)}
        >
          {day.trace.map((entry, i) => (
            <TraceBar
              key={`${entry.kind}-${entry.startMin}-${i}`}
              entry={entry}
              left={pct(entry.startMin)}
              width={pct(entry.endMin) - pct(entry.startMin)}
              dimmed={hovered !== null && hovered !== i}
              onEnter={() => setHovered(i)}
            />
          ))}
        </div>

        {/* Hour axis */}
        <div className="relative mt-1 h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2 font-mono text-[10px] text-muted"
              style={{ left: `${Math.min(100, Math.max(0, pct(t)))}%` }}
            >
              {fmtClock(t)}
            </span>
          ))}
        </div>

        {/* Fixed readout rather than a floating tooltip: it can't overflow
            the card, it doesn't jump under the cursor, and it works on
            touch where hover doesn't exist at all. */}
        <div className="mt-3 border-t-[3px] border-border pt-3 font-mono text-[12px]">
          {active ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className="inline-block h-3 w-3 border-2 border-border"
                style={{
                  backgroundColor: active.category
                    ? CATEGORY_COLOR[active.category]
                    : "transparent",
                }}
              />
              <span className="font-bold">
                {active.kind === "away"
                  ? "Away"
                  : (active.topProcess ?? "unknown")}
              </span>
              <span className="text-muted">
                {fmtClock(active.startMin)}–{fmtClock(active.endMin)}
              </span>
              <span className="font-bold">{fmtDuration(active.durationSecs)}</span>
              {active.category && (
                <span className="text-muted">{active.category}</span>
              )}
              {active.openEnded && (
                <span className="text-muted">still open at end of data</span>
              )}
            </span>
          ) : (
            <span className="text-muted">
              Hover a block for detail. {day.trace.filter((e) => e.kind === "block").length} blocks,{" "}
              {day.trace.filter((e) => e.kind === "away").length} breaks.
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function TraceBar({
  entry,
  left,
  width,
  dimmed,
  onEnter,
}: {
  entry: TraceEntry;
  left: number;
  width: number;
  dimmed: boolean;
  onEnter: () => void;
}) {
  const isAway = entry.kind === "away";
  return (
    <div
      onMouseEnter={onEnter}
      className="absolute inset-y-0 cursor-default transition-opacity"
      style={{
        left: `${left}%`,
        // Floor the rendered width so a 40-second block is still a visible
        // sliver rather than a sub-pixel nothing. Fragments' entire claim is
        // that the short pieces are the story; dropping them below the
        // rendering threshold would quietly contradict it.
        width: `max(2px, ${width}%)`,
        opacity: dimmed ? 0.35 : 1,
        transitionDuration: "var(--dur-reveal)",
        backgroundColor: isAway
          ? "transparent"
          : CATEGORY_COLOR[entry.category ?? "background"],
        backgroundImage: isAway
          ? "repeating-linear-gradient(45deg, var(--border) 0 1px, transparent 1px 6px)"
          : undefined,
      }}
    />
  );
}

function Legend() {
  const items: Array<[string, string]> = [
    ["focus", CATEGORY_COLOR.focus],
    ["mixed", CATEGORY_COLOR.mixed],
    ["comms", CATEGORY_COLOR.comms],
    ["background", CATEGORY_COLOR.background],
  ];
  return (
    <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted">
      {items.map(([name, color]) => (
        <span key={name} className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 border border-border"
            style={{ backgroundColor: color }}
          />
          {name}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span
          className="inline-block h-2.5 w-2.5 border border-border"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--border) 0 1px, transparent 1px 4px)",
          }}
        />
        away
      </span>
    </span>
  );
}
