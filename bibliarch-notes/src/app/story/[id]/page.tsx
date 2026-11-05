import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryBoard from "@/components/StoryBoard";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("stories").select("title").eq("id", id).maybeSingle();
  return { title: data?.title || "Story" };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: story, error } = await supabase.from("stories").select("*").eq("id", id).single();
  if (error || !story) redirect("/dashboard");

  return <StoryBoard storyId={id} storyTitle={story.title} userId={data.user.id} />;
}
