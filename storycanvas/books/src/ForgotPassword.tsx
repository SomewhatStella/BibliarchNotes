"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "./shared-auth";


/*
 * "Forgot your password?" on the sign-in card. Supabase emails a link back to
 * /reset-password: the same address storycanvas used, so it's already on the
 * project's allowed-redirect list. The main site forwards it to /notes/reset-password.
 */
function resetErrorMessage(error: { message?: string; status?: number; code?: string }): string {
  const raw = (error.message ?? "").trim();
  if (error.status === 429 || /rate limit/i.test(raw) || error.code === "over_email_send_rate_limit") return "Too many reset emails just now. Wait a minute and try again.";
  if (/email_address_invalid|invalid.*email/i.test(`${error.code} ${raw}`)) return "That email address doesn’t look right. Check it and try again.";
  if (raw && !raw.startsWith("{") && !raw.startsWith("[") && raw.length <= 160) return raw;
  return "The reset email couldn’t be sent. Check your connection and try again in a minute.";
}

export default function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    // Same fix as Notes: sendPasswordResetEmail can throw (offline, missing configuration), which
    // left this stuck on "Sending…"; and Supabase's raw messages (some are JSON) were shown as-is.
    try {
      const { error } = await sendPasswordResetEmail(email.trim());
      if (error) {
        setError(resetErrorMessage(error));
        setState("idle");
      } else setState("sent");
    } catch (err) {
      setError(resetErrorMessage(err as Error));
      setState("idle");
    }
  }

  if (!open)
    return (
      <button type="button" className="forgot-link" onClick={() => setOpen(true)}>
        Forgot your password?
      </button>
    );
  if (state === "sent")
    return (
      <p className="forgot-note" role="status">
        If there&rsquo;s an account for <strong>{email.trim()}</strong>, we&rsquo;ve sent it a link to choose a new password. Check your inbox (and spam).
      </p>
    );
  return (
    <form className="forgot-form" onSubmit={send}>
      <label>
        Email for the reset link
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="forgot-actions">
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button className="primary" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send reset link"}
        </button>
      </div>
    </form>
  );
}
