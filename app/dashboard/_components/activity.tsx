import {
  FEATURES,
  CATEGORY_COLOR,
  fmtDuration,
  type Category,
  type Day,
} from "@/app/dashboard/_lib/data";
import { Card, CardHead, NoData } from "./ui";

/**
 * Activity: where the time went, by app.
 *
 * Note the attribution difference this surfaces, which is deliberate and
 * documented in engine/features/activity.py: a two-second flick to Chrome
 * inside a focus block counts as Chrome time here, while Fragments and Core
 * still (correctly) treat that whole span as unbroken focus. Both readings
 * are right for their own question, and the totals reconcile — the category
 * bar below sums to the same active time Core divides by.
 */
export function Activity({ day, bare = false }: { day: Day; bare?: boolean }) {
  // `bare` drops the card frame and header for use inside a <Disclosure>,
  // which supplies both. Standalone rendering is unchanged.
  const Frame = bare ? Bare : Framed;
  const { byProcess, byCategory } = day.activity;

  if (byProcess.length === 0) {
    return (
      <Frame>
        <NoData>No activity recorded on this day.</NoData>
      </Frame>
    );
  }

  return (
    <Frame>

      <div className="p-4">
        {/* Category split as one continuous bar — the shape of the day in a
            single line, before the per-app detail. */}
        <div className="flex h-6 w-full border-[3px] border-border">
          {byCategory.map((entry) => (
            <div
              key={entry.name}
              title={`${entry.name} — ${fmtDuration(entry.secs)}`}
              style={{
                width: `${entry.share * 100}%`,
                backgroundColor:
                  CATEGORY_COLOR[entry.name as Category] ??
                  "var(--cat-background)",
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
          {byCategory.map((entry) => (
            <span key={entry.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 border border-border"
                style={{
                  backgroundColor:
                    CATEGORY_COLOR[entry.name as Category] ??
                    "var(--cat-background)",
                }}
              />
              {entry.name} {Math.round(entry.share * 100)}%
            </span>
          ))}
        </div>

        <ul className="mt-4 space-y-2 border-t-[3px] border-border pt-3">
          {byProcess.slice(0, 7).map((entry) => (
            <li key={entry.name} className="grid grid-cols-[1fr_auto] gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-mono text-[12px]">
                    {entry.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                    {Math.round(entry.share * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full bg-background">
                  <div
                    className="h-full bg-foreground"
                    style={{ width: `${entry.share * 100}%` }}
                  />
                </div>
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums">
                {fmtDuration(entry.secs)}
              </span>
            </li>
          ))}
        </ul>
        {byProcess.length > 7 && (
          <p className="mt-3 font-mono text-[10px] text-muted">
            + {byProcess.length - 7} more app
            {byProcess.length - 7 === 1 ? "" : "s"}
          </p>
        )}
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
        label={FEATURES.activity.name}
        tier="free"
        hint={FEATURES.activity.question}
      />
      {children}
    </Card>
  );
}
