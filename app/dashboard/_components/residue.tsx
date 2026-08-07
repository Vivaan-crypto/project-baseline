import { fmtClock, fmtDuration, type Day } from "@/app/dashboard/_lib/data";
import { Card, CardHead, NoData } from "./ui";

/**
 * Residue: how long after an interruption before real work resumed.
 *
 * This component deliberately separates two numbers that the spec's single
 * "residue" figure conflates:
 *
 *   residueSecs — time from returning until settled. Has a hard floor of
 *                 the settle window, because "settled" is *defined* as
 *                 having sustained that long. Anyone who comes back and
 *                 simply gets on with it scores exactly the floor.
 *   churnSecs   — time from returning until the block that actually stuck
 *                 began. Zero for a clean return; positive only when they
 *                 bounced.
 *
 * On the 30-day mock set every one of 160 settled interruptions came to
 * exactly the floor and zero churn, which makes residueSecs a constant
 * there. Showing it alone would look like a measurement while carrying no
 * information, so the panel states plainly when that is what happened.
 */
export function Residue({ day }: { day: Day }) {
  const { measurements, medianSecs, settledCount, unsettledCount, bouncedCount } =
    day.residue;
  const sources = Object.entries(day.residue.bySource).sort((a, b) => b[1] - a[1]);

  if (measurements.length === 0) {
    return (
      <Card>
        <CardHead label="Residue" tier="paid" />
        <NoData>
          No interruptions on this day — nothing left a mark to measure.
        </NoData>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHead
        label="Residue"
        tier="paid"
        hint="After being pulled away, how long until work actually resumed."
      />

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
              Median
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums">
              {fmtDuration(medianSecs)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
              Bounced returns
            </p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums">
              {bouncedCount}
              <span className="text-base font-normal text-muted">
                /{settledCount}
              </span>
            </p>
          </div>
        </div>

        {bouncedCount === 0 && settledCount > 0 && (
          <p className="mt-3 border-[3px] border-border bg-background p-3 text-[12px] leading-snug text-muted">
            Every return on this day was clean — back to the same app and
            straight into a sustained block. That makes the median exactly the
            settle window, which is the floor of this measurement rather than
            a reading taken from it.
          </p>
        )}

        {unsettledCount > 0 && (
          <p className="mt-3 text-[12px] leading-snug text-muted">
            {unsettledCount} interruption{unsettledCount === 1 ? "" : "s"} never
            settled and {unsettledCount === 1 ? "is" : "are"} excluded from the
            median entirely — not counted as zero.
          </p>
        )}

        {sources.length > 0 && (
          <div className="mt-4 border-t-[3px] border-border pt-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
              By source
            </p>
            <ul className="mt-2 space-y-1">
              {sources.map(([name, secs]) => (
                <li
                  key={name}
                  className="flex items-baseline justify-between gap-2 font-mono text-[12px]"
                >
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 font-bold tabular-nums">
                    {fmtDuration(secs)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="mt-4 space-y-1 border-t-[3px] border-border pt-3">
          {measurements.map((m, i) => (
            <li
              key={`${m.returnMin}-${i}`}
              className="flex items-baseline justify-between gap-2 font-mono text-[11px]"
            >
              <span className="text-muted">{fmtClock(m.returnMin)}</span>
              <span className="min-w-0 flex-1 truncate">{m.source ?? "—"}</span>
              {m.settled ? (
                <span className="shrink-0 tabular-nums">
                  {fmtDuration(m.residueSecs)}
                  {(m.churnSecs ?? 0) > 0 && (
                    <span className="text-muted">
                      {" "}
                      ({fmtDuration(m.churnSecs)} churn)
                    </span>
                  )}
                </span>
              ) : (
                <span className="shrink-0 italic text-muted">unsettled</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
