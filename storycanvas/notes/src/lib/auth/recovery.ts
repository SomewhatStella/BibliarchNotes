import { createClient } from "@supabase/supabase-js";

/*
 * Sends the "choose a new password" email.
 *
 * The site's normal client signs people in with PKCE, which only finishes in the
 * browser that started it. Reset emails are often opened somewhere else (a phone,
 * the Gmail app), so this one request uses the implicit flow: the link carries its
 * own one-time session and /reset-password picks it up from the address.
 */
export function sendPasswordResetEmail(email: string) {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "bibliarch-password-reset" },
  });
  return client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
}
