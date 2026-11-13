// Pure geometry for the Pen tool. No imports beyond types so the node tests
// can load it straight from source.
import type { DrawingData, DrawingStroke } from "./types";

export type Pt = { x: number; y: number };
export interface Box { x: number; y: number; w: number; h: number }

/** A stroke in board (world) coordinates, before it's packed into a node. */
export interface WorldStroke { id: string; points: Pt[]; color: string; width: number }

function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Ramer–Douglas–Peucker. A raw pointer stroke has a point every few pixels;
 * most of them add nothing but JSON weight (and realtime broadcast size).
 * Iterative so a very long scribble can't blow the stack.
 */
export function simplifyPoints(points: Pt[], epsilon: number): Pt[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segDist(points[i]!, points[s]!, points[e]!);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx !== -1 && maxD > epsilon) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Quadratic-smoothed SVG path: each recorded point becomes a control point
 * and the curve runs through the midpoints between them, so corners left by
 * simplification read as a hand-drawn curve rather than a polyline.
 */
export function smoothPath(points: Pt[]): string {
  const r = (v: number) => Math.round(v * 10) / 10;
  if (points.length === 0) return "";
  const p0 = points[0]!;
  // A single tap still leaves a dot (round line caps draw it).
  if (points.length === 1) return `M ${r(p0.x)} ${r(p0.y)} l 0.01 0`;
  if (points.length === 2) return `M ${r(p0.x)} ${r(p0.y)} L ${r(points[1]!.x)} ${r(points[1]!.y)}`;
  let d = `M ${r(p0.x)} ${r(p0.y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!, n = points[i + 1]!;
    d += ` Q ${r(p.x)} ${r(p.y)} ${r((p.x + n.x) / 2)} ${r((p.y + n.y) / 2)}`;
  }
  const last = points[points.length - 1]!;
  return d + ` L ${r(last.x)} ${r(last.y)}`;
}

export function flatToPoints(flat: number[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ x: flat[i]!, y: flat[i + 1]! });
  return out;
}

export function strokesBounds(strokes: WorldStroke[]): Box | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    const pad = s.width / 2;
    for (const p of s.points) {
      minX = Math.min(minX, p.x - pad); minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad); maxY = Math.max(maxY, p.y + pad);
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

const PAD = 6; // room around the ink so round caps and the selection outline aren't clipped

/** Packs world strokes into a node's position, size and relative `drawing` data. */
export function packDrawing(strokes: WorldStroke[]): { x: number; y: number; width: number; height: number; drawing: DrawingData } | null {
  const b = strokesBounds(strokes);
  if (!b) return null;
  const x = Math.round(b.x - PAD), y = Math.round(b.y - PAD);
  const w = Math.ceil(b.w + PAD * 2), h = Math.ceil(b.h + PAD * 2);
  const round = (v: number) => Math.round(v * 10) / 10;
  return {
    x, y, width: w, height: h,
    drawing: {
      w, h,
      strokes: strokes.map((s) => ({ id: s.id, color: s.color, width: s.width, points: s.points.flatMap((p) => [round(p.x - x), round(p.y - y)]) })),
    },
  };
}

/** A drawing node's strokes back in world coordinates, honouring any resize since it was packed. */
export function unpackDrawing(node: { x: number; y: number; width: number; height: number; drawing?: DrawingData }): WorldStroke[] {
  const d = node.drawing;
  if (!d) return [];
  const sx = d.w > 0 ? node.width / d.w : 1, sy = d.h > 0 ? node.height / d.h : 1;
  return d.strokes.map((s: DrawingStroke) => ({
    id: s.id, color: s.color, width: s.width,
    points: flatToPoints(s.points).map((p) => ({ x: node.x + p.x * sx, y: node.y + p.y * sy })),
  }));
}

/** Whether a point (world) touches a stroke, within `radius` beyond its own half-width. */
export function hitsStroke(stroke: WorldStroke, p: Pt, radius: number): boolean {
  const reach = stroke.width / 2 + radius;
  const pts = stroke.points;
  if (pts.length === 1) return Math.hypot(p.x - pts[0]!.x, p.y - pts[0]!.y) <= reach;
  for (let i = 0; i + 1 < pts.length; i++) if (segDist(p, pts[i]!, pts[i + 1]!) <= reach) return true;
  return false;
}

/** Boxes within `gap` of each other — nearby strokes join one doodle, far ones start a new one. */
export function boxesNear(a: Box, b: Box, gap: number): boolean {
  return a.x - gap < b.x + b.w && a.x + a.w + gap > b.x && a.y - gap < b.y + b.h && a.y + a.h + gap > b.y;
}
