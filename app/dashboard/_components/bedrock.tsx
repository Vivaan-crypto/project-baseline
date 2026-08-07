import { fmtClock, fmtDuration, type Day } from "@/app/dashboard/_lib/data";
import { Card, CardHead, NoData } from "./ui";

/**
 * Bedrock: the single longest unbroken focus block, with a 14-day sparkline.
 *
 * Days with no focus at all render as a zero-height bar rather than being
 * dropped, so the sparkline's x-axis stays a real calendar. Omitting them
 * would silently compress a fortnight containing a week off into something
 * that looks continuous.
 */
export function Bedrock({ day }: { day: Day }) {
  const spark = day.bedrockSparkline;
  const max = Math.max(...spark, 1);

  return (
    <Card className="flex flex-col">
      <CardHead
        label="Bedrock"
        tier="paid"
        hint="The solid layer under the day — your longest single unbroken stretch of focus."
      />

      {day.bedrock ? (
        <div className="p-4">
          <p className="font-mono text-4xl font-bold leading-none tabular-nums">
            {fmtDuration(day.bedrock.durationSecs)}
          </p>
          <p className="mt-2 font-mono text-[12px] text-muted">
            {fmtClock(day.bedrock.startMin)}–{fmtClock(day.bedrock.endMin)} ·{" "}
            {day.bedrock.topProcess}
          </p>

          <div className="mt-4 border-t-[3px] border-border pt-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
              Last 14 days
            </p>
            <div className="mt-2 flex h-16 items-end gap-1">
              {spark.map((secs, i) => {
                const isToday = i === spark.length - 1;
                return (
                  <div
                    key={i}
                    title={
                      secs > 0 ? fmtDuration(secs) : "No focus block that day"
                    }
                    className="flex-1 border-2 border-border"
                    style={{
                      height: secs === 0 ? "2px" : `${(secs / max) * 100}%`,
                      minHeight: secs === 0 ? "2px" : "0.5rem",
                      backgroundColor: isToday
                        ? "var(--lime)"
                        : "var(--cat-focus)",
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted">
              Peak {fmtDuration(max)} · selected day highlighted
            </p>
          </div>
        </div>
      ) : (
        <NoData>
          No focus block on this day, so there is no bedrock to report. That is
          different from a bedrock of zero.
        </NoData>
      )}
    </Card>
  );
}
