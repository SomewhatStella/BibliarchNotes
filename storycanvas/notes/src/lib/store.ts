// The fix for the bug storycanvas's own progress report marks "ABANDONED BY
// USER — NON-FUNCTIONAL": the relationship map's character picker went empty
// because it read characters from the database, and the database was only
// ever as fresh as the last 2-second debounced autosave — so navigating
// straight from "just created a character" to the relationship map raced
// the save and lost.
//
// The fix here is architectural, not a longer debounce: every canvas_data
// row for the whole story loads ONCE, up front, into this store, and stays
// here as the source of truth for the rest of the session. Every edit
// updates this in-memory state SYNCHRONOUSLY; Supabase is a save target, not
// something anything in the UI ever waits on a round-trip to read back from.
// getAllCharacters() below is exactly the read that broke before — it now
// scans memory, never the network, so it can never be stale by a save delay.
import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { CanvasRow, StoryConnection, StoryNode } from "@/lib/types";
import type { Json } from "@/types/supabase";

const SAVE_DEBOUNCE_MS = 600;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CanvasStore {
  storyId: string | null;
  canvases: Record<string, CanvasRow>; // keyed by canvas_type
  saveStatus: Record<string, SaveStatus>;
  loading: boolean;
  loadError: string | null;

  loadStory: (storyId: string) => Promise<void>;
  ensureCanvas: (canvasType: string) => CanvasRow;

  addNode: (canvasType: string, node: StoryNode) => void;
  updateNode: (canvasType: string, nodeId: string, patch: Partial<StoryNode>) => void;
  deleteNode: (canvasType: string, nodeId: string) => void;

  addConnection: (canvasType: string, conn: StoryConnection) => void;
  updateConnection: (canvasType: string, connId: string, patch: Partial<StoryConnection>) => void;
  deleteConnection: (canvasType: string, connId: string) => void;

  // The story's palette lives on the main canvas row's `palette` column —
  // one value per story, shared with every collaborator (unlike the
  // original app's localStorage-only version, which never synced).
  setPalette: (palette: unknown) => void;

  // The read that used to race a save. Now a pure in-memory scan.
  getAllCharacters: () => { id: string; name: string; profileImageUrl?: string }[];

  // Applies a broadcast from another collaborator — display-only, never
  // schedules a save (the sender already owns persisting their own change;
  // re-saving the receiver's copy would just be a redundant write race).
  applyRemoteCanvas: (canvasType: string, nodes: StoryNode[], connections: StoryConnection[]) => void;

  flushSave: (canvasType: string) => Promise<void>;
  flushAll: () => Promise<void>;
}

