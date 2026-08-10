import { fmtDate, verdict, type Day } from "@/app/dashboard/_lib/data";

/**
 * The day, said out loud. The single largest thing on the page.
 *
 * Everything below this is evidence for it. The previous layout opened with
 * four equal-weight stat tiles and left the reader to synthesise a story out
 * of them, which is work the software should be doing — a dashboard that
 * only reports measurements has outsourced its actual job.
 */
export function Verdict({ day, all }: { day: Day; all: Day[] }) {
  const { shape, comparison } = verdict(day, all);

  return (
    <section className="border-[3px] border-border bg-card px-5 py-6 shadow-[var(--shadow-lg)] sm:px-8 sm:py-8">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {fmtDate(day.date)}
      </p>
      <p className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {shape}
      </p>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">
        {comparison}
      </p>
    </section>
  );
}
