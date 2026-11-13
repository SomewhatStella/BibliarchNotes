// Public view links: one per story, owner-only, read-only for whoever has the link.
// The database side is supabase/migrations/20261114000000_public_links.sql.
import { createClient } from "@/lib/supabase/client";
import type { CanvasRow } from "@/lib/types";

export interface PublicStory {
  id: string;
  title: string;
  author: string | null;
  canvases: CanvasRow[];
}

export function publicUrl(token: string): string {
  return `${window.location.origin}/notes/view/${token}`;
}

/** The story's public link token, null when it's off. Throws when the feature isn't installed yet. */
export async function getPublicLink(storyId: string): Promise<string | null> {
  const { data, error } = await createClient()
    .from("public_links" as never)
    .select("token")
    .eq("story_id", storyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { token: string } | null)?.token ?? null;
}

export async function turnOnPublicLink(storyId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("public_links" as never)
    .insert({ story_id: storyId } as never)
    .select("token")
    .single();
  if (error) {
    // Already on (e.g. turned on in another tab): just read it back.
    const existing = await getPublicLink(storyId);
    if (existing) return existing;
    throw new Error(error.message);
  }
  return (data as { token: string }).token;
}

export async function turnOffPublicLink(storyId: string): Promise<void> {
  const { error } = await createClient()
    .from("public_links" as never)
    .delete()
    .eq("story_id", storyId);
  if (error) throw new Error(error.message);
}
