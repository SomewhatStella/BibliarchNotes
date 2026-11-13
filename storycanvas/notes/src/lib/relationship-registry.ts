// Shared relationships. Before this, every relationship map held its own ties, so the same
// pair had to be redrawn (and kept in sync by hand) in every map. Now the story keeps ONE
// list of ties, on a hidden node in its own canvas row; a map only keeps who is on it and
// where they stand, and shows every tie between two of its people.
//
// The old per-map `relationshipData.relationships` stays as a mirror (the old live app still
// reads it), and anything found there that the registry hasn't seen yet is folded in on load.
// Pure functions only, so they can be unit-tested (tests/relationship-registry.test.mjs).
import type { CanvasRow, RelationshipConnection, RelationshipRegistry, StoryNode } from "./types";

// A canvas row nothing links to, so neither app ever draws it as a board.
export const REGISTRY_CANVAS = "story-relationships";
export const REGISTRY_NODE_ID = "story-relationship-registry";

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
const keyOf = (r: RelationshipConnection) => pairKey(r.fromCharacterId, r.toCharacterId);

function valid(r: unknown): r is RelationshipConnection {
  const t = r as RelationshipConnection | null;
  return !!t && typeof t.id === "string" && typeof t.fromCharacterId === "string" && typeof t.toCharacterId === "string" && !!t.fromCharacterId && !!t.toCharacterId && t.fromCharacterId !== t.toCharacterId;
}

export function emptyRegistry(): RelationshipRegistry {
  return { version: 1, relationships: [], importedIds: [] };
}

export function readRegistry(canvases: Record<string, CanvasRow>): RelationshipRegistry | null {
  const reg = canvases[REGISTRY_CANVAS]?.nodes.find((n) => n.id === REGISTRY_NODE_ID)?.relationshipRegistry;
  if (!reg || !Array.isArray(reg.relationships)) return null;
  return {
    version: 1,
    relationships: reg.relationships.filter(valid),
    importedIds: Array.isArray(reg.importedIds) ? reg.importedIds.filter((id) => typeof id === "string") : [],
  };
}

export interface MapRef {
  canvasType: string;
  node: StoryNode;
}

/** Every relationship map in the story, in a stable order (board, then position on it). */
export function findMaps(canvases: Record<string, CanvasRow>): MapRef[] {
  const out: MapRef[] = [];
  for (const ct of Object.keys(canvases).sort()) {
    if (ct === REGISTRY_CANVAS) continue;
    for (const node of canvases[ct]!.nodes) if (node.type === "relationship-canvas") out.push({ canvasType: ct, node });
  }
  return out;
}

/** Who a map shows: its chosen people, plus anyone an old save tied without adding (self-heal). */
export function memberIdsOf(node: StoryNode): Set<string> {
  const ids = new Set((node.relationshipData?.selectedCharacters ?? []).map((c) => c.id));
  for (const r of node.relationshipData?.relationships ?? []) {
    if (!valid(r)) continue;
    ids.add(r.fromCharacterId);
    ids.add(r.toCharacterId);
  }
  return ids;
}

const time = (r: RelationshipConnection) => (r.updatedAt ? Date.parse(r.updatedAt) : NaN);
const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
function combine(a: string | undefined, b: string | undefined, sep: string): string | undefined {
  if (!b?.trim()) return a;
  if (!a?.trim()) return b;
  return a.split(sep).some((part) => sameText(part, b)) ? a : `${a}${sep}${b}`;
}

/**
 * Two copies of the same pair's tie. With timestamps, the newer one wins whole. Old saves have
 * none, so nothing is thrown away: the first copy's type/strength stay, and differing labels
 * and notes are both kept ("sisters / rivals").
 */
export function mergeTie(existing: RelationshipConnection, incoming: RelationshipConnection): RelationshipConnection {
  const te = time(existing), ti = time(incoming);
  if (!Number.isNaN(ti) && (Number.isNaN(te) || ti > te)) return { ...incoming, id: existing.id };
  if (!Number.isNaN(te)) return existing;
  const merged: RelationshipConnection = { ...existing, label: combine(existing.label, incoming.label, " / ") ?? existing.label };
  const notes = combine(existing.notes, incoming.notes, "\n\n");
  if (notes) merged.notes = notes;
  return merged;
}

