import type { StoryConnection, StoryNode } from "./types";
import { subCanvasTemplates } from "./story-templates";

/*
 * Which starting layout a board gets the FIRST time it's opened, same rules as storycanvas:
 * the Story Planner's folders get their own layouts, and character, place and event cards get a
 * profile layout. Only boards that have never been saved are filled; a board someone cleared stays empty.
 */
export function boardTemplateKey(canvasType: string, node: StoryNode): string | null {
  const has = (s: string) => canvasType.includes(s) || node.id.includes(s);
  if (has("characters-folder")) return "characters-folder";
  if (has("plot-folder")) return "plot-folder";
  if (has("world-folder")) return "world-folder";
  if (has("timeline-folder")) return "folder-canvas-timeline-folder";
  if (has("country-")) return "country";
  if (node.type === "character") return "character";
  if (node.type === "location") return "location";
  if (node.type === "event") return "event";
  return null;
}

/** The template's cards and links with fresh ids (and list membership remapped). */
export function instantiateBoardTemplate(key: string): { nodes: StoryNode[]; connections: StoryConnection[] } | null {
  const t = subCanvasTemplates[key];
  if (!t || !t.nodes.length) return null;
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const ids: Record<string, string> = {};
  for (const n of t.nodes) ids[n.id] = `${n.id}-${stamp}`;
  const nodes = t.nodes.map((n: StoryNode) => ({
    ...n,
    id: ids[n.id],
    ...(n.childIds ? { childIds: n.childIds.map((c) => ids[c] ?? c) } : {}),
    ...(n.parentId ? { parentId: ids[n.parentId] ?? n.parentId } : {}),
  })) as StoryNode[];
  const connections = (t.connections as StoryConnection[]).map((c) => ({ ...c, id: `${c.id}-${stamp}`, from: ids[c.from] ?? c.from, to: ids[c.to] ?? c.to }));
  return { nodes, connections };
}
