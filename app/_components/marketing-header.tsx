import type { ReactNode } from "react";
import { Logo } from "@/app/_components/logo";
import { ThemeToggle } from "@/app/_components/theme";

/**
 * Top chrome for the public pages: wordmark left, an optional slot right.
 *
 * This used to be app/(marketing)/layout.tsx. It moved into a component
 * because the right-hand slot differs per page — the landing page has nothing
 * there, the policy page has a way back — and a layout cannot vary by which
 * child it wraps without a parallel route or a client-side pathname check.
 * Both are more machinery than one link is worth, and the pathname check would
 * also mean every future page silently inherits whatever rule was written here.
 * Passing the slot in makes each page state its own chrome.
 *
 * The dashboard does not use this; it has its own header (app/dashboard/
 * layout.tsx), which needs full width and different controls.
 */
export function MarketingHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 pt-8 sm:px-8">
      <Logo />
      {/* The theme toggle is site chrome, not page content, so it is rendered
          here rather than passed in: every public page gets one, including any
          added later. `right` carries whatever is specific to a single page and
          sits inboard of it, which keeps the toggle in the same corner as the
          dashboard's (app/dashboard/layout.tsx) as you move between them. */}
      <div className="flex items-center gap-2">
        {right}
        <ThemeToggle />
      </div>
    </header>
  );
}
