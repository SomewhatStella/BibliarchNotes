// Same auth model as storycanvas, because it's the same Supabase project:
// "Confirm email" is OFF, so signUp returns a session immediately and signs
// the user straight in — do not add an email-confirmation step here without
// checking the Supabase dashboard setting first.
"use server";

import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "@/lib/auth/errors";
import { redirect } from "next/navigation";
import { authReturnPath } from "@/lib/paths";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) return { error: authErrorMessage(error) };

  if (!data.session) {
    return {
      error: "Your account was created but couldn't be activated automatically. Try logging in directly.",
    };
  }

  if (data.user) {
    await supabase.from("profiles").upsert({ id: data.user.id, username, email });
  }

  redirect(authReturnPath(formData.get("returnUrl")));
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error) };

  redirect(authReturnPath(formData.get("returnUrl")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
