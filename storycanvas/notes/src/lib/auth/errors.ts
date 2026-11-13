// Ported from storycanvas's src/lib/auth/errors.ts — same reasoning: Supabase's
// auth-js sometimes hands back a message that's actually a JSON payload
// (network drop, gateway error, empty-body rate limit), which must never be
// shown to a person as-is.
const FALLBACK = "We couldn't reach the server. Check your connection and try again in a minute.";

function isPresentable(message: string | undefined | null): message is string {
  if (!message) return false;
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return false;
  if (trimmed.length > 160) return false;
  return true;
}

type LooseAuthError = { message?: string; code?: string; status?: number; name?: string; reasons?: string[] } | null | undefined;

/**
 * Supabase rejects a password for three different reasons (too short for the project's
 * minimum, missing character kinds, or found in a leak). This used to always say "use at least
 * 6 characters", even when the project wanted 8 or wanted a number: so a perfectly long
 * password "couldn't be changed" with no way to tell why. Now it says what is actually wanted.
 */
export function weakPasswordMessage(error: LooseAuthError): string {
  const raw = error?.message ?? "";
  const reasons = error?.reasons ?? [];
  const parts: string[] = [];
  const min = raw.match(/at least (\d+) char/i)?.[1];
  if (reasons.includes("length") || min) parts.push(`use at least ${min ?? 6} characters`);
  if (reasons.includes("characters") || /one character of each/i.test(raw)) {
    const kinds: string[] = [];
    if (/abcdefghijklmnopqrstuvwxyz/.test(raw)) kinds.push("a lowercase letter");
    if (/ABCDEFGHIJKLMNOPQRSTUVWXYZ/.test(raw)) kinds.push("a capital letter");
    if (/0123456789/.test(raw)) kinds.push("a number");
    if (/[!@#$%^&*]/.test(raw.replace(/^.*?:/, ""))) kinds.push("a symbol");
    parts.push(`include ${kinds.length ? kinds.join(", ").replace(/, ([^,]*)$/, " and $1") : "letters, numbers and symbols"}`);
  }
  if (reasons.includes("pwned") || /pwned|leak|breach|known to be weak/i.test(raw)) {
    parts.push("pick one that hasn’t appeared in a known data leak");
  }
  if (parts.length === 0) return "That password isn’t strong enough. Try a longer one with a mix of letters and numbers.";
  const text = parts.join("; ");
  return `That password isn’t accepted: ${text}.`;
}

export function authErrorMessage(error: LooseAuthError, fallback = FALLBACK): string {
  if (!error) return fallback;
  const code = error.code ?? "";
  const raw = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || raw.includes("invalid login credentials")) {
    return "That email and password don't match an account. Double-check both, or create an account if you haven't yet.";
  }
  if (code === "user_already_exists" || raw.includes("already registered")) {
    return "An account with that email already exists — try logging in instead.";
  }
  if (code === "weak_password" || error.name === "AuthWeakPasswordError" || raw.includes("weak") || /password should (be at least|contain)/.test(raw)) {
    return weakPasswordMessage(error);
  }
  if (code === "same_password" || raw.includes("different from the old password")) {
    return "That’s already your password. Choose a new one.";
  }
  if (code === "reauthentication_needed" || code === "reauth_nonce_missing" || raw.includes("requires reauthentication")) {
    return "For your security, this change needs a confirmation code from your email.";
  }
  if (code === "reauthentication_not_valid" || raw.includes("invalid nonce")) {
    return "That code isn’t right, or it has expired. Ask for a new one.";
  }
  if (code === "session_not_found" || code === "session_expired" || error.name === "AuthSessionMissingError" || raw.includes("session missing")) {
    return "Your sign-in has expired. Please sign in again and retry.";
  }
  if (raw.includes("rate limit") || error.status === 429) {
    return "Too many attempts — wait a minute and try again.";
  }
  if (isPresentable(error.message)) return error.message as string;
  return fallback;
}
