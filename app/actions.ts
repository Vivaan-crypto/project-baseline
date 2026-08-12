"use server";

import { isSignupConfigured, recordSignup } from "@/lib/signups";
import type { SignupState } from "@/lib/signup-state";

/**
 * Permissive on purpose. The goal is to reject typos and obvious junk, not to
 * prove deliverability — an over-strict pattern silently drops real addresses,
 * which corrupts the only number this page exists to collect.
 *
 * Kept identical to the pattern in the Apps Script so the two validators agree;
 * if they drift, `recordSignup` reports `rejected` rather than hiding it.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical limit

/**
 * `source` arrives from a hidden field, so it is attacker-controlled and gets
 * normalised rather than trusted: lowercase, `[a-z0-9_-]` only, and short
 * enough that it can't be used to stuff a sheet cell. Anything else becomes
 * `unknown`, which is also what the Apps Script defaults to.
 */
const MAX_SOURCE_LENGTH = 40;

function normaliseSource(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return "unknown";
  const cleaned = raw.trim().toLowerCase().slice(0, MAX_SOURCE_LENGTH);
  return /^[a-z0-9_-]+$/.test(cleaned) ? cleaned : "unknown";
}

/**
 * Names are length-capped and nothing else. Deliberately no character pattern:
 * real names carry apostrophes, hyphens, spaces and accents, and every "letters
 * only" rule ends up rejecting somebody's actual name. Length is the only
 * property worth enforcing here.
 */
const MAX_NAME_LENGTH = 80;

function readName(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_NAME_LENGTH) : "";
}

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

  const firstName = readName(formData.get("firstName"));
  const lastName = readName(formData.get("lastName"));

  if (firstName.length === 0 || lastName.length === 0) {
    return { status: "error", message: "Enter your first and last name." };
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

  const result = await recordSignup({
    firstName,
    lastName,
    email,
    // Which form on the page this came from. The whole point of the column: if
    // everyone signs up in the hero, nobody read the privacy section first.
    source: normaliseSource(formData.get("source")),
  });

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "rejected"
          ? "Check your name and email and try again."
          : "Couldn't save that. Try again in a moment.",
    };
  }

  return {
    status: "success",
    message: result.alreadyRegistered
      ? "You're already on the list."
      : "You're on the list. You'll get the build when it's signed off.",
  };
}
