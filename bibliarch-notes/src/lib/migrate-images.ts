// Self-healing pass for legacy nodes carrying a base64 data: URL instead of
// a storage path. Runs once after a story loads: finds every offending
// field across every board, uploads it, and rewrites the node — quietly, in
// the background, one at a time so it doesn't hammer Storage. Once a node is
// migrated it's a plain path forever after, so this naturally becomes a
// no-op on every subsequent load.
import { isBase64Image, migrateBase64Image } from "./storage";
import type { CanvasRow, StoryNode } from "./types";

export interface ImageField {
  canvasType: string;
  nodeId: string;
  field: "imageUrl" | "profileImageUrl";
  dataUrl: string;
}

export function findLegacyImages(canvases: Record<string, CanvasRow>): ImageField[] {
  const found: ImageField[] = [];
  for (const canvas of Object.values(canvases)) {
    for (const node of canvas.nodes) {
      if (isBase64Image(node.imageUrl)) {
        found.push({ canvasType: canvas.canvas_type, nodeId: node.id, field: "imageUrl", dataUrl: node.imageUrl! });
      }
      if (isBase64Image(node.profileImageUrl)) {
        found.push({ canvasType: canvas.canvas_type, nodeId: node.id, field: "profileImageUrl", dataUrl: node.profileImageUrl! });
      }
    }
  }
  return found;
}

export async function migrateLegacyImages(
  canvases: Record<string, CanvasRow>,
  onOneMigrated: (canvasType: string, nodeId: string, field: "imageUrl" | "profileImageUrl", path: string) => void,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const targets = findLegacyImages(canvases);
  if (targets.length === 0) return 0;
  let done = 0;
  for (const t of targets) {
    const path = await migrateBase64Image(t.dataUrl, t.nodeId);
    if (path) {
      onOneMigrated(t.canvasType, t.nodeId, t.field, path);
    }
    done++;
    onProgress?.(done, targets.length);
  }
  return done;
}

export function nodeHasLegacyImage(node: StoryNode): boolean {
  return isBase64Image(node.imageUrl) || isBase64Image(node.profileImageUrl);
}
