import type { ReactNode } from "react";

/**
 * Collapsed detail. Uses native <details>/<summary> rather than React state:
 * it works before hydration, it is keyboard and screen-reader accessible
 * without any ARIA, and browser find-in-page can open it to reveal a match.
 *
 * Nothing is deleted by collapsing — the dense panels are all still one
 * click away. The problem was never that the detail existed, it was that it
 * arrived at the same visual weight as the answer.
 */
export function Disclosure({
  question,
  label,
  children,
  defaultOpen = false,
}: {
  question: string;
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-[3px] border-border bg-card shadow-[var(--shadow-sm)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-background [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          {/* The question leads. The invented name is the small print. */}
          <span className="block text-[15px] font-semibold leading-snug">
            {question}
          </span>
          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {label}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 border-2 border-border px-2 py-0.5 font-mono text-[11px] font-bold leading-none"
        >
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div className="border-t-[3px] border-border">{children}</div>
    </details>
  );
}
