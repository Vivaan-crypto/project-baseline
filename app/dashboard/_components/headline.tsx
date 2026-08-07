import {
  fmtClock,
  fmtDuration,
  fmtPct,
  median,
  type Day,
} from "@/app/dashboard/_lib/data";
import { Stat } from "./ui";

/**
 * The four headline numbers. Each carries a comparison against the user's
 * own median across the loaded history — a bare "38%" is exactly the kind
 * of contextless total the product argues is useless, so no number here
 * ships without something to read it against.
 */
export function Headline({ day, all }: { day: Day; all: Day[] }) {
  const medFragments = median(all.map((d) => d.fragments.count));
  const medBedrock = median(
    all.filter((d) => d.bedrock).map((d) => d.bedrock!.durationSecs),
  );
  const medCore = median(
    all.map((d) => d.core.pct).filter((p): p is number => p !== null),
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat
        label="Fragments"
        value={String(day.fragments.count)}
        unit="pieces"
        context={
          <>
            Longest {fmtDuration(day.fragments.longestMin * 60)}.{" "}
            <Delta value={day.fragments.count} baseline={medFragments} lowerIsBetter />
          </>
        }
      />
      <Stat
        label="Bedrock"
        value={day.bedrock ? fmtDuration(day.bedrock.durationSecs) : "—"}
        context={
          day.bedrock ? (
            <>
              {fmtClock(day.bedrock.startMin)}–{fmtClock(day.bedrock.endMin)},{" "}
              {day.bedrock.topProcess}.{" "}
              <Delta value={day.bedrock.durationSecs} baseline={medBedrock} />
            </>
          ) : (
            "No focus block on this day."
          )
        }
        tone={day.bedrock ? "default" : "muted"}
      />
      <Stat
        label="Core"
        value={fmtPct(day.core.pct)}
        context={
          <>
            {fmtDuration(day.core.qualifyingSecs)} of{" "}
            {fmtDuration(day.core.totalActiveSecs)} active.{" "}
            <Delta
              value={day.core.pct ?? 0}
              baseline={medCore}
              format={(v) => `${Math.round(v * 100)}pp`}
            />
          </>
        }
      />
      <Stat
        label="Residue"
        value={fmtDuration(day.residue.medianSecs)}
        unit={day.residue.medianSecs === null ? undefined : "median"}
        context={
          day.residue.settledCount + day.residue.unsettledCount === 0 ? (
            "No interruptions to measure." /* Not "0 minutes" — nothing happened. */
          ) : (
            <>
              {day.residue.settledCount} settled, {day.residue.unsettledCount}{" "}
              unsettled and excluded.{" "}
              {day.residue.bouncedCount === 0 && day.residue.settledCount > 0 && (
                <span className="text-muted">
                  Every return was clean, so this is the floor, not a measurement.
                </span>
              )}
            </>
          )
        }
        tone={day.residue.medianSecs === null ? "muted" : "default"}
      />
    </div>
  );
}

/**
 * Difference from the user's own median. Deliberately not colour-coded
 * good/bad: AGENTS.md hard rule 4 forbids clinical framing, and a red
 * "worse than usual" badge on a normal Tuesday is exactly that. It states
 * the direction and leaves the judgement to the reader.
 */
function Delta({
  value,
  baseline,
  lowerIsBetter = false,
  format,
}: {
  value: number;
  baseline: number | null;
  lowerIsBetter?: boolean;
  format?: (v: number) => string;
}) {
  if (baseline === null) return null;
  const diff = value - baseline;
  const fmt = format ?? ((v: number) => fmtDuration(Math.abs(v)));
  if (Math.abs(diff) < (format ? 0.005 : 30)) {
    return <span className="text-muted">Typical for you.</span>;
  }
  const word = diff > 0 ? "above" : "below";
  void lowerIsBetter; // direction only — no better/worse claim is made
  return (
    <span className="text-muted">
      {fmt(Math.abs(diff))} {word} your median.
    </span>
  );
}
