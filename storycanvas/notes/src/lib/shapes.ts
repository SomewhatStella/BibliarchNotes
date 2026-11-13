// Shape and drawing rules shared by the canvas, the shape card and the
// inspector. Pure (type imports only) for node tests.
import type { ShapeData, ShapeKind, StoryNode } from "./types";

export const DIVIDER_THICKNESS = 16; // the hit area; the visible rule is the stroke width

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  rect: "Rectangle",
  rounded: "Rounded rectangle",
  ellipse: "Ellipse",
  divider: "Divider line",
  frame: "Section frame",
};

export function shapeDefaults(kind: ShapeKind, orientation: "horizontal" | "vertical" = "horizontal"): Pick<StoryNode, "width" | "height" | "text" | "shape"> {
  switch (kind) {
    case "frame":
      return { width: 640, height: 400, text: "Section", shape: { kind, strokeStyle: "dashed", strokeWidth: 2 } };
    case "divider":
      return orientation === "vertical"
        ? { width: DIVIDER_THICKNESS, height: 360, text: "", shape: { kind, orientation, strokeWidth: 2 } }
        : { width: 480, height: DIVIDER_THICKNESS, text: "", shape: { kind, orientation, strokeWidth: 2 } };
    case "ellipse":
      return { width: 220, height: 160, text: "", shape: { kind, strokeWidth: 2 } };
    default:
      return { width: 240, height: 160, text: "", shape: { kind, strokeWidth: 2 } };
  }
}

/** Shapes and frames that render below cards (and below connection arrows). */
export function isBehindCards(node: StoryNode): boolean {
  if (node.type !== "shape") return false;
  return node.shape?.kind === "frame" || node.shape?.layer !== "front";
}

/**
 * z-index for a shape: frames under other back-layer shapes, both under
 * everything else (connections are at 0, cards at 1+). Negative values work
 * because the board layer is its own stacking context (it's transformed).
 */
export function shapeZIndex(node: StoryNode): number {
  if (node.shape?.kind === "frame") return -2;
  if (isBehindCards(node)) return -1;
  return node.zIndex ?? 1;
}

/** The size a resize gesture may set: dividers keep their thickness, small doodles may stay small. */
export function clampResize(node: StoryNode, w: number, h: number): { w: number; h: number } {
  if (node.type === "shape" && node.shape?.kind === "divider") {
    return node.shape.orientation === "vertical"
      ? { w: DIVIDER_THICKNESS, h: Math.max(40, h) }
      : { w: Math.max(40, w), h: DIVIDER_THICKNESS };
  }
  if (node.type === "shape" || node.type === "drawing") return { w: Math.max(24, w), h: Math.max(24, h) };
  if (node.type === "chart") return { w: Math.max(200, w), h: Math.max(200, h) };
  return { w: Math.max(120, w), h: Math.max(40, h) };
}

/** Switching a divider between horizontal and vertical swaps its long side. */
export function withOrientation(node: StoryNode, orientation: "horizontal" | "vertical"): Partial<StoryNode> {
  const long = Math.max(node.width, node.height);
  const shape: ShapeData = { ...(node.shape ?? { kind: "divider" }), orientation };
  return orientation === "vertical" ? { width: DIVIDER_THICKNESS, height: long, shape } : { width: long, height: DIVIDER_THICKNESS, shape };
}

/** Kinds that carry no content and must never be dropped into a folder or list. */
export function isDecoration(node: StoryNode): boolean {
  return node.type === "shape" || node.type === "drawing" || node.type === "line";
}
