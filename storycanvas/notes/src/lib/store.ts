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
//
// Saves are node-by-node (feedback item 3): every local edit records which
// cards it touched, and a save re-reads the row and writes "server + my
// changed cards − my deleted cards", retrying if someone saved in between.
// Two people editing different cards no longer overwrite each other.
import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { CanvasRow, StoryConnection, StoryNode } from "@/lib/types";
import type { Json } from "@/types/supabase";
import {
  addChanges,
  applyDelta,
  changeSetOfDelta,
  cloneChangeSet,
  deltaFrom,
  diffBoards,
  dropChanges,
  emptyChangeSet,
  isEmptyChangeSet,
  mergeBoard,
  type BoardDelta,
  type BoardState,
  type ChangeSet,
} from "@/lib/node-merge";
import { History, revertStep } from "@/lib/history";
import { boardOf, maybeSnapshot } from "@/lib/safety-net";
import { restoreDeleted, type DeletedCard } from "@/lib/restore";

const SAVE_DEBOUNCE_MS = 600;
const SAVE_RETRY_MS = 4000;
const SAVE_ATTEMPTS = 5;
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const saveChains = new Map<string, Promise<void>>();

// Per board: cards changed locally and not yet saved / being saved right now / not yet broadcast.
const dirty = new Map<string, ChangeSet>();
const saving = new Map<string, ChangeSet>();
const unbroadcast = new Map<string, ChangeSet>();
const history = new History();
let historyPaused = 0;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface RemoteCanvasChange {
  nodes: StoryNode[];
  connections: StoryConnection[];
  delta?: BoardDelta;
}

interface CanvasStore {
  storyId: string | null;
  canvases: Record<string, CanvasRow>; // keyed by canvas_type
  saveStatus: Record<string, SaveStatus>;
  loading: boolean;
  loadError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  undoTopId: number | null;

  loadStory: (storyId: string) => Promise<void>;
  ensureCanvas: (canvasType: string) => CanvasRow;
  /**
   * Re-reads one board from the server and merges it under my unsaved edits.
   * With `template`, a board that has NO row on the server is filled from it
   * (resolves true when it was). Never fills a board that exists remotely.
   */
  syncBoard: (canvasType: string, template?: (() => { nodes: StoryNode[]; connections: StoryConnection[] } | null) | null) => Promise<boolean>;

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

  /** Puts a board's cards and arrows back to an older version (one undoable step). */
  replaceBoard: (canvasType: string, board: { nodes: StoryNode[]; connections: StoryConnection[] }) => void;
  /** Recently deleted → Restore. False when the card is already back. */
  restoreCard: (canvasType: string, card: DeletedCard) => Promise<boolean>;

  // The read that used to race a save. Now a pure in-memory scan.
  getAllCharacters: () => { id: string; name: string; profileImageUrl?: string }[];

  // Applies a broadcast from another collaborator — display-only, never
  // schedules a save (the sender already owns persisting their own change)
  // and never touches undo history. Merged per card, so it can't wipe my
  // unsaved edit to a different card.
  applyRemoteChange: (canvasType: string, change: RemoteCanvasChange) => void;
  /** Kept for older callers: a whole-board broadcast without a delta. */
  applyRemoteCanvas: (canvasType: string, nodes: StoryNode[], connections: StoryConnection[]) => void;
  /** The cards changed locally since the last broadcast of this board (and forgets them). */
  takeBroadcastDelta: (canvasType: string) => BoardDelta | null;

