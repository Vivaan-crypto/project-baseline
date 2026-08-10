import { FEATURES, type Snapshot } from "@/app/dashboard/_lib/data";
import { Card, CardHead } from "./ui";

const HEAT = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
] as const;

/**
 * Rhythm Map: weekday x hour intensity across all loaded history.
 *
 * Unlike every other panel this one is not per-day — it is the backdrop a
 * single day gets read against. The selected day's weekday row is outlined
 * so the day above can be located inside the pattern.
 */
export function Rhythm({
  rhythm,
  highlightWeekday,
  dayCount,
  bare = false,
}: {
  rhythm: Snapshot["rhythm"];
  highlightWeekday: string;
  dayCount: number;
  bare?: boolean;
}) {
  const legend = (
    <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
      Less
      {HEAT.map((color) => (
        <span
          key={color}
          className="h-2.5 w-2.5 border border-border"
          style={{ backgroundColor: color }}
        />
      ))}
      More
    </span>
  );

  const body = (
    <div className="overflow-x-auto p-6">
      <div className="min-w-[34rem]">
        <div className="flex">
          <div className="w-10 shrink-0" />
          <div className="flex flex-1 gap-px">
            {rhythm.hours.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center font-mono text-[9px] leading-4 text-muted"
              >
                {hour % 6 === 0 ? hour : ""}
              </div>
            ))}
          </div>
        </div>

        {rhythm.days.map((label, dayIndex) => {
          const isHighlighted = label === highlightWeekday;
          return (
            <div key={label} className="flex items-center">
              <div
                className={`w-10 shrink-0 pr-2 text-right font-mono text-[10px] ${
                  isHighlighted ? "font-bold text-foreground" : "text-muted"
                }`}
              >
                {label}
              </div>
              <div
                className={`flex flex-1 gap-px py-px ${
                  isHighlighted ? "outline-2 outline-offset-1 outline-cobalt" : ""
                }`}
              >
                {rhythm.hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-5 flex-1"
                    style={{
                      backgroundColor:
                        HEAT[
                          Math.min(
                            4,
                            Math.max(0, rhythm.grid[dayIndex]?.[hour] ?? 0),
                          )
                        ],
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* When bare, the surrounding Disclosure owns the header, so the
          legend has nowhere to sit up there and moves under the grid. */}
      {bare && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] text-muted">
            Across {dayCount} days. Fills in as you go.
          </span>
          {legend}
        </div>
      )}
    </div>
  );

  if (bare) return body;

  return (
    <Card>
      <CardHead
        label={FEATURES.rhythm.name}
        tier="paid"
        hint={`${FEATURES.rhythm.question} Across ${dayCount} days — fills in as you go.`}
        right={legend}
      />
      {body}
    </Card>
  );
}
