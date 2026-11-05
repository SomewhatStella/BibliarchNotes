"use client";

import { useState, useTransition } from "react";
import { signIn, signUp } from "@/lib/auth/actions";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    formData.set("returnUrl", new URLSearchParams(window.location.search).get("returnUrl") ?? "");
    setError(null);
    startTransition(async () => {
      const action = mode === "login" ? signIn : signUp;
      const result = await action(formData);
      if (result?.error) setError(result.error);
    });
  }

  // Same fields and styles as the Books sign-in card (app/shared-account.css).
  return (
    <form action={onSubmit}>
      {mode === "signup" && (
        <label>Username<input name="username" type="text" required autoComplete="username" /></label>
      )}
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Password<input name="password" type="password" required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="primary" disabled={pending}>
        {pending ? "One moment…" : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
