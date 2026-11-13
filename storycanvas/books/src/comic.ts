/*
 * Comic / manga pages. A comic page is one fixed page divided into panels by a
 * layout template. Each panel shows the writer's own art (a picture from the book's
 * picture library, referenced by id), with fill/fit, zoom and position. Speech
 * bubbles, thought bubbles and captions sit on top. Everything is plain data so the
 * editor, print/PDF and e-book exports draw the same thing.
 */

export type ComicLayoutId = 'splash' | 'yonkoma' | 'three-tier' | 'grid-2x2' | 'grid-2x3' | 'big-two' | 'dynamic-5';
export type Point = [number, number];
export type ComicBubbleKind = 'speech' | 'thought' | 'caption';
export type ComicTail = 'none' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
/** x, y and width are percentages of the whole page, so bubbles can cross panel borders. */
export type ComicBubble = {id: string; kind: ComicBubbleKind; text: string; x: number; y: number; width: number; sizePt: number; tail?: ComicTail};
export type ComicPanel = {
  /** A picture in the book's picture library (`book.images`). */
  assetId?: string;
  fit: 'cover' | 'contain';
  /** Where the picture sits in the panel, 0–100 (like CSS object-position). */
  focusX: number;
  focusY: number;
  /** 1 = just fills (or fits) the panel; up to 4. */
  zoom: number;
  alt?: string;
  bubbles?: ComicBubble[];
};
export type ComicPage = {layout: ComicLayoutId; rtl?: boolean; gutterMm: number; marginMm: number; borderMm: number; panels: ComicPanel[]};

export const MAX_PANELS = 12;
export const MAX_BUBBLES = 12;

