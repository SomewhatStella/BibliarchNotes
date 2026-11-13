// Linked cards: the same character (or place) shown on several boards without copying it.
// A link is an ordinary character/location node with `refNodeId` pointing at the original.
// It shows the original's live name/picture/summary and opens the original's board. Deleting
// a link removes only the link; deleting the original leaves its links in a "missing" state.
//
// The link also keeps a copy of the original's name/picture (kept in step on every edit), and
// its linkedCanvasId is the original's board, so the old live app still shows and opens it.
// Pure functions (tests/character-links.test.mjs); the React hook is in use-character-link.ts.
import type { CanvasRow, StoryNode } from "./types";

export const LINKABLE_TYPES = ["character", "location"] as const;
// The fields a link mirrors from its original. Editing any of them on either card edits both.
export const SYNCED_FIELDS = ["text", "content", "profileImageUrl", "locationIcon"] as const;

export function findNode(canvases: Record<string, CanvasRow>, id: string): { canvasType: string; node: StoryNode } | null {
  for (const [canvasType, canvas] of Object.entries(canvases)) {
    const node = canvas.nodes.find((n) => n.id === id);
    if (node) return { canvasType, node };
  }
  return null;
}

/** The board a card opens (same rule as StoryBoard's openNode). */
export function boardKeyOf(node: StoryNode): string {
  return node.linkedCanvasId || `${node.type}-canvas-${node.id}`;
}

/** A human name for a board: the card that opens it, or "the main board". */
export function boardLabel(canvases: Record<string, CanvasRow>, canvasType: string): string {
  if (canvasType === "main") return "the main board";
  for (const canvas of Object.values(canvases)) {
    for (const n of canvas.nodes) {
      if (!n.refNodeId && (n.type === "folder" || n.type === "character" || n.type === "location" || n.type === "event") && boardKeyOf(n) === canvasType) {
        return n.text || n.title || "Untitled";
      }
    }
  }
  return "another board";
}

export interface LinkableCard {
  node: StoryNode;
  canvasType: string;
  board: string;
}

/** Every original character/location in the story (never a link), for the "link existing" picker. */
export function linkableCards(canvases: Record<string, CanvasRow>): LinkableCard[] {
  const out: LinkableCard[] = [];
  for (const [canvasType, canvas] of Object.entries(canvases)) {
    for (const node of canvas.nodes) {
      if (node.refNodeId || !(LINKABLE_TYPES as readonly string[]).includes(node.type ?? "")) continue;
      out.push({ node, canvasType, board: boardLabel(canvases, canvasType) });
    }
  }
  return out.sort((a, b) => (a.node.text || "").localeCompare(b.node.text || ""));
}

/** The fields a new link card starts with (the caller adds id/position). */
export function linkFields(original: StoryNode): Partial<StoryNode> {
  const fields: Partial<StoryNode> = {
    type: original.type,
    refNodeId: original.id,
    linkedCanvasId: boardKeyOf(original),
    width: original.width,
    height: original.height,
  };
  for (const f of SYNCED_FIELDS) if (original[f] !== undefined) (fields as Record<string, unknown>)[f] = original[f];
  return fields;
}

/**
 * Extra writes an edit needs so links and originals stay in step: editing a link's name
 * renames the original and its other links; editing an original updates its links' copies.
 * The edited node itself is left to the caller.
 */
export function linkedEdits(
  canvases: Record<string, CanvasRow>,
  id: string,
  patch: Partial<StoryNode>
): { canvasType: string; nodeId: string; patch: Partial<StoryNode> }[] {
  const synced: Partial<StoryNode> = {};
  for (const f of SYNCED_FIELDS) if (f in patch) (synced as Record<string, unknown>)[f] = patch[f];
  if (Object.keys(synced).length === 0) return [];
  const hit = findNode(canvases, id);
  if (!hit) return [];
  const originalId = hit.node.refNodeId ?? hit.node.id;
  const out: { canvasType: string; nodeId: string; patch: Partial<StoryNode> }[] = [];
  const original = hit.node.refNodeId ? findNode(canvases, originalId) : null;
  if (original) out.push({ canvasType: original.canvasType, nodeId: originalId, patch: synced });
  if (hit.node.refNodeId && !original) return out; // a missing original: only the link itself changes
  for (const [canvasType, canvas] of Object.entries(canvases)) {
    for (const n of canvas.nodes) if (n.refNodeId === originalId && n.id !== id) out.push({ canvasType, nodeId: n.id, patch: synced });
  }
  return out;
}
