import {
  FEATURES,
  FRAGMENT_BUCKETS,
  fmtDuration,
  type Day,
} from "@/app/dashboard/_lib/data";
import { Card, CardHead, NoData } from "./ui";

/**
 * Fragments: the distribution of focus-block lengths.
 *
 * The two shortest buckets render in the deviation colour, per AGENTS.md §8
 * ("blocks under 15m rendered in the deviation colour"). That is the single
 * visual point of the chart — a day whose blocks are all in the left two
 * columns is shattered, and no total-focus-time number would show it.
 */
export function Fragments({ day, bare = false }: { day: Day; bare?: boolean }) {
  const counts = FRAGMENT_BUCKETS.map((b) => day.fragments.histogram[b] ?? 0);
  const max = Math.max(...counts, 1);
  const shortCount = counts[0] + counts[1];

  // `bare` drops the card frame and header for use inside a <Disclosure>,
  // which supplies both. Standalone rendering is unchanged.
  const Frame = bare ? Bare : Framed;

  if (day.fragments.count === 0) {
    return (
      <Frame>
        <NoData>No focus blocks today.</NoData>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-1 items-end gap-2" style={{ minHeight: "9rem" }}>
          {FRAGMENT_BUCKETS.map((bucket, i) => {
            const count = counts[i];
            const isShort = i < 2;
            return (
              <div key={bucket} className="flex flex-1 flex-col items-center gap-1">
                <span className="font-mono text-[11px] font-bold tabular-nums">
                  {count > 0 ? count : ""}
                </span>
                <div
                  className="w-full border-[3px] border-border"
                  style={{
                    // Zero-count buckets keep a 3px sliver so the axis reads
                    // as a continuous scale with a gap, not as a missing
                    // category.
                    height: count === 0 ? "3px" : `${(count / max) * 100}%`,
                    minHeight: count === 0 ? "3px" : "0.75rem",
                    backgroundColor: isShort ? "var(--red)" : "var(--cat-focus)",
                  }}
                />
                <span className="font-mono text-[9px] leading-tight text-muted">
                  {bucket}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 border-t-[3px] border-border pt-3 text-[12px] leading-snug text-muted">
          {day.fragments.count} block{day.fragments.count === 1 ? "" : "s"},
          longest {fmtDuration(day.fragments.longestMin * 60)}.{" "}
          {shortCount > 0
            ? `${shortCount} under 15 minutes.`
            : "None under 15 minutes."}
        </p>
      </div>
    </Frame>
  );
}

function Bare({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col">{children}</div>;
}

function Framed({ children }: { children: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <CardHead
        label={FEATURES.fragments.name}
        tier="paid"
        hint="Other trackers give you a total. This shows whether it came in a few long runs or a lot of short ones."
      />
      {children}
    </Card>
  );
}
