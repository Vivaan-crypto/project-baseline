import rhythmData from "@/app/_data/rhythm-map.json";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Intensity grid (0–4), day-major. Generated at dev time by mock/rollup.py
 * from mock/mockgen.py's synthetic event data — see that pair for the model.
 * Swap for the real screenshot once one exists from Vivaan's own data
 * (AGENTS.md §9):
 *
 *   import Image from "next/image";
 *   import rhythmMap from "@/app/_assets/rhythm-map.png";
 *   <Image src={rhythmMap} alt="…" className="border-[3px] border-ink" placeholder="blur" />
 *
 * A static import gives next/image the intrinsic dimensions, so no manual
 * width/height and no layout shift. Delete this whole component with it.
 */
function intensityAt(day: number, hour: number): number {
  const level = rhythmData.grid[day]?.[hour] ?? 0;
  return Math.min(4, Math.max(0, level));
}

const HEAT_VARS = [
  "var(--heat-0)",
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
] as const;

export function RhythmMap() {
  return (
    <figure className="border-[3px] border-ink bg-white p-4 shadow-[8px_8px_0_0_var(--ink)] sm:p-6">
      <div
        className="overflow-x-auto"
        role="img"
        aria-label="Illustrative weekday by hour intensity grid based on simulated activity — not real captured data."
      >
        <div className="min-w-[34rem]">
          <div className="flex">
            <div className="w-9 shrink-0" />
            <div className="flex flex-1 gap-px">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 text-center font-mono text-[9px] leading-4 text-muted"
                >
                  {hour % 6 === 0 ? hour : ""}
                </div>
              ))}
            </div>
          </div>

          {DAYS.map((label, day) => (
            <div key={label} className="flex items-center">
              <div className="w-9 shrink-0 pr-2 text-right font-mono text-[10px] text-muted">
                {label}
              </div>
              <div className="flex flex-1 gap-px py-px">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="h-5 flex-1"
                    style={{
                      backgroundColor:
                        HEAT_VARS[intensityAt(day, hour)],
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span className="border-[3px] border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
          Illustrative — not captured data
        </span>
        <span className="flex items-center gap-1.5 font-mono">
          Less
          {HEAT_VARS.map((color, index) => (
            <span
              key={index}
              className="h-3 w-3"
              style={{ backgroundColor: color }}
            />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
