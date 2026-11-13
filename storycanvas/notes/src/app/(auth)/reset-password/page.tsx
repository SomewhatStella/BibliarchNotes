"use client";

import { useEffect, useRef, useState } from "react";
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
  const [why, setWhy] = useState<string | null>(null);
  // React runs this effect twice in development. The first run strips the one-time tokens from
  // the address, so a second run found none and could race the first to "expired".
  const started = useRef(false);

  useEffect(() => {
    document.title = "Choose a new password — Bibliarch Notes";
    if (started.current) return;
    started.current = true;
    const supabase = createClient();
    // The link signs you in for this one purpose. Emails sent now carry the session after the #
    // (works on any device); older ones carry a ?code= that only works in the browser that asked.
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = query.get("code");
    // Projects whose email template uses the server-side style link send ?token_hash=…&type=recovery.
    const tokenHash = query.get("token_hash");
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (query.get("error_code") || hash.get("error_code")) {
      setWhy(query.get("error_description") || hash.get("error_description"));
      setReady("expired");
      return;
    }
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    // A used or broken link can leave the auth calls waiting, so give up after 8 seconds.
    const signIn: Promise<unknown> = access_token && refresh_token
      ? supabase.auth.setSession({ access_token, refresh_token })
      : tokenHash
        ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
        : code
          ? supabase.auth.exchangeCodeForSession(code)
          : Promise.resolve();
    const check = signIn
      .catch(() => undefined)
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
    let failure: string | null = null;
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        // The link's session can lapse while the page sits open.
        const lapsed = error.name === "AuthSessionMissingError" || error.code === "session_not_found" || error.code === "session_expired";
        failure = lapsed ? "This reset link has run out. Ask for a new one from the sign-in page." : authErrorMessage(error);
      }
    } catch (e) {
      failure = authErrorMessage(e as Error);
    }
    if (failure) {
      setError(failure);
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
          {why && <p className="forgot-note">({why.replace(/\+/g, " ")})</p>}
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
