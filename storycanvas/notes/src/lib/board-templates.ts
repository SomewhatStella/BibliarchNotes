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

// Smallest size Notes draws each card at (see MIN_RENDER_SIZE in NodeCard): a template card set
// smaller than this used to spill over its neighbours.
const MIN: Partial<Record<string, { w: number; h: number }>> = { text: { w: 240, h: 120 }, event: { w: 240, h: 120 }, "relationship-canvas": { w: 480, h: 360 } };
const GAP = 20;

/**
 * Makes a storycanvas template sit properly in the new Notes: lists and tables are sized to what
 * they hold, cards that were meant to line up share exact columns and widths, and anything that
 * would overlap is moved down with an even gap. The design otherwise stays as it was.
 */
export function tidyTemplateNodes(input: StoryNode[]): StoryNode[] {
  const nodes = input.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const top = nodes.filter((n) => !n.parentId);
  // 1) sizes that fit the content
  for (const n of top) {
    const min = MIN[n.type ?? "text"];
    if (min) { n.width = Math.max(n.width, min.w); n.height = Math.max(n.height, min.h); }
    if (n.type === "list") {
      const members = (n.childIds ?? []).filter((id) => byId.has(id)).length;
      n.height = Math.max(150, 52 + members * 66 + 12);
    }
    if (n.type === "table" && n.tableData?.length) {
      n.height = n.tableData.length * 28 + 10;
      // Column widths from what each column holds; an empty column gets room to write in, a checkbox column stays narrow.
      const cols = Object.keys(n.tableData[0] ?? {});
      const need = cols.map((c) => { const longest = Math.max(...n.tableData!.map((r) => String(r[c] ?? "").length)); return longest === 0 ? 12 : Math.max(2, longest); });
      const total = need.reduce((a, b) => a + b, 0);
      let widths = need.map((v) => Math.max(12, (v / total) * 100));
      const sum = widths.reduce((a, b) => a + b, 0);
      widths = widths.map((w) => Math.round((w / sum) * 1000) / 10);
      n.columnWidths = Object.fromEntries(cols.map((c, i) => [c, widths[i] ?? 100 / cols.length]));
    }
    if ((n.type === "text" || n.type === undefined) && (n.content || n.text)) {
      // Room for the title line plus the wrapped description (about 7.6px per character at 15px).
      const perLine = Math.max(10, Math.floor((n.width - 24) / 7.6));
      const lines = String(n.content ?? "").split(/\r?\n/).reduce((a, l) => a + Math.max(1, Math.ceil(l.length / perLine)), 0);
      n.height = Math.max(n.height, 56 + lines * 24 + 12);
    }
  }
  // 2) columns: left edges within 24px become one column; widths within 30px of each other match
  const xs = [...new Set(top.map((n) => n.x))].sort((a, b) => a - b);
  const snapX = new Map<number, number>();
  for (const x of xs) { const anchor = [...snapX.values()].find((v) => Math.abs(v - x) <= 24); snapX.set(x, anchor ?? x); }
  for (const n of top) n.x = snapX.get(n.x) ?? n.x;
  const columns = new Map<number, StoryNode[]>();
  for (const n of top) columns.set(n.x, [...(columns.get(n.x) ?? []), n]);
  for (const col of columns.values()) {
    for (const n of col) {
      const wider = col.filter((m) => m !== n && Math.abs(m.width - n.width) <= 30 && m.width > n.width);
      if (wider.length) n.width = Math.max(...wider.map((m) => m.width));
    }
  }
  // 3) stack each card straight below whatever sits above it in its columns, with an even gap:
  //    nothing overlaps, and no gap is left where a card above got shorter.
  const firstRow = Math.min(...top.map((n) => n.y));
  const placed: StoryNode[] = [];
  for (const n of [...top].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const above = placed.filter((m) => n.x < m.x + m.width && n.x + n.width > m.x);
    n.y = above.length ? Math.max(...above.map((m) => m.y + m.height + GAP)) : firstRow;
    placed.push(n);
  }
  return nodes;
}

/** The template's cards with fresh ids (list membership remapped), tidied, and without linking arrows. */
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
  return { nodes: tidyTemplateNodes(nodes), connections: [] };
}
