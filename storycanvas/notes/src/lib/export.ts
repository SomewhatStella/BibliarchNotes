// A simpler export than storycanvas's own (which supports multiple output
// formats) — walks the same board tree via linkedCanvasId and produces one
// readable plain-text document. Good enough to read a whole story outside
// the app; a .docx export is a reasonable fast-follow if asked for.
import { createClient } from "@/lib/supabase/client";
import type { CanvasRow, StoryNode } from "@/lib/types";
import { chartSummary } from "@/lib/charts";

async function loadAllCanvases(storyId: string): Promise<Map<string, CanvasRow>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("canvas_data").select("*").eq("story_id", storyId);
  if (error) throw error;
  const map = new Map<string, CanvasRow>();
  for (const row of data ?? []) {
    map.set(row.canvas_type, {
      id: row.id,
      story_id: row.story_id,
      canvas_type: row.canvas_type,
      nodes: (row.nodes as unknown as StoryNode[]) ?? [],
      connections: (row.connections as unknown as CanvasRow["connections"]) ?? [],
      palette: row.palette,
      updated_at: row.updated_at,
    });
  }
  return map;
}

function nodeText(n: StoryNode): string {
  if (n.type === "event") return [n.title, n.durationText, n.summary].filter(Boolean).join(" — ");
  const parts = [n.text];
  if (n.content) parts.push(n.content);
  return parts.filter(Boolean).join(": ");
}

function walk(canvasType: string, canvases: Map<string, CanvasRow>, depth: number, out: string[], seen: Set<string>) {
  if (seen.has(canvasType)) return; // guards a pathological cycle, not expected in practice
  seen.add(canvasType);
  const canvas = canvases.get(canvasType);
  if (!canvas) return;

  const indent = "  ".repeat(depth);
  const topLevel = canvas.nodes.filter((n) => !n.parentId);

  for (const n of topLevel) {
    if (n.type === "list") {
      out.push(`${indent}${n.text}`);
      const children = (n.childIds ?? []).map((id) => canvas.nodes.find((c) => c.id === id)).filter((c): c is StoryNode => !!c);
      for (const child of children) out.push(`${indent}  - ${nodeText(child)}`);
      continue;
    }
    if (n.type === "relationship-canvas") {
      const rel = n.relationshipData;
      if (rel && rel.relationships.length > 0) {
        out.push(`${indent}${n.text || "Relationships"}:`);
        for (const r of rel.relationships) {
          const a = rel.selectedCharacters.find((c) => c.id === r.fromCharacterId)?.name ?? "?";
          const b = rel.selectedCharacters.find((c) => c.id === r.toCharacterId)?.name ?? "?";
          out.push(`${indent}  - ${a} & ${b}: ${r.relationshipType}${r.label ? ` (${r.label})` : ""}`);
        }
      }
      continue;
    }
    if (n.type === "table") {
      out.push(`${indent}${n.text}:`);
      for (const row of n.tableData ?? []) out.push(`${indent}  - ${Object.values(row).join(" | ")}`);
      continue;
    }
    if (n.type === "chart") {
      out.push(`${indent}${n.text || "Chart"}: ${chartSummary(n.chart)}`);
      continue;
    }
    // A section frame's label reads as a heading; other shapes and pen doodles carry no text.
    if (n.type === "shape") {
      if (n.shape?.kind === "frame" && n.text) out.push(`${indent}── ${n.text} ──`);
      continue;
    }
    if (n.type === "image" || n.type === "line" || n.type === "drawing") continue;

    out.push(`${indent}${nodeText(n)}`);
    if (n.linkedCanvasId && canvases.has(n.linkedCanvasId)) {
      walk(n.linkedCanvasId, canvases, depth + 1, out, seen);
    }
  }
}

export async function exportStoryAsText(storyId: string, storyTitle: string): Promise<string> {
  const canvases = await loadAllCanvases(storyId);
  const out: string[] = [storyTitle, "=".repeat(storyTitle.length), ""];
  walk("main", canvases, 0, out, new Set());
  return out.join("\n");
}

export function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
