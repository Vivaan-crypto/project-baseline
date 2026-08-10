import type { ReactNode } from "react";
import { TierBadge } from "./ui";

/**
 * Collapsed detail. Native details/summary rather than React state: works
 * before hydration, keyboard and screen reader friendly with no ARIA, and
 * find-in-page can open it to reveal a match.
 */
export function Disclosure({
  question,
  label,
  tier,
  children,
  defaultOpen = false,
}: {
  question: string;
  label: string;
  tier?: "free" | "paid";
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-[3px] border-border bg-card shadow-[var(--shadow-sm)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 hover:bg-background [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          {/* The question is the title. The invented name is small print. */}
          <span className="block text-xl font-bold leading-snug tracking-tight">
            {question}
          </span>
          <span className="mt-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {label}
          </span>
        </span>
        {/* Badge sits left of the toggle rather than beside the feature
            name, so the tags line up down the right edge and the whole list
            can be scanned for what's free without reading any of it. */}
        <span className="flex shrink-0 items-center gap-3">
          {tier && <TierBadge tier={tier} />}
          <span
            aria-hidden="true"
            className="border-[3px] border-border px-2.5 py-1 font-mono text-sm font-bold leading-none"
          >
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </span>
      </summary>
      <div className="border-t-[3px] border-border">{children}</div>
    </details>
  );
}