function emptyCanvas(storyId: string, canvasType: string): CanvasRow {
  return {
    id: canvasType, // real id arrives from the server on first save; harmless placeholder until then
    story_id: storyId,
    canvas_type: canvasType,
    nodes: [],
    connections: [],
    palette: null,
    updated_at: new Date().toISOString(),
  };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  storyId: null,
  canvases: {},
  saveStatus: {},
  loading: false,
  loadError: null,

  async loadStory(storyId) {
    set({ loading: true, loadError: null, storyId, canvases: {}, saveStatus: {} });
    const supabase = createClient();
    // One query for every board in the story — this is the eager load that
    // makes getAllCharacters() safe. Stories are small (tens of boards, not
    // thousands); this is a cheap trade for never racing a save again.
    const { data, error } = await supabase.from("canvas_data").select("*").eq("story_id", storyId);
    if (error) {
      set({ loading: false, loadError: error.message });
      return;
    }
    const canvases: Record<string, CanvasRow> = {};
    for (const row of data ?? []) {
      canvases[row.canvas_type] = {
        id: row.id,
        story_id: row.story_id,
        canvas_type: row.canvas_type,
        nodes: (row.nodes as unknown as StoryNode[]) ?? [],
        connections: (row.connections as unknown as StoryConnection[]) ?? [],
        palette: row.palette,
        updated_at: row.updated_at,
      };
    }
    if (!canvases["main"]) canvases["main"] = emptyCanvas(storyId, "main");
    set({ canvases, loading: false });
  },

  ensureCanvas(canvasType) {
    const existing = get().canvases[canvasType];
    if (existing) return existing;
    const storyId = get().storyId;
    const fresh = emptyCanvas(storyId ?? "", canvasType);
    set((s) => ({ canvases: { ...s.canvases, [canvasType]: fresh } }));
    return fresh;
  },

  addNode(canvasType, node) {
    mutate(set, get, canvasType, (c) => ({ ...c, nodes: [...c.nodes, node] }));
  },
  updateNode(canvasType, nodeId, patch) {
    mutate(set, get, canvasType, (c) => ({
      ...c,
      nodes: c.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }));
  },
  deleteNode(canvasType, nodeId) {
    mutate(set, get, canvasType, (c) => ({
      ...c,
      nodes: c.nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => (n.childIds?.includes(nodeId) ? { ...n, childIds: n.childIds.filter((id) => id !== nodeId) } : n))
        // Deleting a list puts its cards back on the board instead of hiding them forever.
        .map((n) => (n.parentId === nodeId ? { ...n, parentId: undefined } : n)),
      connections: c.connections.filter((conn) => conn.from !== nodeId && conn.to !== nodeId),
    }));
  },

  addConnection(canvasType, conn) {
    mutate(set, get, canvasType, (c) => ({ ...c, connections: [...c.connections, conn] }));
  },
  updateConnection(canvasType, connId, patch) {
    mutate(set, get, canvasType, (c) => ({
      ...c,
      connections: c.connections.map((cn) => (cn.id === connId ? { ...cn, ...patch } : cn)),
    }));
  },
  deleteConnection(canvasType, connId) {
    mutate(set, get, canvasType, (c) => ({ ...c, connections: c.connections.filter((cn) => cn.id !== connId) }));
  },

  setPalette(palette) {
    mutate(set, get, "main", (c) => ({ ...c, palette }));
  },

  applyRemoteCanvas(canvasType, nodes, connections) {
    const current = get().canvases[canvasType] ?? emptyCanvas(get().storyId ?? "", canvasType);
    set((s) => ({ canvases: { ...s.canvases, [canvasType]: { ...current, nodes, connections } } }));
  },

  getAllCharacters() {
    const seen = new Map<string, { id: string; name: string; profileImageUrl?: string }>();
    for (const canvas of Object.values(get().canvases)) {
      for (const n of canvas.nodes) {
        // Linked cards point at a character that is already listed, so skip them (no duplicates).
        if (n.type === "character" && !n.refNodeId) seen.set(n.id, { id: n.id, name: n.text || "Unnamed", profileImageUrl: n.profileImageUrl });
      }
    }
    return Array.from(seen.values());
  },

  async flushSave(canvasType) {
    const timer = saveTimers.get(canvasType);
    if (timer) {
      clearTimeout(timer);
      saveTimers.delete(canvasType);
    }
    const { storyId, canvases } = get();
    const canvas = canvases[canvasType];
    if (!storyId || !canvas) return;
    set((s) => ({ saveStatus: { ...s.saveStatus, [canvasType]: "saving" } }));
    const supabase = createClient();
    const { data, error } = await supabase
      .from("canvas_data")
      .upsert(
        {
          story_id: storyId,
          canvas_type: canvasType,
          nodes: canvas.nodes as unknown as Json,
          connections: canvas.connections as unknown as Json,
          palette: canvas.palette as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "story_id,canvas_type" }
      )
      .select()
      .single();
    if (error) {
      console.error("Canvas save failed:", error);
      set((s) => ({ saveStatus: { ...s.saveStatus, [canvasType]: "error" } }));
      return;
    }
    set((s) => ({
      saveStatus: { ...s.saveStatus, [canvasType]: "saved" },
      canvases: { ...s.canvases, [canvasType]: { ...s.canvases[canvasType]!, id: data.id, updated_at: data.updated_at } },
    }));
  },

  async flushAll() {
    await Promise.all(Object.keys(get().canvases).map((ct) => get().flushSave(ct)));
  },
}));

function mutate(
  set: (fn: (s: CanvasStore) => Partial<CanvasStore>) => void,
  get: () => CanvasStore,
  canvasType: string,
  updater: (c: CanvasRow) => CanvasRow
) {
  const current = get().canvases[canvasType] ?? emptyCanvas(get().storyId ?? "", canvasType);
  const next = updater(current);
  set((s) => ({ canvases: { ...s.canvases, [canvasType]: next } }));
  scheduleSave(canvasType, get);
}

function scheduleSave(canvasType: string, get: () => CanvasStore) {
  const existing = saveTimers.get(canvasType);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    canvasType,
    setTimeout(() => {
      saveTimers.delete(canvasType);
      get().flushSave(canvasType);
    }, SAVE_DEBOUNCE_MS)
  );
}