  undo: () => string[];
  redo: () => string[];
  beginGesture: () => void;
  endGesture: () => void;
  sealHistory: () => void;
  /** Runs edits that shouldn't be undoable on their own (template filling, image migration). */
  withoutHistory: (fn: () => void) => void;

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

type Row = { id: string; story_id: string; canvas_type: string; nodes: Json; connections: Json; palette: Json; updated_at: string };
function rowToCanvas(row: Row): CanvasRow {
  return {
    id: row.id,
    story_id: row.story_id,
    canvas_type: row.canvas_type,
    nodes: (row.nodes as unknown as StoryNode[]) ?? [],
    connections: (row.connections as unknown as StoryConnection[]) ?? [],
    palette: row.palette,
    updated_at: row.updated_at,
  };
}

/** Everything of mine the server may not have yet: unsaved plus mid-save. */
function pendingOf(canvasType: string): ChangeSet {
  const out = emptyChangeSet();
  const s = saving.get(canvasType);
  const d = dirty.get(canvasType);
  if (s) addChanges(out, s);
  if (d) addChanges(out, d);
  return out;
}

function historyFlags() {
  return { canUndo: history.canUndo, canRedo: history.canRedo, undoTopId: history.topId };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  storyId: null,
  canvases: {},
  saveStatus: {},
  loading: false,
  loadError: null,
  canUndo: false,
  canRedo: false,
  undoTopId: null,

  async loadStory(storyId) {
    // A reload of the story already open (realtime reconnect) must not blank
    // the board: that unmounted any card mid-edit and threw away its typing,
    // and replaced unsaved local cards with the older server copy.
    const reload = get().storyId === storyId && !!get().canvases["main"];
    if (!reload) {
      history.clear();
      dirty.clear();
      saving.clear();
      unbroadcast.clear();
      set({ loading: true, loadError: null, storyId, canvases: {}, saveStatus: {}, ...historyFlags() });
    }
    const supabase = createClient();
    // One query for every board in the story — this is the eager load that
    // makes getAllCharacters() safe. Stories are small (tens of boards, not
    // thousands); this is a cheap trade for never racing a save again.
    const { data, error } = await supabase.from("canvas_data").select("*").eq("story_id", storyId);
    if (get().storyId !== storyId) return;
    if (error) {
      if (reload) console.error("Story reload failed:", error);
      else set({ loading: false, loadError: error.message });
      return;
    }
    const fresh: Record<string, CanvasRow> = {};
    for (const row of data ?? []) fresh[row.canvas_type] = rowToCanvas(row);
    if (reload) {
      const local = get().canvases;
      // Boards only I have (opened, not saved yet) stay; the rest are the server's plus my unsaved cards.
      const merged: Record<string, CanvasRow> = { ...local };
      for (const [ct, row] of Object.entries(fresh)) {
        merged[ct] = local[ct] ? { ...row, ...mergeBoard(boardOf(row), boardOf(local[ct]), pendingOf(ct)) } : row;
      }
      set({ canvases: merged });
      return;
    }
    if (!fresh["main"]) fresh["main"] = emptyCanvas(storyId, "main");
    set({ canvases: fresh, loading: false });
  },

  ensureCanvas(canvasType) {
    const existing = get().canvases[canvasType];
    if (existing) return existing;
    const storyId = get().storyId;
    // Local placeholder only: it holds no changes, so it is never written —
    // an empty row can't be saved over a board that exists on the server.
    const fresh = emptyCanvas(storyId ?? "", canvasType);
    set((s) => ({ canvases: { ...s.canvases, [canvasType]: fresh } }));
    return fresh;
  },

  async syncBoard(canvasType, template) {
    const storyId = get().storyId;
    if (!storyId) return false;
    const { data: row, error } = await createClient().from("canvas_data").select("*").eq("story_id", storyId).eq("canvas_type", canvasType).maybeSingle();
    if (error || get().storyId !== storyId) return false; // offline: show what we have, never guess a template
    if (row) {
      const server = rowToCanvas(row);
      const local = get().canvases[canvasType];
      const merged = local ? { ...server, ...mergeBoard(boardOf(server), boardOf(local), pendingOf(canvasType)) } : server;
      set((s) => ({ canvases: { ...s.canvases, [canvasType]: merged } }));
      return false;
    }
    const filled = template?.();
    if (!filled) return false;
    get().ensureCanvas(canvasType);
    get().withoutHistory(() =>
      mutate(set, get, canvasType, (c) => {
        // Template ids are fixed per board, so a collaborator filling the same board at the same time can't duplicate it.
        const haveNodes = new Set(c.nodes.map((n) => n.id));
        const haveConns = new Set(c.connections.map((x) => x.id));
        return {
          ...c,
          nodes: [...c.nodes, ...filled.nodes.filter((n) => !haveNodes.has(n.id))],
          connections: [...c.connections, ...filled.connections.filter((x) => !haveConns.has(x.id))],
        };
      })
    );
    return true;
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

  replaceBoard(canvasType, board) {
    history.seal();
    mutate(set, get, canvasType, (c) => ({ ...c, nodes: board.nodes, connections: board.connections }));
    history.seal();
  },

  async restoreCard(canvasType, card) {
    if (!get().canvases[canvasType]) {
      get().ensureCanvas(canvasType);
      await get().syncBoard(canvasType);
    }
    const current = get().canvases[canvasType]!;
    const next = restoreDeleted(boardOf(current), card);
    if (!next) return false;
    history.seal();
    mutate(set, get, canvasType, (c) => ({ ...c, nodes: next.nodes, connections: next.connections }));
    history.seal();
    return true;
  },

  applyRemoteChange(canvasType, change) {
    const current = get().canvases[canvasType];
    // A board I haven't opened gets fetched fresh when I do open it.
    if (!current) return;
    let next: BoardState;
    if (change.delta) {
      next = applyDelta(boardOf(current), change.delta);
      // Their edit is newer than my unsaved one to the same card: it wins here and in the database.
      const theirs = changeSetOfDelta(change.delta);
      const d = dirty.get(canvasType);
      if (d) dropChanges(d, theirs);
      const u = unbroadcast.get(canvasType);
      if (u) dropChanges(u, theirs);
    } else {
      // Whole-board broadcast (older clients): theirs, except the cards I still have unsaved.
      next = mergeBoard({ nodes: change.nodes, connections: change.connections, palette: current.palette }, boardOf(current), pendingOf(canvasType));
    }
    set((s) => ({ canvases: { ...s.canvases, [canvasType]: { ...current, ...next } } }));
  },

  applyRemoteCanvas(canvasType, nodes, connections) {
    get().applyRemoteChange(canvasType, { nodes, connections });
  },

  takeBroadcastDelta(canvasType) {
    const cs = unbroadcast.get(canvasType);
    const canvas = get().canvases[canvasType];
    unbroadcast.delete(canvasType);
    if (!cs || !canvas || isEmptyChangeSet(cs)) return null;
    return deltaFrom(boardOf(canvas), cs);
  },

  undo() {
    const step = history.popUndo();
    if (!step) return [];
    historyPaused++;
    try {
      for (const [ct, b] of Object.entries(step.boards)) mutate(set, get, ct, (c) => ({ ...c, ...revertStep(boardOf(c), b.after, b.before) }));
    } finally {
      historyPaused--;
    }
    set(historyFlags());
    return Object.keys(step.boards);
  },
  redo() {
    const step = history.popRedo();
    if (!step) return [];
    historyPaused++;
    try {
      for (const [ct, b] of Object.entries(step.boards)) mutate(set, get, ct, (c) => ({ ...c, ...revertStep(boardOf(c), b.before, b.after) }));
    } finally {
      historyPaused--;
    }
    set(historyFlags());
    return Object.keys(step.boards);
  },
  beginGesture() {
    history.beginGesture();
  },
  endGesture() {
    history.endGesture();
  },
  sealHistory() {
    history.seal();
  },
  withoutHistory(fn) {
    historyPaused++;
    try {
      fn();
    } finally {
      historyPaused--;
    }
  },

  getAllCharacters() {
    const seen = new Map<string, { id: string; name: string; profileImageUrl?: string }>();
    for (const canvas of Object.values(get().canvases)) {
      for (const n of canvas.nodes) {
        if (n.type === "character") seen.set(n.id, { id: n.id, name: n.text || "Unnamed", profileImageUrl: n.profileImageUrl });
      }
    }
    return Array.from(seen.values());
  },

  flushSave(canvasType) {
    const timer = saveTimers.get(canvasType);
    if (timer) {
      clearTimeout(timer);
      saveTimers.delete(canvasType);
    }
    // One save per board at a time; a flush during a save waits for it and then saves what's left.
    const run = (saveChains.get(canvasType) ?? Promise.resolve()).then(() => saveBoard(canvasType, set, get));
    saveChains.set(canvasType, run);
    return run;
  },

  async flushAll() {
    await Promise.all(Object.keys(get().canvases).map((ct) => get().flushSave(ct)));
  },
}));

