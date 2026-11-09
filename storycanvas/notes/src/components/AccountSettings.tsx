"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OverviewNavigation from "./OverviewNavigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth/errors";
import { sendPasswordResetEmail } from "@/lib/auth/recovery";

/*
 * Account settings, as storycanvas had them: see your details, change your username or
 * password, or delete your account. One account covers Notes and Books, so this is the
 * single place to manage it.
 */
export default function AccountSettings({ userId, email, username: initialName, createdAt }: { userId: string; email: string; username: string; createdAt: string | null }) {
  const [username, setUsername] = useState(initialName);
  // Format the date in the browser (the server's language and time zone may differ, which breaks the page).
  const [since, setSince] = useState("");
  useEffect(() => {
    if (createdAt) setSince(new Date(createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }));
  }, [createdAt]);
  return (
    <div className="notes-overview-shell">
      <OverviewNavigation />
      <main className="account-page min-h-0 flex-1 overflow-y-auto px-6 py-10 md:px-12">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="account-back"><ArrowLeft size={14} /> Your stories</Link>
          <p className="account-eyebrow">BIBLIARCH · ACCOUNT</p>
          <h1 className="account-title">Account settings</h1>
          <p className="account-sub">One account for Notes and Books.</p>

          <section className="account-card">
            <h2>Your details</h2>
            <dl className="account-details">
              <div><dt>Username</dt><dd>{username || "Not set"}</dd></div>
              <div><dt>Email</dt><dd>{email}</dd></div>
              {createdAt && <div><dt>Member since</dt><dd>{since}</dd></div>}
            </dl>
          </section>

          <UsernameForm userId={userId} current={username} onSaved={setUsername} />
          <PasswordForm email={email} />
          <DeleteAccount userId={userId} />
        </div>
      </main>
    </div>
  );
}

function Status({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p role="alert" className="account-error">{error}</p>;
  if (ok) return <p role="status" className="account-ok">{ok}</p>;
  return null;
}

function UsernameForm({ userId, current, onSaved }: { userId: string; current: string; onSaved: (name: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    setOk(null);
    if (name.length < 3) return setError("Use at least 3 characters.");
    if (name.length > 20) return setError("Use 20 characters or fewer.");
    if (name === current) return setError("That’s already your username.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().from("profiles").update({ username: name }).eq("id", userId);
    setBusy(false);
    if (error) return setError(error.code === "23505" ? "Someone already has that username. Try another." : "Your username couldn’t be saved. Please try again.");
    onSaved(name);
    setValue("");
    setOk("Username changed.");
  }
  return (
    <section className="account-card">
      <h2>Change username</h2>
      <p className="account-help">This is the name collaborators see.</p>
      <form onSubmit={save} className="account-form">
        <label>New username<input value={value} maxLength={20} autoComplete="username" placeholder={current} onChange={(e) => setValue(e.target.value)} /></label>
        <Status error={error} ok={ok} />
        <button className="account-primary" disabled={busy || !value.trim()}>{busy ? "Saving…" : "Save username"}</button>
      </form>
    </section>
  );
}

function PasswordForm({ email }: { email: string }) {
  const [linkState, setLinkState] = useState<"idle" | "sending" | "sent">("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function emailLink() {
    setLinkState("sending");
    setOk(null);
    setError(null);
    const { error } = await sendPasswordResetEmail(email);
    if (error) {
      setError(authErrorMessage(error));
      setLinkState("idle");
    } else setLinkState("sent");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    if (next.length < 6) return setError("Use at least 6 characters for the new password.");
    if (next !== again) return setError("The two new passwords don’t match.");
    if (next === current) return setError("Pick a password that’s different from your current one.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // Check the current password first, so someone at an unlocked computer can't change it.
    const check = await supabase.auth.signInWithPassword({ email, password: current });
    if (check.error) {
      setBusy(false);
      const wrong = check.error.code === "invalid_credentials" || check.error.message.toLowerCase().includes("invalid login");
      return setError(wrong ? "Your current password isn’t right." : authErrorMessage(check.error));
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return setError(authErrorMessage(error));
    setCurrent(""); setNext(""); setAgain("");
    setOk("Password changed.");
  }
  return (
    <section className="account-card">
      <h2>Change password</h2>
      <form onSubmit={save} className="account-form">
        <label>Current password<input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
        <label>New password<input type="password" required minLength={6} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <label>New password again<input type="password" required minLength={6} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></label>
        <Status error={error} ok={ok} />
        <button className="account-primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
      </form>
      <p className="account-forgot">
        Don’t know your current password?{" "}
        <button type="button" className="account-link" disabled={linkState !== "idle"} onClick={emailLink}>
          {linkState === "sent" ? "Reset link sent. Check your email (and spam)." : linkState === "sending" ? "Sending…" : "Email me a reset link"}
        </button>
      </p>
    </section>
  );
}

function DeleteAccount({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed.trim().toUpperCase() === "DELETE";
  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) return setError("Type DELETE to confirm.");
    setBusy(true);
    setError(null);
    const supabase = createClient();
    // One database call removes stories, boards, profile, shared-project memberships, Books
    // projects and the sign-in together, so a failure never leaves a half-deleted account
    // (the old version deleted the profile first and then could fail on the account itself).
    const { error } = await supabase.rpc("delete_own_account" as never);
    if (error) {
      console.error("delete_own_account failed", error);
      setBusy(false);
      return setError("Your account couldn’t be deleted just now. Please try again, or send us feedback.");
    }
    // Books keeps this account's drafts in this browser under the account id; clear only those.
    try {
      for (const key of Object.keys(localStorage)) if (key.endsWith(`:account:${userId}`)) localStorage.removeItem(key);
      indexedDB.deleteDatabase(`bibliarch-books:account:${userId}`);
    } catch { /* storage blocked: nothing to clear */ }
    await supabase.auth.signOut();
    window.location.assign("/?deleted=1");
  }
  return (
    <section className="account-card account-danger">
      <h2>Delete account</h2>
      <p className="account-help">This permanently deletes your account and every story you own, for Notes and Books. Stories other people shared with you stay with their owners. This can’t be undone.</p>
      {!open ? (
        <button type="button" className="account-danger-button" onClick={() => setOpen(true)}>Delete my account…</button>
      ) : (
        <form onSubmit={remove} className="account-form">
          <label>Type DELETE to confirm<input value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} /></label>
          <Status error={error} ok={null} />
          <div className="account-row">
            <button type="button" className="account-secondary" onClick={() => { setOpen(false); setTyped(""); setError(null); }}>Cancel</button>
            <button className="account-danger-button" disabled={busy || !confirmed}>{busy ? "Deleting…" : "Delete forever"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
