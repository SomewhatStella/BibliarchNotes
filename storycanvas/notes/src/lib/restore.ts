// Putting a deleted card back where it was (Recently deleted → Restore).
// Pure and import-free so `node --test` can load it directly.
import type { BoardState } from "./node-merge";
import type { StoryConnection, StoryNode } from "./types";

export interface DeletedCard {
  node: StoryNode;
  members: StoryNode[]; // a list's member cards as they were at delete time
  connections: StoryConnection[]; // arrows that touched it
}

/** What a delete removes besides the card itself, captured so Restore can bring it back. */
export function captureDeleted(board: BoardState, nodeId: string): DeletedCard | null {
  const node = board.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const members = (node.childIds ?? []).map((id) => board.nodes.find((n) => n.id === id)).filter(Boolean) as StoryNode[];
  const connections = board.connections.filter((c) => c.from === nodeId || c.to === nodeId);
  return { node, members, connections };
}

/** The board with the card restored, or null when it's already there. */
export function restoreDeleted(board: BoardState, rec: DeletedCard): BoardState | null {
  const byId = new Map(board.nodes.map((n) => [n.id, n]));
  if (byId.has(rec.node.id)) return null;
  const node: StoryNode = { ...rec.node };
  let nodes = [...board.nodes];

  // A list gets its members back: ones still on the board rejoin it, ones that were deleted since come back too.
  if (node.childIds?.length) {
    const kept: string[] = [];
    for (const id of node.childIds) {
      const live = byId.get(id);
      if (live) {
        if (live.parentId && live.parentId !== node.id && byId.has(live.parentId)) continue; // it joined another list since
        nodes = nodes.map((n) => (n.id === id ? { ...n, parentId: node.id } : n));
        kept.push(id);
      } else {
        const saved = rec.members.find((m) => m.id === id);
        if (saved) {
          nodes.push({ ...saved, parentId: node.id });
          kept.push(id);
        }
      }
    }
    node.childIds = kept;
  }

  // A card that sat in a list goes back into it if the list is still there.
  if (node.parentId) {
    const parent = byId.get(node.parentId);
    if (parent) nodes = nodes.map((n) => (n.id === parent.id ? { ...n, childIds: [...(n.childIds ?? []).filter((c) => c !== node.id), node.id] } : n));
    else node.parentId = undefined;
  }
  nodes.push(node);

  const present = new Set(nodes.map((n) => n.id));
  const connIds = new Set(board.connections.map((c) => c.id));
  const connections = [...board.connections, ...rec.connections.filter((c) => !connIds.has(c.id) && present.has(c.from) && present.has(c.to))];
  return { nodes, connections, palette: board.palette };
}