/** Panels in left-to-right reading order, in a 0–1 square that stretches to the page's art area. */
export const COMIC_LAYOUTS: {id: ComicLayoutId; name: string; help: string; panels: Point[][]}[] = [
  {id: 'dynamic-5', name: 'Action (5 panels)', help: 'Slanted gutters for fast scenes', panels: [
    [[0, 0], [0.62, 0], [0.55, 0.318], [0, 0.34]],
    [[0.62, 0], [1, 0], [1, 0.3], [0.55, 0.318]],
    [[0, 0.34], [1, 0.3], [1, 0.7], [0, 0.66]],
    [[0, 0.66], [0.42, 0.6768], [0.48, 1], [0, 1]],
    [[0.42, 0.6768], [1, 0.7], [1, 1], [0.48, 1]],
  ]},
  {id: 'grid-2x3', name: 'Six-panel grid', help: 'Two across, three down', panels: rows([0, 1 / 3, 2 / 3, 1], 2)},
  {id: 'big-two', name: 'Big panel + 2', help: 'One large moment, two small beats', panels: [
    rect(0, 0, 1, 0.62), rect(0, 0.62, 0.5, 1), rect(0.5, 0.62, 1, 1),
  ]},
  {id: 'yonkoma', name: '4-koma strip', help: 'Four panels in a vertical strip', panels: [0, 1, 2, 3].map(i => rect(0.18, i / 4, 0.82, (i + 1) / 4))},
  {id: 'grid-2x2', name: 'Four-panel grid', help: 'Two across, two down', panels: rows([0, 0.5, 1], 2)},
  {id: 'three-tier', name: 'Three wide panels', help: 'One panel per row', panels: [0, 1, 2].map(i => rect(0, i / 3, 1, (i + 1) / 3))},
  {id: 'splash', name: 'Full-page splash', help: 'One panel fills the page', panels: [rect(0, 0, 1, 1)]},
];
function rect(x0: number, y0: number, x1: number, y1: number): Point[] { return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
function rows(ys: number[], cols: number): Point[][] {
  const out: Point[][] = [];
  for (let r = 0; r < ys.length - 1; r++) for (let c = 0; c < cols; c++) out.push(rect(c / cols, ys[r], (c + 1) / cols, ys[r + 1]));
  return out;
}
export const layoutById = (id: string) => COMIC_LAYOUTS.find(l => l.id === id) ?? COMIC_LAYOUTS[0];

export const emptyPanel = (): ComicPanel => ({fit: 'cover', focusX: 50, focusY: 50, zoom: 1});
export function newComic(layout: ComicLayoutId = 'dynamic-5'): ComicPage {
  return {layout, rtl: false, gutterMm: 4, marginMm: 12, borderMm: 0.5, panels: layoutById(layout).panels.map(emptyPanel)};
}
/** The comic data for a page, with a default for pages just switched to "Comic page". */
export function comicOf(scene: {comic?: ComicPage}): ComicPage {
  const c = scene.comic ?? newComic();
  const need = layoutById(c.layout).panels.length;
  return c.panels.length >= need ? c : {...c, panels: [...c.panels, ...Array.from({length: need - c.panels.length}, emptyPanel)]};
}
/** Changing layout keeps every panel's art and words (extra panels are kept for switching back). */
export function setLayout(c: ComicPage, layout: ComicLayoutId): ComicPage { return comicOf({comic: {...c, layout}}); }

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const onOuterEdge = (a: Point, b: Point) => (near(a[0], 0) && near(b[0], 0)) || (near(a[0], 1) && near(b[0], 1)) || (near(a[1], 0) && near(b[1], 0)) || (near(a[1], 1) && near(b[1], 1));

/**
 * Shrinks a convex panel so neighbours are `gap` apart. Edges on the outside of the
 * art area are not moved (the page margin is already there). Works in millimetres so
 * slanted gutters stay an even width on any paper shape.
 */
export function insetPolygon(poly: Point[], gap: number, outer: (a: Point, b: Point) => boolean = () => false): Point[] {
  const n = poly.length;
  const cx = poly.reduce((s, p) => s + p[0], 0) / n, cy = poly.reduce((s, p) => s + p[1], 0) / n;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len;
    if ((cx - p[0]) * nx + (cy - p[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const d = outer(p, q) ? 0 : gap / 2;
    return {p: [p[0] + nx * d, p[1] + ny * d] as Point, r: [dx, dy] as Point};
  });
  return poly.map((v, i) => {
    const a = lines[(i - 1 + n) % n], b = lines[i];
    const cross = a.r[0] * b.r[1] - a.r[1] * b.r[0];
    if (Math.abs(cross) < 1e-9) return b.p;
    const t = ((b.p[0] - a.p[0]) * b.r[1] - (b.p[1] - a.p[1]) * b.r[0]) / cross;
    return [a.p[0] + a.r[0] * t, a.p[1] + a.r[1] * t] as Point;
  });
}

export type PanelBox = {
  index: number;
  /** Panel's bounding box, in % of the page. */
  left: number; top: number; width: number; height: number;
  /** Panel shape relative to its box, in %, for CSS clip-path and SVG. */
  clip: Point[];
  /** Panel shape in % of the page. */
  shape: Point[];
};

/** Where every panel goes on a page of this size (millimetres). Right-to-left mirrors the page so panel 1 is top right. */
export function panelBoxes(c: ComicPage, pageWmm: number, pageHmm: number): PanelBox[] {
  const layout = layoutById(c.layout);
  const m = Math.max(0, Math.min(c.marginMm, Math.min(pageWmm, pageHmm) / 3));
  const w = pageWmm - 2 * m, h = pageHmm - 2 * m;
  return layout.panels.map((unit, index) => {
    const mirrored = c.rtl ? unit.map(([x, y]) => [1 - x, y] as Point).reverse() : unit;
    const outer = (a: Point, b: Point) => onOuterEdge([a[0] / w, a[1] / h], [b[0] / w, b[1] / h]);
    const mm = insetPolygon(mirrored.map(([x, y]) => [x * w, y * h] as Point), Math.max(0, c.gutterMm), outer);
    const shape = mm.map(([x, y]) => [(m + x) / pageWmm * 100, (m + y) / pageHmm * 100] as Point);
    const xs = shape.map(p => p[0]), ys = shape.map(p => p[1]);
    const left = Math.min(...xs), top = Math.min(...ys), width = Math.max(...xs) - left, height = Math.max(...ys) - top;
    return {index, left, top, width, height, shape, clip: shape.map(([x, y]) => [width ? (x - left) / width * 100 : 0, height ? (y - top) / height * 100 : 0] as Point)};
  });
}

const r2 = (n: number) => Math.round(n * 100) / 100;
export const clipPath = (clip: Point[]) => `polygon(${clip.map(([x, y]) => `${r2(x)}% ${r2(y)}%`).join(',')})`;
export const svgPoints = (shape: Point[]) => shape.map(([x, y]) => `${r2(x)},${r2(y)}`).join(' ');

/**
 * The picture's box inside a panel, in % of the panel's box.
 * `panelAspect` and `imageAspect` are width / height.
 */
export function artBox(panelAspect: number, imageAspect: number, p: Pick<ComicPanel, 'fit' | 'zoom' | 'focusX' | 'focusY'>) {
  const wide = imageAspect > panelAspect;
  const fill = p.fit === 'cover' ? wide : !wide;
  let width = fill ? imageAspect / panelAspect * 100 : 100, height = fill ? 100 : panelAspect / imageAspect * 100;
  const z = clampN(p.zoom, 1, 4, 1);
  width *= z; height *= z;
  // (+ 0 turns -0 into 0)
  return {width, height, left: (100 - width) * clampN(p.focusX, 0, 100, 50) / 100 + 0, top: (100 - height) * clampN(p.focusY, 0, 100, 50) / 100 + 0};
}
/** Dragging the picture by (dx, dy) pixels in a panel `panelW` × `panelH` pixels: the new focus point. */
export function panFocus(panelW: number, panelH: number, panelAspect: number, imageAspect: number, p: ComicPanel, dx: number, dy: number): {focusX: number; focusY: number} {
  const box = artBox(panelAspect, imageAspect, p);
  const step = (focus: number, d: number, size: number, slack: number) => Math.abs(slack) < 0.5 || !size ? focus : clampN(focus + (d / size * 100) / slack * 100, 0, 100, 50);
  return {focusX: step(p.focusX, dx, panelW, 100 - box.width), focusY: step(p.focusY, dy, panelH, 100 - box.height)};
}
function clampN(v: unknown, min: number, max: number, fallback: number) { return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback; }

/** Panels shown on the page, in reading order. */
export const visiblePanels = (c: ComicPage) => c.panels.slice(0, layoutById(c.layout).panels.length);

// ---------- Validation (backups, cloud and export all go through this) ----------
const ID = /^[\w-]{1,80}$/;
export function assertComic(c: any): void {
  const bad = (what: string) => { throw new Error('Invalid comic page: ' + what); };
  if (!c || typeof c !== 'object') bad('data');
  if (!COMIC_LAYOUTS.some(l => l.id === c.layout)) bad('layout');
  if (c.rtl !== undefined && typeof c.rtl !== 'boolean') bad('reading order');
  for (const [k, min, max] of [['gutterMm', 0, 20], ['marginMm', 0, 40], ['borderMm', 0, 3]] as const)
    if (typeof c[k] !== 'number' || !Number.isFinite(c[k]) || c[k] < min || c[k] > max) bad(k);
  if (!Array.isArray(c.panels) || c.panels.length > MAX_PANELS) bad('panels');
  for (const p of c.panels) {
    if (!p || typeof p !== 'object') bad('panel');
    if (p.assetId !== undefined && (typeof p.assetId !== 'string' || p.assetId.length > 300)) bad('picture');
    if (!['cover', 'contain'].includes(p.fit)) bad('fit');
    for (const [k, min, max] of [['focusX', 0, 100], ['focusY', 0, 100], ['zoom', 1, 4]] as const)
      if (typeof p[k] !== 'number' || !Number.isFinite(p[k]) || p[k] < min || p[k] > max) bad(k);
    if (p.alt !== undefined && (typeof p.alt !== 'string' || p.alt.length > 2000)) bad('description');
    if (p.bubbles !== undefined) {
      if (!Array.isArray(p.bubbles) || p.bubbles.length > MAX_BUBBLES) bad('bubbles');
      for (const b of p.bubbles) {
        if (!b || typeof b.id !== 'string' || !ID.test(b.id)) bad('bubble');
        if (!['speech', 'thought', 'caption'].includes(b.kind)) bad('bubble kind');
        if (typeof b.text !== 'string' || b.text.length > 2000) bad('bubble text');
        for (const [k, min, max] of [['x', -20, 120], ['y', -20, 120], ['width', 5, 100], ['sizePt', 5, 40]] as const)
          if (typeof b[k] !== 'number' || !Number.isFinite(b[k]) || b[k] < min || b[k] > max) bad('bubble ' + k);
        if (b.tail !== undefined && !['none', 'bottom-left', 'bottom-right', 'top-left', 'top-right'].includes(b.tail)) bad('bubble tail');
      }
    }
  }
}

// ---------- Drawing (shared by the editor and print) ----------
/** Styles for bubbles and panels. Scoped by class, used in the editor and in print HTML. */
export const comicCss = `.comic-page{position:relative;overflow:clip;background:#fff}
.comic-panel{position:absolute;overflow:clip;background:#fff}
.comic-panel>img{position:absolute;max-width:none;max-height:none;user-select:none;-webkit-user-drag:none}
.comic-borders{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.comic-bubble{position:absolute;box-sizing:border-box;padding:.55em .9em;background:#fff;color:#111;border:1.5px solid #111;border-radius:50%;text-align:center;line-height:1.2;font-family:"Comic Neue","Comic Sans MS","Arial Rounded MT Bold",Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;display:flex;align-items:center;justify-content:center;min-height:2.4em}
.comic-bubble.thought{border-style:solid;border-radius:48% 52% 45% 55%/55% 45% 55% 45%;box-shadow:0 0 0 1.5px #fff,0 0 0 3px #111 inset}
.comic-bubble.caption{border-radius:0;background:#fffdf3;text-align:left;justify-content:flex-start;padding:.4em .6em;font-family:inherit}
.comic-tail{position:absolute;width:1.1em;height:1.1em;background:#fff;border:1.5px solid #111;border-top:0;border-left:0;transform:skew(18deg) rotate(45deg)}
.comic-bubble.thought .comic-tail{transform:none;border:1.5px solid #111;border-radius:50%;width:.7em;height:.7em}
.comic-tail.bottom-left{left:22%;bottom:-.58em}.comic-tail.bottom-right{right:22%;bottom:-.58em}
.comic-tail.top-left{left:22%;top:-.58em;transform:skew(18deg) rotate(225deg)}.comic-tail.top-right{right:22%;top:-.58em;transform:skew(18deg) rotate(225deg)}
.comic-bubble.thought .comic-tail.bottom-left,.comic-bubble.thought .comic-tail.bottom-right{bottom:-1em}.comic-bubble.thought .comic-tail.top-left,.comic-bubble.thought .comic-tail.top-right{top:-1em}`;

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);
export type ComicArt = {src: string; width: number; height: number} | undefined;

/** Fixed-layout HTML for print/PDF. `art(i)` gives panel i's picture (already checked to be a safe raster). */
export function comicPrintHtml(c: ComicPage, pageWmm: number, pageHmm: number, art: (i: number) => ComicArt): string {
  const boxes = panelBoxes(c, pageWmm, pageHmm), panels = visiblePanels(c);
  const cells = boxes.map(b => {
    const p = panels[b.index], a = art(b.index);
    const pa = (b.width * pageWmm) / (b.height * pageHmm || 1);
    const img = a && a.width && a.height ? (() => { const box = artBox(pa, a.width / a.height, p); return `<img src="${esc(a.src)}" alt="${esc(p.alt ?? '')}" style="left:${r2(box.left)}%;top:${r2(box.top)}%;width:${r2(box.width)}%;height:${r2(box.height)}%" />`; })() : '';
    return `<div class="comic-panel" style="left:${r2(b.left)}%;top:${r2(b.top)}%;width:${r2(b.width)}%;height:${r2(b.height)}%;clip-path:${clipPath(b.clip)}">${img}</div>`;
  }).join('');
  const borders = c.borderMm > 0 ? `<svg class="comic-borders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${boxes.map(b => `<polygon points="${svgPoints(b.shape)}" fill="none" stroke="#111" stroke-width="${r2(c.borderMm * 3.78)}" vector-effect="non-scaling-stroke" stroke-linejoin="miter" />`).join('')}</svg>` : '';
  const bubbles = panels.flatMap(p => p.bubbles || []).map(bubbleHtml).join('');
  return `<div class="comic-page" style="width:100%;height:100%">${cells}${borders}${bubbles}</div>`;
}
export function bubbleHtml(b: ComicBubble): string {
  const tail = b.kind !== 'caption' && b.tail && b.tail !== 'none' ? `<span class="comic-tail ${b.tail}"></span>` : '';
  return `<div class="comic-bubble ${b.kind}" style="left:${r2(b.x)}%;top:${r2(b.y)}%;width:${r2(b.width)}%;font-size:${r2(b.sizePt)}pt">${esc(b.text)}${tail}</div>`;
}
/** Reflowable e-books can't keep panel shapes: panels become pictures in reading order, with their words underneath. */
export function comicEpubHtml(c: ComicPage, art: (i: number) => string | undefined): string {
  return visiblePanels(c).map((p, i) => {
    const src = art(i), words = (p.bubbles || []).filter(b => b.text.trim());
    if (!src && !words.length) return '';
    return `<figure class="comic-epub-panel">${src ? `<img src="${esc(src)}" alt="${esc(p.alt || `Panel ${i + 1}`)}" />` : ''}${words.length ? `<figcaption>${words.map(b => `<p class="comic-${b.kind}">${esc(b.text)}</p>`).join('')}</figcaption>` : ''}</figure>`;
  }).join('');
}
