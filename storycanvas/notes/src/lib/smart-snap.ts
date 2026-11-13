// Figma-style alignment snapping: a dragged card's edges and centre lines
// pull onto other cards' edges and centre lines when they come close, and
// the lines they share are returned as guides to draw. Pure, so it's tested
// in tests/smart-snap.test.mjs.

export interface Box { x: number; y: number; w: number; h: number }
/** axis "x" = a vertical guide at x = pos running from y = from to y = to; "y" the horizontal equivalent. */
export interface Guide { axis: "x" | "y"; pos: number; from: number; to: number }

const lines = (start: number, size: number) => [start, start + size / 2, start + size];

function bestOffset(sources: number[], targets: number[], threshold: number): number | null {
  let best: number | null = null;
  for (const s of sources) {
    for (const t of targets) {
      const d = t - s;
      if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
  }
  return best;
}

/** Guides for every line `box` now shares with another box, merged per position. */
export function guidesFor(box: Box, others: Box[], which: { x: number[]; y: number[] } = { x: lines(box.x, box.w), y: lines(box.y, box.h) }): Guide[] {
  const merged = new Map<string, Guide>();
  const add = (axis: "x" | "y", pos: number, from: number, to: number) => {
    const key = `${axis}:${Math.round(pos * 2) / 2}`;
    const g = merged.get(key);
    if (g) { g.from = Math.min(g.from, from); g.to = Math.max(g.to, to); }
    else merged.set(key, { axis, pos, from, to });
  };
  for (const o of others) {
    for (const s of which.x) for (const t of lines(o.x, o.w)) {
      if (Math.abs(s - t) < 0.5) add("x", t, Math.min(box.y, o.y), Math.max(box.y + box.h, o.y + o.h));
    }
    for (const s of which.y) for (const t of lines(o.y, o.h)) {
      if (Math.abs(s - t) < 0.5) add("y", t, Math.min(box.x, o.x), Math.max(box.x + box.w, o.x + o.w));
    }
  }
  return [...merged.values()];
}

/**
 * Snap a moving box. Each axis snaps independently: `x`/`y` are the snapped
 * positions, or null when nothing was close enough on that axis (the caller
 * then falls back to grid snap or free placement).
 */
export function snapMove(box: Box, others: Box[], threshold: number): { x: number | null; y: number | null; guides: Guide[] } {
  const xs = others.flatMap((o) => lines(o.x, o.w));
  const ys = others.flatMap((o) => lines(o.y, o.h));
  const dx = bestOffset(lines(box.x, box.w), xs, threshold);
  const dy = bestOffset(lines(box.y, box.h), ys, threshold);
  const snapped = { ...box, x: box.x + (dx ?? 0), y: box.y + (dy ?? 0) };
  const all = guidesFor(snapped, others);
  // Only draw guides on an axis that actually snapped — a coincidental
  // alignment on the free axis would flicker on and off as the mouse moves.
  const guides = all.filter((g) => (g.axis === "x" ? dx !== null : dy !== null));
  return { x: dx === null ? null : snapped.x, y: dy === null ? null : snapped.y, guides };
}

/** Snap the right and bottom edges of a box being resized from its bottom-right corner. */
export function snapResize(box: Box, others: Box[], threshold: number): { w: number | null; h: number | null; guides: Guide[] } {
  const xs = others.flatMap((o) => lines(o.x, o.w));
  const ys = others.flatMap((o) => lines(o.y, o.h));
  const dx = bestOffset([box.x + box.w], xs, threshold);
  const dy = bestOffset([box.y + box.h], ys, threshold);
  const snapped = { ...box, w: box.w + (dx ?? 0), h: box.h + (dy ?? 0) };
  const guides = guidesFor(snapped, others, { x: dx === null ? [] : [snapped.x + snapped.w], y: dy === null ? [] : [snapped.y + snapped.h] });
  return { w: dx === null ? null : snapped.w, h: dy === null ? null : snapped.h, guides };
}
