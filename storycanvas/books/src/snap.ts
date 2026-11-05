/*
 * Smart guides for dragging ornaments and pictures. While moving, the item's
 * edges and centre snap to the page centre and edges, the margins, the top and
 * bottom of each paragraph's text, and other ornaments and pictures. Hold Alt to
 * move freely. All coordinates are viewport pixels.
 */
export type Box = {left: number; top: number; width: number; height: number};
type Guide = {axis: 'x' | 'y'; at: number; from: number; to: number; label?: string; gap?: boolean};
/** `between` targets are the midpoint of the empty space between two lines of text: only the item's middle snaps to them, and they win ties. */
type Target = {at: number; from: number; to: number; label?: string; between?: {above: number; below: number}};

const THRESHOLD = 7;

function textBounds(block: Element): {top: number; bottom: number} | null {
  const range = document.createRange();
  range.selectNodeContents(block);
  const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  return {top: Math.min(...rects.map(r => r.top)), bottom: Math.max(...rects.map(r => r.bottom))};
}

function targets(page: HTMLElement, exclude: Element | null) {
  const p = page.getBoundingClientRect();
  const xs: Target[] = [], ys: Target[] = [];
  const vSpan = {from: p.top, to: p.bottom}, hSpan = {from: p.left, to: p.right};
  xs.push({at: p.left, ...vSpan}, {at: p.right, ...vSpan}, {at: p.left + p.width / 2, ...vSpan, label: 'center'});
  ys.push({at: p.top, ...hSpan}, {at: p.bottom, ...hSpan}, {at: p.top + p.height / 2, ...hSpan, label: 'middle'});
  const body = page.querySelector('.pagination-body');
  if (body) {
    const b = body.getBoundingClientRect();
    xs.push({at: b.left, ...vSpan, label: 'margin'}, {at: b.right, ...vSpan, label: 'margin'});
    ys.push({at: b.top, ...hSpan, label: 'margin'}, {at: b.bottom, ...hSpan, label: 'margin'});
    const texts: {top: number; bottom: number}[] = [];
    for (const block of Array.from(body.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li'))) {
      if (exclude?.contains(block)) continue;
      const t = textBounds(block);
      if (!t) continue;
      texts.push(t);
      ys.push({at: t.top, from: b.left, to: b.right, label: 'text top'}, {at: t.bottom, from: b.left, to: b.right, label: 'text bottom'});
    }
    // Exactly halfway between two pieces of text (empty lines in between are part of the gap).
    texts.sort((a, c) => a.top - c.top);
    for (let i = 1; i < texts.length; i++) {
      const above = texts[i - 1].bottom, below = texts[i].top;
      if (below - above < 4) continue;
      ys.push({at: (above + below) / 2, from: b.left, to: b.right, label: 'between text', between: {above, below}});
    }
  }
  for (const other of Array.from(page.querySelectorAll<HTMLElement>('[data-decal-id],[data-placed-image]'))) {
    if (exclude && (other === exclude || exclude.contains(other) || other.contains(exclude))) continue;
    const r = other.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    xs.push({at: r.left, from: r.top, to: r.bottom}, {at: r.right, from: r.top, to: r.bottom}, {at: r.left + r.width / 2, from: r.top, to: r.bottom});
    ys.push({at: r.top, from: r.left, to: r.right}, {at: r.bottom, from: r.left, to: r.right}, {at: r.top + r.height / 2, from: r.left, to: r.right});
  }
  return {xs, ys};
}

function best(edges: number[], list: Target[]) {
  // Centring in a gap between text is deliberate, so it beats edge snaps nearby.
  const pick = (only: boolean) => {
    let found: {delta: number; t: Target} | null = null;
    for (const t of list) {
      if (!!t.between !== only) continue;
      for (const [i, e] of edges.entries()) {
        if (t.between && edges.length === 3 && i !== 1) continue;
        const d = t.at - e;
        if (Math.abs(d) <= THRESHOLD + (t.between ? 3 : 0) && (!found || Math.abs(d) < Math.abs(found.delta))) found = {delta: d, t};
      }
    }
    return found;
  };
  return pick(true) ?? pick(false);
}

/** Returns how far to nudge the proposed box so it lines up, and shows guides. */
export function snap(box: Box, page: HTMLElement, exclude: Element | null, free = false): {dx: number; dy: number} {
  if (free) { clearGuides(); return {dx: 0, dy: 0}; }
  const {xs, ys} = targets(page, exclude);
  const x = best([box.left, box.left + box.width / 2, box.left + box.width], xs);
  const y = best([box.top, box.top + box.height / 2, box.top + box.height], ys);
  const dx = x?.delta ?? 0, dy = y?.delta ?? 0;
  const guides: Guide[] = [];
  if (x) guides.push({axis: 'x', at: x.t.at, from: Math.min(x.t.from, box.top + dy), to: Math.max(x.t.to, box.top + dy + box.height), label: x.t.label});
  if (y) guides.push({axis: 'y', at: y.t.at, from: Math.min(y.t.from, box.left + dx), to: Math.max(y.t.to, box.left + dx + box.width), label: y.t.label});
  if (y?.t.between) {
    // Two equal-length markers: text above → item, item → text below.
    const mid = box.left + dx + box.width / 2, top = box.top + dy, bottom = top + box.height;
    const {above, below} = y.t.between;
    if (top > above + 1) guides.push({axis: 'x', at: mid, from: above, to: top, gap: true});
    if (below > bottom + 1) guides.push({axis: 'x', at: mid, from: bottom, to: below, gap: true});
  }
  showGuides(guides);
  return {dx, dy};
}

let layer: HTMLDivElement | null = null;
function showGuides(guides: Guide[]) {
  if (!layer) { layer = document.createElement('div'); layer.className = 'snap-guides'; layer.setAttribute('aria-hidden', 'true'); document.body.append(layer); }
  layer.replaceChildren(...guides.map(g => {
    const line = document.createElement('div');
    line.className = `snap-guide snap-guide-${g.axis}${g.gap ? ' snap-gap' : ''}`;
    if (g.axis === 'x') Object.assign(line.style, {left: g.at + 'px', top: g.from + 'px', height: g.to - g.from + 'px'});
    else Object.assign(line.style, {top: g.at + 'px', left: g.from + 'px', width: g.to - g.from + 'px'});
    if (g.label) { const tag = document.createElement('span'); tag.textContent = g.label; line.append(tag); }
    return line;
  }));
}
export function clearGuides() { layer?.replaceChildren(); }

/** Resizing: snap one moving vertical edge (viewport x) to the same targets. */
export function snapEdgeX(x: number, top: number, bottom: number, page: HTMLElement, exclude: Element | null, free = false): number {
  if (free) { clearGuides(); return 0; }
  const hit = best([x], targets(page, exclude).xs);
  if (!hit) { clearGuides(); return 0; }
  showGuides([{axis: 'x', at: hit.t.at, from: Math.min(hit.t.from, top), to: Math.max(hit.t.to, bottom), label: hit.t.label}]);
  return hit.delta;
}
