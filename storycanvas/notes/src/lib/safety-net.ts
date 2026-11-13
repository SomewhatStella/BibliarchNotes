// "Recently deleted" and "Version history" (feedback item 2): a user lost
// work with no way back. Both live in Supabase (not localStorage) so they
// follow the story to any device; see
// supabase/migrations/20261112000000_safety_net.sql for the tables and RLS.
//
// Everything degrades quietly: until that migration is applied the tables
// don't exist, saves keep working, and the panels say history isn't
// available yet instead of erroring.
import { createClient } from "@/lib/supabase/client";
import type { CanvasRow, StoryConnection, StoryNode } from "@/lib/types";
import type { BoardState } from "@/lib/node-merge";

export const SNAPSHOT_EVERY_MS = 10 * 60 * 1000;
export const DELETED_KEEP_DAYS = 30;

export interface DeletedRecord {
  id: string;
  story_id: string;
  canvas_type: string;
  node: StoryNode;
  members: StoryNode[];
  connections: StoryConnection[];
  deleted_at: string;
}

export interface SnapshotRecord {
  id: string;
  canvas_type: string;
  nodes: StoryNode[];
  connections: StoryConnection[];
  palette: unknown;
  created_at: string;
  reason: string | null;
}

// The safety tables aren't in the generated Database type (they're new and
// optional), so queries go through an untyped handle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createClient() as any;

let available: boolean | null = null;
export function safetyNetAvailable() {
  return available;
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message ?? "");
}
function note(error: { code?: string; message?: string } | null) {
  if (missingTable(error)) available = false;
  else if (!error) available = true;
  else console.warn("Safety net:", error.message);
}

export async function recordDeletedNode(storyId: string, canvasType: string, node: StoryNode, members: StoryNode[], connections: StoryConnection[]) {
  if (available === false) return;
  const { error } = await db().from("deleted_nodes").insert({ story_id: storyId, canvas_type: canvasType, node, members, connections });
  note(error);
}

export async function listDeletedNodes(storyId: string): Promise<DeletedRecord[] | null> {
  const since = new Date(Date.now() - DELETED_KEEP_DAYS * 86400000).toISOString();
  const { data, error } = await db()
    .from("deleted_nodes")
    .select("id, story_id, canvas_type, node, members, connections, deleted_at")
    .eq("story_id", storyId)
    .is("restored_at", null)
    .gte("deleted_at", since)
    .order("deleted_at", { ascending: false })
    .limit(200);
  note(error);
  return error ? null : (data as DeletedRecord[]);
}

export async function markRestored(id: string) {
  const { error } = await db().from("deleted_nodes").update({ restored_at: new Date().toISOString() }).eq("id", id);
  note(error);
}

const lastSnapshot = new Map<string, number>();

/**
 * Called before each save with the board as the server had it. Keeps at most
 * one version per SNAPSHOT_EVERY_MS per board (the database trims each board
 * to its newest 20). `force` is for "about to restore an old version", so the
 * restore itself can be undone from any device.
 */
export async function maybeSnapshot(storyId: string, canvasType: string, board: BoardState, opts: { force?: boolean; reason?: string } = {}) {
  if (available === false || !board.nodes.length) return;
  const key = `${storyId}:${canvasType}`;
  const now = Date.now();
  if (!opts.force) {
    let last = lastSnapshot.get(key);
    if (last === undefined) {
      // First save of this board this session: ask when the last version was taken (maybe on another device).
      lastSnapshot.set(key, now); // claim the slot so parallel saves don't both snapshot
      const { data, error } = await db().from("canvas_snapshots").select("created_at").eq("story_id", storyId).eq("canvas_type", canvasType).order("created_at", { ascending: false }).limit(1);
      note(error);
      if (error) return;
      last = data?.[0] ? new Date(data[0].created_at).getTime() : 0;
    }
    if (now - last < SNAPSHOT_EVERY_MS) {
      lastSnapshot.set(key, last);
      return;
    }
  }
  lastSnapshot.set(key, now);
  const { error } = await db().from("canvas_snapshots").insert({
    story_id: storyId,
    canvas_type: canvasType,
    nodes: board.nodes,
    connections: board.connections,
    palette: board.palette ?? null,
    reason: opts.reason ?? "autosave",
  });
  note(error);
}

export async function listSnapshots(storyId: string, canvasType: string): Promise<SnapshotRecord[] | null> {
  const { data, error } = await db()
    .from("canvas_snapshots")
    .select("id, canvas_type, nodes, connections, palette, created_at, reason")
    .eq("story_id", storyId)
    .eq("canvas_type", canvasType)
    .order("created_at", { ascending: false })
    .limit(20);
  note(error);
  return error ? null : (data as SnapshotRecord[]);
}

export function boardOf(row: Pick<CanvasRow, "nodes" | "connections" | "palette">): BoardState {
  return { nodes: row.nodes, connections: row.connections, palette: row.palette };
}