/**
 * Folds every map's own ties that the registry hasn't seen into it. `changed` is false when
 * there was nothing new, so loading a story never writes for no reason.
 */
export function migrateLegacy(registry: RelationshipRegistry | null, maps: StoryNode[]): { registry: RelationshipRegistry; changed: boolean } {
  const reg: RelationshipRegistry = registry
    ? { version: 1, relationships: [...registry.relationships], importedIds: [...registry.importedIds] }
    : emptyRegistry();
  const imported = new Set(reg.importedIds);
  let changed = false;
  for (const map of maps) {
    for (const r of map.relationshipData?.relationships ?? []) {
      if (!valid(r) || imported.has(r.id)) continue;
      imported.add(r.id);
      changed = true;
      const i = reg.relationships.findIndex((x) => keyOf(x) === keyOf(r));
      if (i < 0) reg.relationships.push({ ...r });
      else reg.relationships[i] = mergeTie(reg.relationships[i]!, r);
    }
  }
  reg.importedIds = Array.from(imported);
  return { registry: reg, changed };
}

/** The ties a map draws: every registry tie whose two people are both on it. */
export function tiesAmong(registry: RelationshipRegistry, memberIds: Set<string>): RelationshipConnection[] {
  return registry.relationships.filter((r) => memberIds.has(r.fromCharacterId) && memberIds.has(r.toCharacterId));
}

function sameTie(a: RelationshipConnection, b: RelationshipConnection) {
  const strip = (r: RelationshipConnection) => {
    const rest: Record<string, unknown> = { ...r };
    delete rest.updatedAt;
    return JSON.stringify(rest, Object.keys(rest).sort());
  };
  return strip(a) === strip(b);
}

/**
 * A map changed its visible ties from `prev` to `next` (add, edit, remove). Applies exactly
 * that to the registry, so the same change shows in every other map with the same people.
 * Ties the map doesn't show are never touched.
 */
export function applyMapEdit(
  registry: RelationshipRegistry,
  prev: RelationshipConnection[],
  next: RelationshipConnection[],
  now: string
): RelationshipRegistry {
  const nextIds = new Set(next.map((r) => r.id));
  const removed = new Set(prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id));
  let rels = registry.relationships.filter((r) => !removed.has(r.id));
  for (const t of next) {
    if (!valid(t)) continue;
    const before = prev.find((p) => p.id === t.id);
    if (before && sameTie(before, t)) continue;
    // One tie per pair: an edit that changes who it's between replaces whatever that pair had.
    rels = rels.filter((r) => r.id !== t.id && keyOf(r) !== keyOf(t));
    rels.push({ ...t, updatedAt: now });
  }
  const imported = new Set(registry.importedIds);
  next.forEach((t) => imported.add(t.id));
  return { version: 1, relationships: rels, importedIds: Array.from(imported) };
}

/** Other maps that draw this tie (both people on them). */
export function mapsShowingTie(maps: MapRef[], selfId: string, tie: RelationshipConnection): MapRef[] {
  return maps.filter((m) => {
    if (m.node.id === selfId) return false;
    const ids = memberIdsOf(m.node);
    return ids.has(tie.fromCharacterId) && ids.has(tie.toCharacterId);
  });
}

/** Other maps sharing at least one of these ties: the "Also appears in N other maps" hint. */
export function mapsSharingTies(maps: MapRef[], selfId: string, ties: RelationshipConnection[]): MapRef[] {
  return maps.filter((m) => m.node.id !== selfId && ties.some((t) => mapsShowingTie([m], selfId, t).length > 0));
}

/** The hidden node that carries the registry. Never drawn: no board links to its canvas. */
export function registryNode(registry: RelationshipRegistry): StoryNode {
  return {
    id: REGISTRY_NODE_ID,
    type: "text",
    text: "Story relationships (shared by every relationship map)",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    relationshipRegistry: registry,
  };
}