type SetFn = (partial: Partial<CanvasStore> | ((s: CanvasStore) => Partial<CanvasStore>)) => void;

function setStatus(set: SetFn, canvasType: string, status: SaveStatus) {
  set((s) => ({ saveStatus: { ...s.saveStatus, [canvasType]: status } }));
}

async function saveBoard(canvasType: string, set: SetFn, get: () => CanvasStore): Promise<void> {
  const storyId = get().storyId;
  const mine = dirty.get(canvasType);
  if (!storyId || !mine || isEmptyChangeSet(mine)) return;
  dirty.delete(canvasType);
  saving.set(canvasType, mine);
  setStatus(set, canvasType, "saving");
  const supabase = createClient();
  try {
    for (let attempt = 0; attempt < SAVE_ATTEMPTS; attempt++) {
      const { data: row, error: readError } = await supabase
        .from("canvas_data")
        .select("id, nodes, connections, palette, updated_at")
        .eq("story_id", storyId)
        .eq("canvas_type", canvasType)
        .maybeSingle();
      if (readError) throw readError;
      const local = get().canvases[canvasType];
      if (!local || get().storyId !== storyId) return;
      const server: BoardState = row
        ? { nodes: (row.nodes as unknown as StoryNode[]) ?? [], connections: (row.connections as unknown as StoryConnection[]) ?? [], palette: row.palette }
        : { nodes: [], connections: [], palette: null };
      // Version history: the board as it was before this save, at most every 10 minutes.
      if (row && attempt === 0) void maybeSnapshot(storyId, canvasType, server);
      const merged = mergeBoard(server, boardOf(local), mine);
      const values = {
        nodes: merged.nodes as unknown as Json,
        connections: merged.connections as unknown as Json,
        palette: (merged.palette ?? null) as Json,
        updated_at: new Date().toISOString(),
      };
      let saved: { id: string; updated_at: string } | null = null;
      if (row) {
        // Only if nobody saved since I read it; otherwise read again and re-merge.
        const unchanged = supabase.from("canvas_data").update(values).eq("id", row.id);
        const { data, error } = await (row.updated_at ? unchanged.eq("updated_at", row.updated_at) : unchanged.is("updated_at", null)).select("id, updated_at");
        if (error) throw error;
        saved = data?.[0] ?? null;
      } else {
        const { data, error } = await supabase.from("canvas_data").insert({ story_id: storyId, canvas_type: canvasType, ...values }).select("id, updated_at");
        if (error && error.code !== "23505") throw error; // 23505: a collaborator created the row first
        saved = data?.[0] ?? null;
      }
      if (!saved) continue;
      const done = saved;
      set((s) => ({
        saveStatus: { ...s.saveStatus, [canvasType]: dirty.has(canvasType) ? "saving" : "saved" },
        canvases: s.canvases[canvasType] ? { ...s.canvases, [canvasType]: { ...s.canvases[canvasType]!, id: done.id, updated_at: done.updated_at } } : s.canvases,
      }));
      return;
    }
    throw new Error("The board kept changing underneath this save");
  } catch (error) {
    console.error("Canvas save failed:", error);
    // Keep my changes for the next attempt (anything edited since still wins).
    const later = dirty.get(canvasType);
    dirty.set(canvasType, later ? addChanges(cloneChangeSet(mine), later) : mine);
    setStatus(set, canvasType, "error");
    scheduleSave(canvasType, get, SAVE_RETRY_MS);
  } finally {
    saving.delete(canvasType);
  }
}

