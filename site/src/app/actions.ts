"use server";

import { isSignupConfigured, recordSignup } from "@/lib/signups";
import type { SignupState } from "@/lib/signup-state";

/**
 * Permissive on purpose. The goal is to reject typos and obvious junk, not to
 * prove deliverability — an over-strict pattern silently drops real addresses,
 * which corrupts the only number this page exists to collect.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical limit

export async function submitSignup(
  _previous: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // Honeypot. Real browsers leave this hidden field empty; scripted submissions
  // that fill every input do not. Answer with the success copy so a bot gets no
  // signal that it was rejected.
  const trap = formData.get("company");
  if (typeof trap === "string" && trap.length > 0) {
    return { status: "success", message: "You're on the list." };
  }

  const raw = formData.get("email");
  if (typeof raw !== "string") {
    return { status: "error", message: "Enter an email address." };
  }

  const email = raw.trim().toLowerCase();

  if (email.length === 0) {
    return { status: "error", message: "Enter an email address." };
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "That doesn't look like an email address." };
  }

  if (!isSignupConfigured()) {
    // Never fake success. A confirmation shown over a dropped address is the
    // one failure mode this page cannot afford.
    return {
      status: "error",
      message: "Signup isn't wired up yet. Nothing was saved.",
    };
  }

  const result = await recordSignup(email, "landing-download");

  if (!result.ok) {
    return {
      status: "error",
      message: "Couldn't save that. Try again in a moment.",
    };
  }

  return {
    status: "success",
    message: result.alreadyRegistered
      ? "You're already on the list."
      : "You're on the list. You'll get the build when it's signed off.",
  };
}
