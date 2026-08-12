"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { track } from "@vercel/analytics";
import { submitSignup } from "@/app/actions";
import { initialSignupState } from "@/lib/signup-state";

/**
 * The beta-list CTA. There is no Windows binary yet (AGENTS.md §9 sequences the
 * landing page ahead of the packaged .exe), so the button collects an address
 * instead of serving a file — but the click is still recorded as install intent,
 * which is what assumption #3 in §10 is measured on.
 *
 * `location` tags the event so several placements can share one total while
 * still being separable.
 */
export function SignupForm({ location }: { location: string }) {
  const [state, formAction, pending] = useActionState(
    submitSignup,
    initialSignupState,
  );
  const reported = useRef(false);
  // The page renders this component more than once; ids must stay unique or the
  // labels bind to the wrong input.
  const emailId = useId();

  useEffect(() => {
    // Fire once per successful capture, not on every re-render.
    if (state.status === "success" && !reported.current) {
      reported.current = true;
      track("signup_complete", { location });
    }
  }, [state.status, location]);

  if (state.status === "success") {
    return (
      <div
        className="border-[3px] border-on-lime bg-lime px-4 py-3 font-mono text-sm font-bold text-on-lime sm:max-w-md"
        role="status"
      >
        {state.message}
      </div>
    );
  }

  return (
    <div className="sm:max-w-md">
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="min-w-0 flex-1 border-[3px] border-border bg-white px-3.5 py-3 font-mono text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
        />

        {/* Which placement this submission came from. Lands in the sheet's
            `source` column so hero and footer signups stay separable — see the
            note on `location` above. Normalised server-side; it's a hidden
            field, so its value is not trusted. */}
        <input type="hidden" name="source" value={location} />

        {/* Honeypot. Hidden from sight and from assistive tech; only automated
            submitters fill it in. Paired with the check in submitSignup. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        />

        <button
          type="submit"
          disabled={pending}
          // Records intent before validation runs, so a click still counts when
          // the address is malformed or the field is empty.
          onClick={() => track("beta_signup_click", { location })}
          className="press shrink-0 border-[3px] border-on-lime bg-lime px-6 py-3.5 font-sans text-base font-bold text-on-lime shadow-[var(--shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:opacity-60 disabled:shadow-none"
        >
          {pending ? "Adding…" : "Join the beta list"}
        </button>
      </form>

      <p
        className="mt-2 min-h-5 text-xs text-muted"
        role={state.status === "error" ? "alert" : undefined}
      >
        {state.status === "error"
          ? state.message
          : "Windows 10/11. Free for 7 days. No card needed."}
      </p>
    </div>
  );
}
