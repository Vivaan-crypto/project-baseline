/**
 * Free vs paid, in one glance.
 *
 * The split is otherwise spread across four sections of the page, so a
 * reader has to assemble it themselves to answer the first question anyone
 * has about a paid product: what do I get for nothing, and what am I paying
 * for? This sits right under the hero and answers it.
 *
 * The point the layout is making is the widths. Two free features against
 * five paid ones, with the free side deliberately not looking crippled,
 * because it isn't: it's exactly what every competitor also gives away.
 */

const FREE = [
  { name: "Activity", what: "Time by app" },
  { name: "Trace", what: "Your day on a clock" },
] as const;

const PAID = [
  { name: "Fragments", what: "How broken up focus was" },
  { name: "Bedrock", what: "Longest unbroken run" },
  { name: "Residue", what: "What interruptions cost" },
  { name: "Core", what: "How much held together" },
  { name: "Rhythm map", what: "When you work best" },
] as const;

export function TierDiagram() {
  return (
    <div className="border-[3px] border-border bg-card shadow-[var(--shadow-lg)]">
      <div className="grid md:grid-cols-2">
        <Column
          heading="Free, forever"
          count={FREE.length}
          note="No trial. No card. Not a tease."
          items={FREE}
          accent
        />
        {/* Border sits on the paid side so the two columns share one rule at
            md and up, and stack cleanly below it. */}
        <Column
          heading="Paid"
          count={PAID.length}
          note="The part no other tracker measures."
          items={PAID}
          className="border-t-[3px] border-border md:border-l-[3px] md:border-t-0"
        />
      </div>
    </div>
  );
}

function Column({
  heading,
  count,
  note,
  items,
  accent = false,
  className = "",
}: {
  heading: string;
  count: number;
  note: string;
  items: ReadonlyArray<{ name: string; what: string }>;
  accent?: boolean;
  className?: string;
}) {
  return (
    <section className={`p-6 sm:p-8 ${className}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3
          className={`text-xl font-bold tracking-tight ${
            // Lime is a bright accent in both themes, so text on it uses the
            // fixed --on-lime token rather than following --ink.
            accent ? "bg-lime px-2 py-0.5 text-on-lime" : ""
          }`}
        >
          {heading}
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          {count} {count === 1 ? "feature" : "features"}
        </span>
      </header>

      <p className="mt-2 text-[13px] leading-relaxed text-muted">{note}</p>

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.name} className="flex items-baseline gap-3">
            <span
              aria-hidden="true"
              className="mt-1.5 h-2.5 w-2.5 shrink-0 border-2 border-border"
              style={{
                backgroundColor: accent ? "var(--lime)" : "var(--cat-focus)",
              }}
            />
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">
                {item.name}
              </span>
              <span className="block text-[13px] leading-snug text-muted">
                {item.what}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
