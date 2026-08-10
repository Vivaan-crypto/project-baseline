import { DATA, fmtDuration } from "@/app/dashboard/_lib/data";

/**
 * Nag about apps nobody has categorised.
 *
 * Untagged apps count toward total active time but toward none of the focus
 * features, so someone whose main tool is untagged sees numbers far worse
 * than reality — one unrecognised app took a test day from 86% core to 53%.
 * Without this, that failure is completely silent: the dashboard just quietly
 * reports a bad number and the reader assumes they had a rough week.
 *
 * Only appears when it actually matters. Under a twentieth of the day is
 * noise, and a permanent banner is one people learn to stop seeing.
 */
const MIN_SHARE = 0.05;

export function UntaggedNotice() {
  const untagged = DATA.untagged ?? [];
  const share = DATA.untaggedShare ?? 0;
  if (untagged.length === 0 || share < MIN_SHARE) return null;

  const top = untagged.slice(0, 4);

  return (
    <section className="border-[3px] border-border bg-card p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-xl font-bold tracking-tight">
        {Math.round(share * 100)}% of your time is in apps Baseline does not
        know
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">
        Untagged apps count toward your total but not toward any of the focus
        numbers, so those are reading low. Tell it which ones are real work and
        they start counting.
      </p>

      <ul className="mt-4 flex flex-wrap gap-2">
        {top.map((app) => (
          <li
            key={app.name}
            className="border-2 border-border px-2.5 py-1 font-mono text-[12px]"
          >
            {app.name}{" "}
            <span className="text-muted">{fmtDuration(app.secs)}</span>
          </li>
        ))}
        {untagged.length > top.length && (
          <li className="px-1 py-1 font-mono text-[12px] text-muted">
            and {untagged.length - top.length} more
          </li>
        )}
      </ul>

      <pre className="mt-4 overflow-x-auto border-[3px] border-border bg-background p-4 font-mono text-[13px]">
        python -m engine.apps list
      </pre>
    </section>
  );
}
