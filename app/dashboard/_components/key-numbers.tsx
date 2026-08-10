import {
  DATA,
  fmtDuration,
  fmtPct,
  median,
  type Day,
} from "@/app/dashboard/_lib/data";

/**
 * Three numbers the verdict sentence doesn't already say. Piece count and
 * longest run are up there, so repeating them here would just make you read
 * the same fact twice.
 */
export function KeyNumbers({ day, all }: { day: Day; all: Day[] }) {
  const medCore = median(
    all.map((d) => d.core.pct).filter((p): p is number => p !== null),
  );
  const topApp = day.activity.byProcess[0];

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Number
        label="Time working"
        value={fmtDuration(day.activeSecs)}
        sub="Breaks don't count"
      />
      <Number
        label="Solid focus"
        value={fmtPct(day.core.pct)}
        // The 25 has to be visible wherever Core is (§8). The number means
        // nothing if you don't know what counts as a long stretch.
        sub={
          medCore === null
            ? `Runs over ${DATA.config.coreMinutes} min`
            : `Runs over ${DATA.config.coreMinutes} min. Usually ${fmtPct(medCore)}.`
        }
      />
      <Number
        label="Top app"
        value={topApp ? topApp.name.replace(/\.exe$/i, "") : "—"}
        sub={
          topApp
            ? `${fmtDuration(topApp.secs)}, ${Math.round(topApp.share * 100)}% of the day`
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
    <div className="border-[3px] border-border bg-card p-6 shadow-[var(--shadow-sm)]">
      <p className="text-[15px] font-bold leading-none">{label}</p>
      <p className="mt-4 truncate font-mono text-[38px] font-bold leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">{sub}</p>
    </div>
  );
}
