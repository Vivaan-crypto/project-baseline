/**
 * Why a submission failed, as a stable machine-readable tag.
 *
 * Kept separate from `message` on purpose: the message is user-facing copy and
 * gets reworded, so reporting it would silently split one analytics event into
 * several the next time someone edits a sentence. The three upstream values
 * mirror `SignupResult["reason"]` in lib/signups.ts and pass straight through.
 */
export type SignupErrorReason =
  | "missing_name"
  | "invalid_email"
  | "unconfigured"
  | "rejected"
  | "upstream";

export type SignupState =
  | { status: "idle"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string; reason: SignupErrorReason };

export const initialSignupState: SignupState = { status: "idle", message: "" };
