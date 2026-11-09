"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "@/lib/auth/recovery";
import { authErrorMessage } from "@/lib/auth/errors";

/*
 * "Forgot your password?" on the sign-in card. Supabase emails a link back to
 * /reset-password: the same address storycanvas used, so it's already on the
 * project's allowed-redirect list. The main site forwards it to /notes/reset-password.
 */
export default function ForgotPassword() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const { error } = await sendPasswordResetEmail(email.trim());
    if (error) {
      setError(authErrorMessage(error));
      setState("idle");
    } else setState("sent");
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
