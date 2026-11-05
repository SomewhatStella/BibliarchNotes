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

type LooseAuthError = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

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
  if (code === "weak_password" || raw.includes("weak") || raw.includes("at least")) {
    return "That password is too short — use at least 6 characters.";
  }
  if (raw.includes("rate limit") || error.status === 429) {
    return "Too many attempts — wait a minute and try again.";
  }
  if (isPresentable(error.message)) return error.message as string;
  return fallback;
}
