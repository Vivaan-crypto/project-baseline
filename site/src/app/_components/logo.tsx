/**
 * Wordmark per brand kit §01: the word sits on its baseline — a lime bar
 * whose height defines the mark's clearspace. Never remove the bar, never
 * round it, never italicize the word.
 */
export function Logo() {
  return (
    <span className="inline-flex flex-col items-start">
      <span className="font-sans text-xl font-bold tracking-tight text-ink">
        BASELINE
      </span>
      <span className="mt-1 h-[3px] w-full bg-lime" aria-hidden="true" />
    </span>
  );
}
