import type { ReactNode } from "react";

/**
 * Shared shells for the dashboard. Every surface here is the brand kit's
 * card: 3px hard border, hard offset shadow, no radius, no blur.
 */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border-[3px] border-border bg-card shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHead({
  label,
  tier,
  hint,
  right,
}: {
  label: string;
  tier?: "paid" | "free";
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b-[3px] border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">
          {label}
        </h2>
        {tier && <TierBadge tier={tier} />}
      </div>
      {right}
      {hint && (
        <p className="w-full text-[12px] leading-snug text-muted">{hint}</p>
      )}
    </header>
  );
}

export function TierBadge({ tier }: { tier: "paid" | "free" }) {
  return (
    <span
      className={`border-2 border-border px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wide ${
        tier === "free" ? "bg-lime text-on-lime" : "text-muted"
      }`}
    >
      {tier === "free" ? "Free" : "Paid"}
    </span>
  );
}

/**
 * A headline number. `context` is the line under it that says what the
 * number means relative to the rest of the data — a number with nothing to
 * compare it against is the exact failure mode Baseline is arguing against,
 * so the slot is required rather than optional.
 */
export function Stat({
  label,
  value,
  unit,
  context,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  context: ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <Card className="p-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-mono text-4xl font-bold leading-none tabular-nums ${
            tone === "muted" ? "text-muted" : ""
          }`}
        >
          {value}
        </span>
        {unit && (
          <span className="font-mono text-sm text-muted">{unit}</span>
        )}
      </p>
      <div className="mt-2 text-[12px] leading-snug text-muted">{context}</div>
    </Card>
  );
}

/** Marks a number as absent rather than zero — the distinction matters
 *  everywhere in this app (see Residue's unsettled handling). */
export function NoData({ children }: { children: ReactNode }) {
  return <p className="p-4 text-[13px] italic text-muted">{children}</p>;
}
