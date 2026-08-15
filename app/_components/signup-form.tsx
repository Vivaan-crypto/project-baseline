"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { track } from "@vercel/analytics";
import { submitSignup } from "@/app/actions";
import { initialSignupState } from "@/lib/signup-state";

/**
 * Shared across the three text inputs. `min-w-0` matters on the name row: flex
 * items default to their content width as a minimum, which would push the pair
 * wider than the email field below them.
 */
const FIELD_CLASS =
  "min-w-0 border-[3px] border-border bg-white px-3.5 py-3 font-mono text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt";

/**
 * The beta-list CTA. There is no Windows binary yet (AGENTS.md §9 sequences the
 * landing page ahead of the packaged .exe), so the button collects an email
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
  const id = useId();
  const emailId = `${id}-email`;

  // Depends on the whole state object rather than `state.status`: every submit
  // returns a fresh object, so two failures in a row are two events instead of
  // one. Re-renders that don't change the state don't re-fire.
  useEffect(() => {
    if (state.status === "success") {
      // Fire once per successful capture, not on every re-render.
      if (reported.current) return;
      reported.current = true;
      track("signup_complete", { location });
      return;
    }
    // Without this the drop between beta_signup_click and signup_complete is a
    // number with no explanation — a typo'd address and a dead endpoint look
    // identical. `reason` is a fixed tag, never the user's input.
    if (state.status === "error") {
      track("signup_error", { location, reason: state.reason });
    }
  }, [state, location]);

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
      <form action={formAction} className="flex flex-col gap-3">
        {/* Email field */}
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
          className={`w-full ${FIELD_CLASS}`}
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

        {/* Row 3 — the button, matching the field width above it now that it no
            longer shares a row with the email input. */}
        <button
          type="submit"
          disabled={pending}
          // Records intent before validation runs, so a click still counts when
          // the address is malformed or a field is empty.
          onClick={() => track("beta_signup_click", { location })}
          className="press w-full border-[3px] border-on-lime bg-lime px-6 py-3.5 font-sans text-base font-bold text-on-lime shadow-[var(--shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:opacity-60 disabled:shadow-none"
        >
          {pending ? "Adding…" : "Join the beta list"}
        </button>
      </form>

      <p
        className="mt-2 min-h-5 text-xs text-muted"
        role={state.status === "error" ? "alert" : undefined}
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </div>
  );
}
