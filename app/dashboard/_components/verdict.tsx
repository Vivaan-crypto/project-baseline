import { fmtDate, verdict, type Day } from "@/app/dashboard/_lib/data";

/** The day, said plainly. Biggest thing on the page. */
export function Verdict({ day, all }: { day: Day; all: Day[] }) {
  const { shape, comparison } = verdict(day, all);

  return (
    <section className="border-[3px] border-border bg-card px-6 py-9 shadow-[var(--shadow-lg)] sm:px-10 sm:py-12">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        {fmtDate(day.date)}
      </p>
      <p className="mt-5 max-w-3xl text-[26px] font-bold leading-[1.25] tracking-tight sm:text-[38px]">
        {shape}
      </p>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        {comparison}
      </p>
    </section>
  );
}
