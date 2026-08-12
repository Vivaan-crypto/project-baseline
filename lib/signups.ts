/**
 * Beta signup persistence — a Google Apps Script web app writing to a Sheet.
 *
 * Deliberately isolated to one file with no SDK dependency: the store is talked
 * to over a plain HTTP POST, so swapping providers means rewriting this file
 * and nothing else.
 *
 * Scope note (AGENTS.md §4): the marketing site has zero connection to user
 * event data. The only thing that ever lands here is an email address someone
 * typed into a form on this page.
 *
 * This runs server-side, called from the `submitSignup` server action — not
 * from the browser. That is a deliberate departure from the setup guide's
 * client-side `fetch`:
 *   - No CORS is involved, so the `text/plain` preflight dodge is unnecessary.
 *   - The endpoint stays out of the client bundle, so it needs no NEXT_PUBLIC_
 *     prefix and isn't sitting in the page source for anyone to POST junk at.
 *   - The response body is actually read. This is the important one: Apps
 *     Script reports its own failures with HTTP 200 and `{ok: false}` in the
 *     body, so a `fetch` that ignores the body cannot tell a saved address
 *     from a dropped one, and shows "You're on the list" either way.
 */

/** Apps Script deployment URL (`.../exec`). Server-only; never NEXT_PUBLIC_. */
const ENDPOINT = process.env.SIGNUP_ENDPOINT;

/**
 * Optional. When set, it is sent as `secret` in the request body. Harmless
 * until the matching check is added to the Apps Script — see
 * docs/EMAIL_CAPTURE.md §3.
 */
const SHARED_SECRET = process.env.SIGNUP_SHARED_SECRET;

/**
 * How long to wait on Apps Script before giving up. It cold-starts, and its
 * `doPost` holds a script lock for up to 20s under concurrent submits, so a
 * slow response is normal rather than broken. Capped below the hosting
 * platform's own function timeout so a stall surfaces as a retryable error
 * message instead of an opaque platform 504. Tunable.
 */
const TIMEOUT_MS = 10_000;

/** What the Apps Script `json()` helper returns. All of it is optional. */
type ScriptResponse = {
  ok?: unknown;
  duplicate?: unknown;
  error?: unknown;
};

export type SignupResult =
  | { ok: true; alreadyRegistered: boolean }
  // `rejected` means the script refused the address itself. The action
  // validates with the same pattern first, so it should be unreachable — it
  // exists so a drift between the two validators is visible rather than
  // reported as a generic outage.
  | { ok: false; reason: "unconfigured" | "upstream" | "rejected" };

export function isSignupConfigured(): boolean {
  return Boolean(ENDPOINT);
}

/**
 * Appends an email to the signups sheet.
 *
 * Duplicate handling lives in the Apps Script, which checks column B before
 * appending, so repeat submissions from the same person collapse into one row
 * instead of inflating the count that assumption #3 (AGENTS.md §10) is
 * measured on.
 */
export async function recordSignup(
  email: string,
  source: string,
): Promise<SignupResult> {
  if (!ENDPOINT) {
    return { ok: false, reason: "unconfigured" };
  }

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        SHARED_SECRET
          ? { email, source, secret: SHARED_SECRET }
          : { email, source },
      ),
      // Apps Script answers a POST with a 302 to script.googleusercontent.com
      // and serves the body there. Following it is the default; stating it
      // because the request silently returns an empty 302 body without it.
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Network failure, DNS, or the timeout above.
    return { ok: false, reason: "upstream" };
  }

  if (!response.ok) {
    return { ok: false, reason: "upstream" };
  }

  // A misconfigured deployment ("Who has access" not set to Anyone) answers
  // with an HTML sign-in page and HTTP 200, so a parse failure here is a real
  // and fairly likely outcome, not a defensive nicety.
  let body: ScriptResponse;
  try {
    body = (await response.json()) as ScriptResponse;
  } catch {
    return { ok: false, reason: "upstream" };
  }

  if (body.ok !== true) {
    return {
      ok: false,
      reason: body.error === "invalid email" ? "rejected" : "upstream",
    };
  }

  return { ok: true, alreadyRegistered: body.duplicate === true };
}
