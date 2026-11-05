import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountSettings from "@/components/AccountSettings";
import "../shared-account.css";

export const metadata = { title: "Account settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?returnUrl=/settings");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.user.id).single();
  return (
    <AccountSettings
      userId={data.user.id}
      email={data.user.email ?? ""}
      username={profile?.username ?? (data.user.user_metadata?.username as string | undefined) ?? ""}
      createdAt={data.user.created_at ?? null}
    />
  );
}
