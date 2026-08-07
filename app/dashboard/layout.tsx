import Link from "next/link";
import { ThemeToggle } from "@/app/_components/theme";
import { DATA } from "@/app/dashboard/_lib/data";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const isMock = DATA.source !== "real";
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b-[3px] border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <Link
              href="/"
              className="font-mono text-sm font-bold uppercase tracking-[0.2em] hover:text-cobalt"
            >
              Baseline
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isMock && (
              // Provenance is load-bearing, not decoration: every number on
              // this page is synthetic, and a screenshot of it must never be
              // mistakable for someone's real captured data.
              <span className="border-[3px] border-border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-muted">
                Simulated data
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
        <p className="border-t-[3px] border-border pt-3 font-mono text-[10px] leading-relaxed text-muted">
          Computed by engine/ from {DATA.source} events · snapshot{" "}
          {DATA.generatedAt.slice(0, 16).replace("T", " ")} · regenerate with{" "}
          <code>python -m engine.export</code>
        </p>
      </footer>
    </div>
  );
}
