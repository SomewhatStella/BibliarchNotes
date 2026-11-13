"use client";

import { useMemo } from "react";
import { useCanvasStore } from "./store";
import { SYNCED_FIELDS, boardLabel, findNode } from "./character-links";
import type { StoryNode } from "./types";

export interface LinkInfo {
  /** The card this link points at, or null when it was deleted. */
  original: StoryNode | null;
  /** Where the original lives, e.g. "Mira" or "the main board". */
  board: string | null;
  /** The link with the original's live name/picture/summary laid over it. */
  shown: StoryNode;
}

/** For a linked card, its live original; null for ordinary cards. */
export function useCharacterLink(node: StoryNode): LinkInfo | null {
  // Ordinary cards select a constant, so only links re-render on store changes.
  const canvases = useCanvasStore((s) => (node.refNodeId ? s.canvases : null));
  return useMemo(() => {
    if (!node.refNodeId || !canvases) return null;
    const hit = findNode(canvases, node.refNodeId);
    if (!hit) return { original: null, board: null, shown: node };
    const shown: StoryNode = { ...node };
    for (const f of SYNCED_FIELDS) (shown as unknown as Record<string, unknown>)[f] = hit.node[f];
    return { original: hit.node, board: boardLabel(canvases, hit.canvasType), shown };
  }, [canvases, node]);
}