function track(map: Map<string, ChangeSet>, canvasType: string, cs: ChangeSet) {
  const existing = map.get(canvasType);
  map.set(canvasType, existing ? addChanges(existing, cs) : cloneChangeSet(cs));
}

function mutate(set: SetFn, get: () => CanvasStore, canvasType: string, updater: (c: CanvasRow) => CanvasRow) {
  const current = get().canvases[canvasType] ?? emptyCanvas(get().storyId ?? "", canvasType);
  const next = updater(current);
  const before = boardOf(current);
  const after = boardOf(next);
  const cs = diffBoards(before, after);
  if (isEmptyChangeSet(cs)) return;
  track(dirty, canvasType, cs);
  track(unbroadcast, canvasType, cs);
  if (!historyPaused) {
    // Same cards edited again → same key → typing in one cell coalesces into one step.
    // Adds and deletes are always their own step (unless inside one drag/click gesture).
    const added = [...cs.nodes].some((id) => !current.nodes.some((n) => n.id === id)) || [...cs.conns].some((id) => !current.connections.some((c) => c.id === id));
    const structural = added || cs.deletedNodes.size > 0 || cs.deletedConns.size > 0;
    const ids = [...cs.nodes, ...cs.conns].sort().join(",");
    const key = structural ? `structural:${Math.random()}` : `${canvasType}|${ids}|${cs.palette ? "palette" : ""}`;
    history.record(canvasType, before, after, key, Date.now());
  }
  set((s) => ({ canvases: { ...s.canvases, [canvasType]: next }, ...(historyPaused ? {} : historyFlags()) }));
  scheduleSave(canvasType, get);
}

function scheduleSave(canvasType: string, get: () => CanvasStore, delay = SAVE_DEBOUNCE_MS) {
  const existing = saveTimers.get(canvasType);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    canvasType,
    setTimeout(() => {
      saveTimers.delete(canvasType);
      get().flushSave(canvasType);
    }, delay)
  );
}
