"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";

/* Where the "reset your password" email lands: choose a new password, then go to your stories. */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  useEffect(() => {
    document.title = "Choose a new password — Bibliarch Notes";
    const supabase = createClient();
    // The link signs you in for this one purpose; the client picks the code up from the address.
    const code = new URLSearchParams(window.location.search).get("code");
    // A used or broken link can leave the auth calls waiting, so give up after 8 seconds.
    const check = (code ? supabase.auth.exchangeCodeForSession(code).then(() => undefined).catch(() => undefined) : Promise.resolve())
      .then(() => supabase.auth.getSession())
      .then(({ data }): "ok" | "expired" => (data.session ? "ok" : "expired"))
      .catch((): "expired" => "expired");
    const timeout = new Promise<"expired">((done) => setTimeout(() => done("expired"), 8000));
    Promise.race([check, timeout]).then(setReady);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError("Use at least 6 characters.");
    if (password !== confirm) return setError("The two passwords don’t match.");
    setState("saving");
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(authErrorMessage(error));
      setState("idle");
      return;
    }
    setState("done");
    setTimeout(() => window.location.assign("/notes/dashboard"), 1500);
  }

  return (
    <>
      <p className="eyebrow">BIBLIARCH · NOTES</p>
      <h1>Choose a new password</h1>
      {ready === "checking" && <p>One moment…</p>}
      {ready === "expired" && (
        <>
          <p>This reset link has expired or was already used. Ask for a new one from the sign-in page.</p>
          <Link href="/login" className="switch-mode">Back to sign in</Link>
        </>
      )}
      {ready === "ok" && state === "done" && <p role="status">Your password is changed. Taking you to your stories…</p>}
      {ready === "ok" && state !== "done" && (
        <form onSubmit={save}>
          <label>New password<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>Type it again<input type="password" required minLength={6} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save new password"}</button>
        </form>
      )}
    </>
  );
}
