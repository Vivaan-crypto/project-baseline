import {
  DATA,
  fmtDuration,
  fmtPct,
  median,
  type Day,
} from "@/app/dashboard/_lib/data";

/**
 * Three numbers, each under a plain label. Deliberately NOT the four stat
 * tiles this replaced.
 *
 * Piece count and longest stretch already appear in the verdict above, so
 * repeating them here would be the reader parsing the same fact twice. These
 * three add what the sentence doesn't say: how long you were there, how much
 * of it held, and what it went into.
 */
export function KeyNumbers({ day, all }: { day: Day; all: Day[] }) {
  const medCore = median(
    all.map((d) => d.core.pct).filter((p): p is number => p !== null),
  );
  const topApp = day.activity.byProcess[0];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Number
        label="Time at the machine"
        value={fmtDuration(day.activeSecs)}
        sub="Active, idle excluded"
      />
      <Number
        label="Held together"
        value={fmtPct(day.core.pct)}
        sub={
          // Threshold stated inline, not hidden — AGENTS.md §8 requires the
          // 25 be visible wherever Core is, since the number is meaningless
          // without knowing what counts as "long".
          medCore === null
            ? `In blocks over ${DATA.config.coreMinutes} min`
            : `In blocks over ${DATA.config.coreMinutes} min · usually ${fmtPct(medCore)}`
        }
      />
      <Number
        label="Mostly in"
        value={topApp ? topApp.name.replace(/\.exe$/i, "") : "—"}
        sub={
          topApp
            ? `${fmtDuration(topApp.secs)} · ${Math.round(topApp.share * 100)}% of the day`
            : "Nothing recorded"
        }
      />
    </div>
  );
}

function Number({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border-[3px] border-border bg-card p-4 shadow-[var(--shadow-sm)]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-1.5 truncate font-mono text-3xl font-bold leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-muted">{sub}</p>
    </div>
  );
}
