import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";

export const metadata = { title: "Your stories" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.user.id).single();

  return <Dashboard userId={data.user.id} username={profile?.username ?? "Storyteller"} />;
}
