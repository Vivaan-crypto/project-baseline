import { DATA, CATEGORY_COLOR, fmtDuration, type Category } from "@/app/dashboard/_lib/data";

/**
 * What the window-title rules reclassified.
 *
 * An app is too coarse a unit to categorise — a browser is a documentation
 * reader and a television, often in the same minute. Title rules split that
 * apart, and this panel is the audit trail: which rule claimed time, which
 * way, and how much time still falls back to the app's own category.
 *
 * The receipts matter more here than in most panels. A rule silently moving
 * an hour from focus to background is exactly the kind of change that makes
 * someone distrust the whole dashboard when they can't see why a number
 * moved. Patterns are shown, never titles — titles are the most sensitive
 * thing captured and are not exported into this bundle at all.
 */
const MIN_SECS = 300;

export function IntentNotice() {
  const intent = DATA.intent;
  if (!intent || intent.rules.length === 0) return null;

  const rules = intent.rules.filter((r) => r.secs >= MIN_SECS).slice(0, 8);
  if (rules.length === 0) return null;

  const claimed = rules.reduce((sum, r) => sum + r.secs, 0);
  const unmatched = intent.unmatchedSecs ?? 0;

  return (
    <section className="border-[3px] border-border bg-card p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-xl font-bold tracking-tight">
        {fmtDuration(claimed)} was categorised by what was on screen, not just
        which app
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">
        These rules matched your window titles and overrode the app&rsquo;s own
        category for those spans. Everything else &mdash;{" "}
        {fmtDuration(unmatched)} &mdash; was counted by app alone.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {rules.map((rule) => (
          <li
            key={rule.pattern}
            className="flex items-center gap-2 border-2 border-border px-2.5 py-1 font-mono text-[12px]"
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 border border-border"
              style={{
                backgroundColor:
                  CATEGORY_COLOR[rule.category as Category] ??
                  "var(--cat-background)",
              }}
            />
            {rule.pattern}
            <span className="text-muted">
              {rule.category} · {fmtDuration(rule.secs)}
            </span>
          </li>
        ))}
      </ul>

      <pre className="mt-4 overflow-x-auto border-[3px] border-border bg-background p-4 font-mono text-[13px]">
        python -m engine.titles list --db ~/.baseline/events.db
      </pre>
    </section>
  );
}
