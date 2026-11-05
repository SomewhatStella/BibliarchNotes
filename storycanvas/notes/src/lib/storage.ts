// Images live in the same `story-images` Supabase Storage bucket storycanvas
// already uses. Nodes carry only the storage PATH, never base64 — storycanvas
// learned this the hard way: base64-in-node breaks real-time collaboration
// because every edit broadcasts the full nodes array over a Realtime channel,
// which caps a message at a few hundred KB. Keeping paths now costs nothing
// and avoids a painful migration when Wave 2 adds collaboration.
import { createClient } from "@/lib/supabase/client";

const BUCKET = "story-images";

export async function uploadImage(file: File, userId: string, nodeId: string): Promise<string> {
  const supabase = createClient();
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${nodeId}-${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  return data.path;
}

export function getImageUrl(storagePath: string | null | undefined): string {
  if (!storagePath) return "";
  if (storagePath.startsWith("http") || storagePath.startsWith("data:") || storagePath.startsWith("blob:")) {
    return storagePath;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

export async function uploadNodeImage(file: File, nodeId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return await uploadImage(file, data.user.id, nodeId);
  } catch (err) {
    console.error("Image upload failed:", err);
    return null;
  }
}

// Self-healing for older nodes carrying an actual base64 data: URL instead of
// a storage path — likely from before this app (or an earlier storycanvas
// build) enforced storage-path-only. Converts it to a real upload so it
// stops blowing past the Realtime broadcast cap on every unrelated edit.
export async function migrateBase64Image(dataUrl: string, nodeId: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1]?.split("+")[0] || "png";
    const file = new File([blob], `migrated.${ext}`, { type: blob.type });
    return await uploadImage(file, auth.user.id, nodeId);
  } catch (err) {
    console.error("Legacy image migration failed for node", nodeId, err);
    return null;
  }
}

export function isBase64Image(value: string | null | undefined): value is string {
  return !!value && value.startsWith("data:");
}
