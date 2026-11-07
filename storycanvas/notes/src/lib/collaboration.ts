// Plain async functions over the same story_collaborators / share_tokens /
// accept_share_invite RPC storycanvas already has deployed on this Supabase
// project — ported from storycanvas's src/lib/hooks/useCollaboration.ts,
// minus the TanStack Query caching layer (this app doesn't use react-query;
// callers refetch explicitly instead).
import { createClient } from "@/lib/supabase/client";

export interface Collaborator {
  id: string;
  user_id: string;
  role: "editor" | "viewer";
  invited_at: string;
  accepted_at: string | null;
  profile?: { username: string | null; email: string | null } | null;
}

export interface ShareToken {
  id: string;
  token: string;
  role: "editor" | "viewer";
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

export type StoryRole = "owner" | "editor" | "viewer" | null;

const MAX_COLLABORATORS = 10;
export { MAX_COLLABORATORS };

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

export async function getStoryAccess(storyId: string): Promise<{ isOwner: boolean; role: StoryRole }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { isOwner: false, role: null };

  const { data: story } = await supabase.from("stories").select("id, user_id").eq("id", storyId).single();
  if (story?.user_id === auth.user.id) return { isOwner: true, role: "owner" };

  const { data: collab } = await supabase
    .from("story_collaborators")
    .select("role, accepted_at")
    .eq("story_id", storyId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (collab?.accepted_at) return { isOwner: false, role: collab.role as "editor" | "viewer" };
  return { isOwner: false, role: null };
}

export async function getCollaborators(storyId: string): Promise<Collaborator[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("story_collaborators")
    .select("id, user_id, role, invited_at, accepted_at, profile:profiles!user_id(username,email)")
    .eq("story_id", storyId);
  if (error) throw error;
  return (data ?? []) as unknown as Collaborator[];
}

export async function getShareTokens(storyId: string): Promise<ShareToken[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("share_tokens")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ShareToken[];
}

export async function createShareToken(
  storyId: string,
  role: "editor" | "viewer" = "editor",
  expiresInHours?: number,
  maxUses?: number
): Promise<ShareToken> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600_000).toISOString() : null;
  const { data, error } = await supabase
    .from("share_tokens")
    .insert({ story_id: storyId, token: generateToken(), created_by: auth.user.id, role, expires_at: expiresAt, max_uses: maxUses ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ShareToken;
}

export async function deleteShareToken(tokenId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("share_tokens").delete().eq("id", tokenId);
  if (error) throw error;
}

export async function acceptShareInvite(token: string): Promise<{ success: boolean; story_id?: string; role?: string; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_share_invite", { invite_token: token });
  if (error) throw error;
  return data as { success: boolean; story_id?: string; role?: string; error?: string };
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("story_collaborators").delete().eq("id", collaboratorId);
  if (error) throw error;
}

export async function leaveCollaboration(storyId: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("story_collaborators")
    .delete()
    .eq("story_id", storyId)
    .eq("user_id", auth.user.id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Couldn't leave this project — the database refused the request.");
  }
}

export async function updateCollaboratorRole(collaboratorId: string, role: "editor" | "viewer"): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("story_collaborators").update({ role }).eq("id", collaboratorId);
  if (error) throw error;
}

export async function transferOwnership(storyId: string, newOwnerId: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data: story, error: storyError } = await supabase.from("stories").select("user_id").eq("id", storyId).single();
  if (storyError) throw storyError;
  if (story.user_id !== auth.user.id) throw new Error("Only the owner can transfer ownership");

  const { error: updateError } = await supabase.from("stories").update({ user_id: newOwnerId }).eq("id", storyId);
  if (updateError) throw updateError;

  await supabase.from("story_collaborators").delete().eq("story_id", storyId).eq("user_id", newOwnerId);

  const { error: addError } = await supabase
    .from("story_collaborators")
    .insert({ story_id: storyId, user_id: auth.user.id, role: "editor", invited_by: newOwnerId, accepted_at: new Date().toISOString() });
  if (addError) throw addError;
}

export async function searchUsers(query: string): Promise<{ id: string; username: string | null; email: string | null }[]> {
  if (!query || query.length < 2) return [];
  const supabase = createClient();
  // Profiles are private; this server-side search only reveals an email when
  // the exact address is typed (supabase/005_private_profiles.sql).
  const { data, error } = await supabase.rpc("search_users" as never, { q: query } as never);
  if (error) throw error;
  return (data ?? []) as { id: string; username: string | null; email: string | null }[];
}

export async function inviteUser(storyId: string, userId: string, role: "editor" | "viewer" = "editor"): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("story_collaborators")
    .select("id, accepted_at")
    .eq("story_id", storyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    throw new Error(existing.accepted_at ? "User is already a collaborator" : "Invitation already sent");
  }

  const { error } = await supabase
    .from("story_collaborators")
    .insert({ story_id: storyId, user_id: userId, role, invited_by: auth.user.id });
  if (error) throw error;
}

export interface MyInvitation {
  id: string;
  role: string;
  invited_at: string;
  story: { id: string; title: string };
  inviter: { username: string | null; email: string | null } | null;
}

export async function getMyInvitations(): Promise<MyInvitation[]> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data: collabData, error } = await supabase
    .from("story_collaborators")
    .select("id, story_id, role, invited_at, invited_by")
    .eq("user_id", auth.user.id)
    .is("accepted_at", null)
    .order("invited_at", { ascending: false });
  if (error) throw error;
  if (!collabData || collabData.length === 0) return [];

  const storyIds = collabData.map((c) => c.story_id);
  const inviterIds = collabData.map((c) => c.invited_by).filter((id): id is string => !!id);

  const { data: stories } = await supabase.from("stories").select("id, title").in("id", storyIds);
  const { data: inviters } = inviterIds.length
    ? await supabase.from("profiles").select("id, username, email").in("id", inviterIds)
    : { data: [] };

  const storiesMap = new Map((stories ?? []).map((s) => [s.id, s]));
  const invitersMap = new Map((inviters ?? []).map((i) => [i.id, i]));

  return collabData.map((c) => ({
    id: c.id,
    role: c.role,
    invited_at: c.invited_at,
    story: { id: c.story_id, title: storiesMap.get(c.story_id)?.title ?? "Untitled Project" },
    inviter: c.invited_by ? invitersMap.get(c.invited_by) ?? null : null,
  }));
}

export async function acceptInvitation(collaboratorId: string): Promise<{ story_id: string }> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("story_collaborators")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", collaboratorId)
    .eq("user_id", auth.user.id)
    .select("story_id")
    .single();
  if (error) throw error;
  return data;
}

export async function declineInvitation(collaboratorId: string): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { error } = await supabase.from("story_collaborators").delete().eq("id", collaboratorId).eq("user_id", auth.user.id);
  if (error) throw error;
}
