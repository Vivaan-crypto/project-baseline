import { Logo } from "@/app/_components/logo";

/**
 * Chrome for the public marketing page only. The dashboard has its own
 * (app/dashboard/layout.tsx) — it needs full width and a different header,
 * so this can't live in the root layout the way it used to.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="mx-auto w-full max-w-4xl px-6 pt-8 sm:px-8">
        <Logo />
      </header>
      {children}
    </>
  );
}
