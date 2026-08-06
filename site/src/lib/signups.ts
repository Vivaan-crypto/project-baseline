/**
 * Beta signup persistence.
 *
 * Deliberately isolated to one file with no SDK dependency: the store is talked
 * to over its plain REST interface, so swapping providers means rewriting this
 * file and nothing else.
 *
 * Scope note (AGENTS.md §4): `site/` has zero connection to user event data.
 * The only thing that ever lands here is an email address someone typed into a
 * form on this page.
 */

const REST_URL = process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN;

/** Redis hash holding email -> signup metadata. */
const SIGNUP_KEY = "baseline:signups";

export type SignupResult =
  | { ok: true; alreadyRegistered: boolean }
  | { ok: false; reason: "unconfigured" | "upstream" };

export function isSignupConfigured(): boolean {
  return Boolean(REST_URL && REST_TOKEN);
}

/**
 * Records an email against the signup hash.
 *
 * Uses HSET rather than a list so repeat submissions from the same person
 * collapse into one row instead of inflating the count that assumption #3
 * (AGENTS.md §10) is measured on.
 */
export async function recordSignup(
  email: string,
  source: string,
): Promise<SignupResult> {
  if (!REST_URL || !REST_TOKEN) {
    return { ok: false, reason: "unconfigured" };
  }

  const payload = JSON.stringify({
    ts: new Date().toISOString(),
    source,
  });

  let response: Response;
  try {
    response = await fetch(REST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["HSET", SIGNUP_KEY, email, payload]),
      cache: "no-store",
    });
  } catch {
    return { ok: false, reason: "upstream" };
  }

  if (!response.ok) {
    return { ok: false, reason: "upstream" };
  }

  // HSET returns 1 for a new field, 0 when it overwrote an existing one.
  const body: unknown = await response.json();
  const result =
    typeof body === "object" && body !== null && "result" in body
      ? (body as { result: unknown }).result
      : null;

  return { ok: true, alreadyRegistered: result === 0 };
}
