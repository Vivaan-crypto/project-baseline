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
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b-[3px] border-border px-6 py-5">
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl font-bold tracking-tight">{label}</h2>
        {tier && <TierBadge tier={tier} />}
      </div>
      {right}
      {hint && (
        <p className="w-full max-w-2xl text-[14px] leading-relaxed text-muted">
          {hint}
        </p>
      )}
    </header>
  );
}

export function TierBadge({ tier }: { tier: "paid" | "free" }) {
  return (
    <span
      // Free is filled lime so it reads as the thing you already have; paid
      // is a plain outline rather than a warning colour, because it is a
      // category, not a problem. Lime keeps --on-lime for its text since it
      // stays a bright accent in both themes.
      className={`shrink-0 border-2 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] ${
        tier === "free"
          ? "border-on-lime bg-lime text-on-lime"
          : "border-border text-muted"
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
