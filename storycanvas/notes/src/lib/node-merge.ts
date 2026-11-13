// Node-by-node bookkeeping for collaborative saves (feedback item 3).
//
// The old save upserted a board's WHOLE nodes array, so when two people
// edited different cards and both saved, the second write replaced the first
// person's array and their edit vanished. Everything here works per id
// instead: a ChangeSet says which cards/arrows *I* touched since my last
// save, and mergeBoard lays exactly those over whatever is on the server (or
// in a collaborator's broadcast), leaving everyone else's cards alone.
//
// Pure and import-free on purpose so `node --test` can load it directly.
import type { StoryConnection, StoryNode } from "./types";

export interface BoardState {
  nodes: StoryNode[];
  connections: StoryConnection[];
  palette: unknown;
}

export interface ChangeSet {
  nodes: Set<string>; // added or edited
  deletedNodes: Set<string>;
  conns: Set<string>;
  deletedConns: Set<string>;
  palette: boolean;
}

export function emptyChangeSet(): ChangeSet {
  return { nodes: new Set(), deletedNodes: new Set(), conns: new Set(), deletedConns: new Set(), palette: false };
}

export function isEmptyChangeSet(cs: ChangeSet): boolean {
  return !cs.palette && !cs.nodes.size && !cs.deletedNodes.size && !cs.conns.size && !cs.deletedConns.size;
}

function diffList<T extends { id: string }>(prev: T[], next: T[], changed: Set<string>, deleted: Set<string>) {
  const before = new Map(prev.map((x) => [x.id, x]));
  const seen = new Set<string>();
  for (const x of next) {
    seen.add(x.id);
    // Store updates replace only the objects they touch, so identity is a
    // cheap and exact "did this card change" test.
    if (before.get(x.id) !== x) changed.add(x.id);
  }
  for (const id of before.keys()) if (!seen.has(id)) deleted.add(id);
}

/** Which cards, arrows and palette differ between two versions of a board. */
export function diffBoards(prev: BoardState, next: BoardState): ChangeSet {
  const cs = emptyChangeSet();
  if (prev.nodes !== next.nodes) diffList(prev.nodes, next.nodes, cs.nodes, cs.deletedNodes);
  if (prev.connections !== next.connections) diffList(prev.connections, next.connections, cs.conns, cs.deletedConns);
  cs.palette = prev.palette !== next.palette;
  return cs;
}

/** Folds `later` into `into`; a later delete cancels an earlier edit and vice versa. */
export function addChanges(into: ChangeSet, later: ChangeSet): ChangeSet {
  for (const id of later.nodes) { into.nodes.add(id); into.deletedNodes.delete(id); }
  for (const id of later.deletedNodes) { into.deletedNodes.add(id); into.nodes.delete(id); }
  for (const id of later.conns) { into.conns.add(id); into.deletedConns.delete(id); }
  for (const id of later.deletedConns) { into.deletedConns.add(id); into.conns.delete(id); }
  into.palette = into.palette || later.palette;
  return into;
}

export function cloneChangeSet(cs: ChangeSet): ChangeSet {
  return addChanges(emptyChangeSet(), cs);
}

/**
 * `base` with my changed ids taken from `local` and my deleted ids removed.
 * Base order is kept; cards only I have are appended in my order.
 */
export function mergeById<T extends { id: string }>(base: T[], local: T[], changed: Set<string>, deleted: Set<string>): T[] {
  if (!changed.size && !deleted.size) return base;
  const mine = new Map(local.map((x) => [x.id, x]));
  const out: T[] = [];
  const placed = new Set<string>();
  for (const x of base) {
    if (deleted.has(x.id)) continue;
    const replacement = changed.has(x.id) ? mine.get(x.id) : undefined;
    out.push(replacement ?? x);
    placed.add(x.id);
  }
  for (const x of local) if (changed.has(x.id) && !placed.has(x.id) && !deleted.has(x.id)) out.push(x);
  return out;
}

/** What to write (or show): the other side's board plus only what I changed. */
export function mergeBoard(base: BoardState, local: BoardState, mine: ChangeSet): BoardState {
  return {
    nodes: mergeById(base.nodes, local.nodes, mine.nodes, mine.deletedNodes),
    connections: mergeById(base.connections, local.connections, mine.conns, mine.deletedConns),
    palette: mine.palette ? local.palette : base.palette,
  };
}

/** A collaborator's edit as just the cards it touched — what gets broadcast now. */
export interface BoardDelta {
  upserts: StoryNode[];
  deletedNodes: string[];
  connUpserts: StoryConnection[];
  deletedConns: string[];
  palette?: { value: unknown };
}

export function deltaFrom(board: BoardState, cs: ChangeSet): BoardDelta {
  const nodes = new Map(board.nodes.map((n) => [n.id, n]));
  const conns = new Map(board.connections.map((c) => [c.id, c]));
  return {
    upserts: [...cs.nodes].map((id) => nodes.get(id)).filter(Boolean) as StoryNode[],
    deletedNodes: [...cs.deletedNodes],
    connUpserts: [...cs.conns].map((id) => conns.get(id)).filter(Boolean) as StoryConnection[],
    deletedConns: [...cs.deletedConns],
    ...(cs.palette ? { palette: { value: board.palette } } : {}),
  };
}

export function changeSetOfDelta(d: BoardDelta): ChangeSet {
  return {
    nodes: new Set(d.upserts.map((n) => n.id)),
    deletedNodes: new Set(d.deletedNodes),
    conns: new Set(d.connUpserts.map((c) => c.id)),
    deletedConns: new Set(d.deletedConns),
    palette: !!d.palette,
  };
}

/** Applies a collaborator's delta to my board; cards it doesn't mention are left exactly as I have them. */
export function applyDelta(board: BoardState, d: BoardDelta): BoardState {
  const remote: BoardState = {
    nodes: d.upserts,
    connections: d.connUpserts,
    palette: d.palette ? d.palette.value : board.palette,
  };
  return mergeBoard(board, remote, changeSetOfDelta(d));
}

/** Removes ids a collaborator just changed from my unsaved set: their newer edit wins on both screens and in the database. */
export function dropChanges(mine: ChangeSet, theirs: ChangeSet): void {
  for (const id of [...theirs.nodes, ...theirs.deletedNodes]) { mine.nodes.delete(id); mine.deletedNodes.delete(id); }
  for (const id of [...theirs.conns, ...theirs.deletedConns]) { mine.conns.delete(id); mine.deletedConns.delete(id); }
  if (theirs.palette) mine.palette = false;
}
