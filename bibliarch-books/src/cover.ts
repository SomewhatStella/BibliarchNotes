/*
 * The book's printed cover: one wraparound sheet (back, spine, front) with bleed,
 * sized from the trim size and the page count. The same HTML renders the on-screen
 * preview and the print-ready cover PDF, so what you see is what goes to the printer.
 */
import {fontCss, type CustomFont} from './design';
import {pageDimensions, type Book} from './model';
import {spineWidthIn, type Printer} from './print-check';

export type CoverStyle = 'classic' | 'bold' | 'framed' | 'picture';
export type Paper = 'white' | 'cream' | 'color';
export type Cover = {
  style: CoverStyle;
  bg: string; fg: string; accent: string;
  title?: string; subtitle?: string; author?: string;
  tagline?: string; blurb?: string;
  imageId?: string; imageFull?: boolean;
  font?: string; titleScale?: number;
  spine?: {title?: boolean; author?: boolean; color?: 'cover' | 'accent' | 'dark'; dir?: 'down' | 'up'; text?: string};
  paper?: Paper;
  barcode?: boolean;
};

export const COVER_STYLES: {id: CoverStyle; name: string; hint: string}[] = [
  {id: 'classic', name: 'Classic', hint: 'Centred title, a fine rule, your name below'},
  {id: 'bold', name: 'Bold', hint: 'Big capital letters, set flush left'},
  {id: 'framed', name: 'Framed', hint: 'A border like an old hardback'},
  {id: 'picture', name: 'Picture', hint: 'Your picture fills the cover'},
];
export const COVER_PALETTES: {id: string; name: string; bg: string; fg: string; accent: string}[] = [
  {id: 'ink', name: 'Ink', bg: '#1f2a44', fg: '#f4ead5', accent: '#c9a45c'},
  {id: 'forest', name: 'Forest', bg: '#23392f', fg: '#efe6cf', accent: '#c8a96a'},
  {id: 'wine', name: 'Wine', bg: '#5a1f2b', fg: '#f6e9dc', accent: '#e0b27a'},
  {id: 'night', name: 'Night', bg: '#141414', fg: '#f5f2ea', accent: '#d4af37'},
  {id: 'cream', name: 'Cream', bg: '#f3ead8', fg: '#2b2620', accent: '#8a5a2b'},
  {id: 'sky', name: 'Sky', bg: '#dbe7ef', fg: '#1e2f3f', accent: '#4a6f8f'},
  {id: 'blush', name: 'Blush', bg: '#f2d9d5', fg: '#3a2326', accent: '#a3505c'},
  {id: 'paper', name: 'Paper', bg: '#fafaf7', fg: '#1a1a1a', accent: '#b33a3a'},
];

const IN = 25.4;
export const BLEED_MM = 0.125 * IN;
const SAFE_MM = 0.3 * IN;
const BARCODE = {w: 2 * IN, h: 1.2 * IN, gap: 0.25 * IN};

export function defaultCover(book: Book): Cover {
  const p = COVER_PALETTES[0];
  return {style: 'classic', bg: p.bg, fg: p.fg, accent: p.accent, paper: 'cream', barcode: true, spine: {title: true, author: true, color: 'cover', dir: 'down'}, ...guessTitlePage(book), ...guessBackCover(book)};
}
/** The blurb from a "Back cover" page, if the writer already wrote one. */
export function guessBackCover(book: Book): {tagline?: string; blurb?: string} {
  const s = book.chapters.flatMap(c => c.scenes).find(x => x.template === 'back-cover');
  const blocks: any[] = s?.content?.root?.children ?? [];
  const quote = blocks.find(b => b.type === 'heading' || b.type === 'quote');
  const tagline = quote ? plain(quote).trim() : '';
  const blurb = blocks.filter(b => b.type === 'paragraph').map(b => plain(b).trim()).filter(t => t && !/^Write two or three exciting paragraphs/.test(t)).join('\n\n');
  return {tagline: tagline && !/A short line from a review/.test(tagline) ? tagline.slice(0, 300) : undefined, blurb: blurb ? blurb.slice(0, 4000) : undefined};
}

const plain = (n: any): string => n?.type === 'text' ? n.text : n?.type === 'linebreak' ? ' ' : (n?.children ?? []).map(plain).join('');
/** Subtitle and author from the title page, so a new cover starts with the right words. */
export function guessTitlePage(book: Book): {subtitle?: string; author?: string} {
  const s = book.chapters.flatMap(c => c.scenes).find(x => x.template === 'book-front');
  const blocks: any[] = s?.content?.root?.children ?? [];
  const sub = blocks.find(b => b.type === 'heading' && b.tag === 'h5');
  const subtitle = sub ? plain(sub).trim() : '';
  const paras = blocks.filter(b => b.type === 'paragraph').map(b => plain(b).trim().replace(/^by\s+/i, '')).filter(Boolean);
  const author = paras[paras.length - 1] ?? '';
  return {
    subtitle: subtitle && !/^a subtitle, if you like$/i.test(subtitle) ? subtitle.slice(0, 200) : undefined,
    author: author && !/^(author|poet|artist|your) name$/i.test(author) && author.length <= 80 ? author : undefined,
  };
}

export type CoverGeometry = {trimW: number; trimH: number; bleed: number; spine: number; width: number; height: number; spineIn: number; spineText: boolean; spineNote: string};
/** Every measurement of the wraparound cover, in millimetres. */
export function coverGeometry(book: Book, pages: number, cover: Cover): CoverGeometry {
  const [trimW, trimH] = pageDimensions(book.appearance);
  const printer: Printer = book.appearance.printer ?? 'home';
  const spineIn = spineWidthIn(pages, cover.paper ?? 'cream', printer === 'home' ? 'kdp' : printer);
  const spine = spineIn * IN;
  const min = printer === 'kdp' ? 80 : printer === 'ingram' ? 48 : 0;
  const spineText = pages >= min && spine >= 5;
  const spineNote = spineText ? '' : printer !== 'home' && pages < min
    ? `${printer === 'kdp' ? 'Amazon KDP' : 'IngramSpark'} only prints words on the spine of books with ${min} pages or more. Your book has ${pages}, so the spine stays plain.`
    : 'The spine is too thin for words, so it stays plain.';
  return {trimW, trimH, bleed: BLEED_MM, spine, width: 2 * BLEED_MM + 2 * trimW + spine, height: 2 * BLEED_MM + trimH, spineIn, spineText, spineNote};
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);
const stack = (font: string | undefined, fallback: string) => font ? `"${font.replace(/["\\]/g, '')}", ${fallback}` : fallback;
const r = (n: number) => Math.round(n * 100) / 100;
/**
 * A dark fade from one edge, built from stacked flat layers. Chromium writes CSS gradients
 * that fade to transparent as soft masks, which some PDF readers show bright magenta;
 * flat see-through layers print the same everywhere.
 */
function fade(edge: 'top' | 'bottom', reachPct: number, max: number, steps = 24): string {
  const a = 1 - Math.pow(1 - max, 1 / steps);
  return Array.from({length: steps}, (_, i) => `<i style="${edge}:0;height:${r(reachPct * (i + 1) / steps)}%;opacity:${a.toFixed(4)}"></i>`).join('');
}

export type CoverRender = {
  cover: Cover; title: string; trimW: number; trimH: number; spine: number; spineText: boolean;
  headingFont?: string; bodyFont?: string; customFonts?: CustomFont[]; imageSrc?: string;
};

/** Title size that keeps the longest word on one line inside the safe area. */
export function titleSizeMm(title: string, width: number, style: CoverStyle, scale = 1): number {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const longest = Math.max(4, ...words.map(w => w.length));
  const caps = style === 'bold';
  const room = width - 2 * SAFE_MM - (style === 'framed' ? 12 : 0);
  const fitWord = room / (longest * (caps ? 0.68 : 0.56));
  const byLength = width * (title.length > 40 ? 0.075 : title.length > 22 ? 0.095 : caps ? 0.14 : 0.12);
  return r(Math.max(6, Math.min(fitWord, byLength) * scale));
}

export function coverHtml(p: CoverRender, opts: {guides?: boolean; padMm?: number} = {}): string {
  const {css, body} = coverParts(p, opts);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
}
/** Style and markup separately, so the editor can show the cover in a shadow root. */
export function coverParts(p: CoverRender, opts: {guides?: boolean; padMm?: number} = {}): {css: string; body: string; width: number; height: number} {
  const c = p.cover, b = BLEED_MM, w = p.trimW, h = p.trimH, s = p.spine;
  const W = 2 * b + 2 * w + s, H = 2 * b + h;
  const title = (c.title ?? p.title).trim() || 'Untitled book';
  const head = stack(c.font ?? p.headingFont, 'Georgia, serif');
  const body = stack(p.bodyFont, 'Georgia, serif');
  const boldHead = c.style === 'bold' && !c.font ? 'Arial, Helvetica, sans-serif' : head;
  const tSize = titleSizeMm(title, w, c.style, c.titleScale ?? 1);
  const img = p.imageSrc && /^data:image\/(png|jpeg|webp);base64,/.test(p.imageSrc) ? p.imageSrc : '';
  const full = c.style === 'picture' && c.imageFull && img;
  // Over a wrapped picture, "same as the cover" means the picture shows through the spine.
  const spineBg = c.spine?.color === 'accent' ? c.accent : c.spine?.color === 'dark' ? '#151515' : full ? 'transparent' : c.bg;
  const spineFg = c.spine?.color === 'dark' ? '#f2efe8' : c.spine?.color === 'accent' ? c.bg : full ? '#fff' : c.fg;
  const author = c.author?.trim() ?? '';
  const sub = c.subtitle?.trim() ?? '';
  const front = (() => {
    const t = `<h1 class="t">${esc(title)}</h1>`, st = sub ? `<p class="sub">${esc(sub)}</p>` : '', a = author ? `<p class="a">${esc(author)}</p>` : '';
    const inset = img && c.style !== 'picture' ? `<div class="inset"><img src="${img}" alt=""></div>` : '<div class="grow"></div>';
    if (c.style === 'bold') return `<div class="safe f bold">${img ? `<div class="hero"><img src="${img}" alt=""></div>` : ''}<div class="grow"></div>${t}<div class="bar"></div>${st}${a}</div>`;
    if (c.style === 'framed') return `<div class="safe f framed"><div class="frame">${t}${st}${inset}<p class="orn">❦</p>${a}</div></div>`;
    if (c.style === 'picture') return `${img && !full ? `<div class="cover-img"><img src="${img}" alt=""></div>` : ''}<div class="scrim">${img ? fade('top', 40, 0.5) + fade('bottom', 32, 0.55) : ''}</div><div class="safe f picture">${t}${st}<div class="grow"></div>${a}</div>`;
    return `<div class="safe f classic">${t}<div class="rule"></div>${st}${inset}${a}</div>`;
  })();
  const blurb = (c.blurb ?? '').trim().split(/\n\s*\n/).filter(Boolean).map(x => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
  const hint = opts.guides && !blurb && !c.tagline?.trim() ? '<p class="hint">Your blurb goes here. Write it on the Back tab.</p>' : '';
  const back = `<div class="safe bk">${c.tagline?.trim() ? `<p class="tag">${esc(c.tagline.trim())}</p>` : ''}<div class="blurb">${blurb}</div>${hint}</div>`;
  const spineFs = r(Math.min(s * 0.46, 6.2));
  const spineWords = [c.spine?.title !== false ? `<span class="st">${esc((c.spine?.text ?? '').trim() || title)}</span>` : '', c.spine?.author !== false && author ? `<span class="sa">${esc(author)}</span>` : ''].filter(Boolean).join('');
  const guides = opts.guides ? `<div class="g trim" style="left:${b}mm;top:${b}mm;width:${2 * w + s}mm;height:${h}mm"></div>
    <div class="g fold" style="left:${b + w}mm"></div><div class="g fold" style="left:${b + w + s}mm"></div>
    <div class="g safe-line" style="left:${b + SAFE_MM}mm;top:${b + SAFE_MM}mm;width:${w - 2 * SAFE_MM}mm;height:${h - 2 * SAFE_MM}mm"></div>
    <div class="g safe-line" style="left:${b + w + s + SAFE_MM}mm;top:${b + SAFE_MM}mm;width:${w - 2 * SAFE_MM}mm;height:${h - 2 * SAFE_MM}mm"></div>
    ${c.barcode !== false ? `<div class="g barcode" style="left:${b + w - BARCODE.gap - BARCODE.w}mm;top:${b + h - BARCODE.gap - BARCODE.h}mm;width:${BARCODE.w}mm;height:${BARCODE.h}mm"><span>Barcode goes here</span></div>` : ''}` : '';
  const css = `@page{size:${r(W + (opts.padMm ?? 0))}mm ${r(H + (opts.padMm ?? 0))}mm;margin:0}
${fontCss(p.customFonts || [])}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${r(W + (opts.padMm ?? 0))}mm;height:${r(H + (opts.padMm ?? 0))}mm;overflow:hidden;background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.wrap{position:relative;width:${r(W)}mm;height:${r(H)}mm;background:${c.bg};color:${c.fg};font-family:${body};overflow:hidden}
.full-img,.cover-img,.hero{position:absolute;overflow:hidden}.full-img{inset:0}.full-img img,.cover-img img,.hero img,.inset img{width:100%;height:100%;object-fit:cover;display:block}
.panel{position:absolute;top:0;height:100%}
.back{left:0;width:${r(b + w)}mm}.spine{left:${r(b + w)}mm;width:${r(s)}mm;background:${spineBg};color:${spineFg};display:flex;align-items:center;justify-content:center}
.front{left:${r(b + w + s)}mm;width:${r(w + b)}mm}
.front .safe{position:absolute;top:${r(b + SAFE_MM)}mm;bottom:${r(b + SAFE_MM)}mm;left:${r(SAFE_MM)}mm;right:${r(b + SAFE_MM)}mm;display:flex;flex-direction:column}
.back .safe{position:absolute;top:${r(b + SAFE_MM)}mm;bottom:${r(b + SAFE_MM + (c.barcode !== false ? BARCODE.h + 2 : 0))}mm;left:${r(b + SAFE_MM)}mm;right:${r(SAFE_MM)}mm;display:flex;flex-direction:column;justify-content:center}
${full ? `.back::before{content:"";position:absolute;inset:0;background:${c.bg};opacity:.78}.back .safe{z-index:1}` : ''}
.t{font-family:${head};font-weight:400;font-size:${tSize}mm;line-height:1.08;overflow-wrap:break-word;hyphens:none}
.sub{font-family:${head};font-style:italic;font-size:${r(Math.max(3.4, w * 0.032))}mm;line-height:1.3;opacity:.9}
.a{font-family:${body};font-size:${r(Math.max(3.4, w * 0.034))}mm;letter-spacing:.18em;text-transform:uppercase}
.grow{flex:1}
.inset{flex:1;min-height:0;margin:${r(w * 0.05)}mm ${r(w * 0.04)}mm;overflow:hidden}
.classic{text-align:center;align-items:center}.classic .t{margin-top:${r(h * 0.06)}mm}.classic .rule{width:${r(w * 0.22)}mm;height:.5mm;background:${c.accent};margin:${r(w * 0.05)}mm 0 ${r(w * 0.04)}mm}.classic .a{margin-bottom:${r(h * 0.02)}mm}
.bold{text-align:left}.bold .t{font-family:${boldHead};font-weight:800;text-transform:uppercase;letter-spacing:.01em;line-height:.98}.bold .bar{width:${r(w * 0.18)}mm;height:${r(Math.max(1.2, w * 0.012))}mm;background:${c.accent};margin:${r(w * 0.045)}mm 0}.bold .sub{margin-bottom:${r(w * 0.06)}mm}.bold .hero{position:relative;flex:0 0 56%;margin:${r(-(b + SAFE_MM))}mm ${r(-(b + SAFE_MM))}mm 0 ${r(-SAFE_MM)}mm}
.framed .frame{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;border:.6mm solid ${c.accent};outline:.25mm solid ${c.accent};outline-offset:-2.2mm;padding:${r(w * 0.07)}mm ${r(w * 0.05)}mm}.framed .t{margin-top:${r(h * 0.05)}mm}.framed .sub{margin-top:${r(w * 0.035)}mm}.framed .orn{color:${c.accent};font-size:${r(w * 0.05)}mm;margin:${r(w * 0.02)}mm 0}
.picture{text-align:center;align-items:center;z-index:1}.picture .sub{margin-top:${r(w * 0.03)}mm}.picture .t{text-shadow:0 .4mm 2mm rgba(0,0,0,.35)}.cover-img{inset:0}
.scrim{position:absolute;inset:0;${img ? '' : `background:linear-gradient(160deg,${c.bg},${c.accent})`}}.scrim i{position:absolute;left:0;right:0;background:#000}
${c.style === 'picture' && img ? `.picture{color:#fff}` : ''}
.bk{font-size:${r(Math.max(3.3, w * 0.026))}mm;line-height:1.5}.bk .tag{font-family:${head};font-style:italic;font-size:${r(Math.max(4.2, w * 0.042))}mm;line-height:1.3;color:${c.style === 'picture' && full ? c.fg : c.accent};text-align:center;margin-bottom:${r(w * 0.06)}mm}.blurb p{margin:0 0 .9em}.hint{text-align:center;opacity:.55;font-style:italic}
.spine-text{writing-mode:vertical-rl;${full && c.spine?.color !== 'accent' && c.spine?.color !== 'dark' ? 'text-shadow:0 0 1.2mm rgba(0,0,0,.6);' : ''}${c.spine?.dir === 'up' ? 'transform:rotate(180deg);' : ''}display:flex;align-items:center;gap:${r(spineFs * 2.2)}mm;max-height:${r(h - 2 * SAFE_MM)}mm;white-space:nowrap;overflow:hidden}
.st{font-family:${head};font-size:${spineFs}mm;letter-spacing:.04em}.sa{font-family:${body};font-size:${r(spineFs * 0.78)}mm;letter-spacing:.14em;text-transform:uppercase}
.g{position:absolute;pointer-events:none;z-index:5}.trim{outline:9999px solid rgba(40,40,40,.28);border:.35mm dashed #e0453a}.fold{top:0;bottom:0;border-left:.35mm dashed #e0453a}
.safe-line{border:.3mm dashed rgba(60,140,220,.75)}.barcode{background:#fff;border:.3mm solid #999;display:flex;align-items:center;justify-content:center;font:3.6mm/1.2 Arial,sans-serif;color:#666;text-align:center}
`;
  const markup = `<div class="wrap">
${full ? `<div class="full-img"><img src="${img}" alt=""></div>` : ''}
<div class="panel back">${back}</div>
<div class="panel spine">${p.spineText && spineWords ? `<div class="spine-text">${spineWords}</div>` : ''}</div>
<div class="panel front">${front}</div>
${guides}
</div>`;
  return {css, body: markup, width: W, height: H};
}

const HEX = /^#[0-9a-f]{6}$/i;
function text(v: unknown, max: number) { if (v !== undefined && (typeof v !== 'string' || v.length > max)) throw Error('Invalid cover text'); }
/** Stored and printed covers are checked field by field (they are rendered into HTML). */
export function assertCover(c: any): asserts c is Cover {
  if (!c || typeof c !== 'object') throw Error('Invalid cover');
  if (!COVER_STYLES.some(s => s.id === c.style)) throw Error('Invalid cover style');
  for (const k of ['bg', 'fg', 'accent']) if (!HEX.test(c[k])) throw Error('Invalid cover colour');
  text(c.title, 300); text(c.subtitle, 300); text(c.author, 200); text(c.tagline, 300); text(c.blurb, 4000); text(c.imageId, 100);
  if (c.font !== undefined && (typeof c.font !== 'string' || !/^[\w ,'-]{1,100}$/.test(c.font))) throw Error('Invalid cover font');
  if (c.titleScale !== undefined && !(Number.isFinite(c.titleScale) && c.titleScale >= 0.6 && c.titleScale <= 1.5)) throw Error('Invalid title size');
  if (c.paper !== undefined && !['white', 'cream', 'color'].includes(c.paper)) throw Error('Invalid paper');
  for (const k of ['imageFull', 'barcode']) if (c[k] !== undefined && typeof c[k] !== 'boolean') throw Error('Invalid cover option');
  if (c.spine !== undefined) {
    const sp = c.spine;
    if (!sp || typeof sp !== 'object') throw Error('Invalid spine');
    for (const k of ['title', 'author']) if (sp[k] !== undefined && typeof sp[k] !== 'boolean') throw Error('Invalid spine option');
    if (sp.color !== undefined && !['cover', 'accent', 'dark'].includes(sp.color)) throw Error('Invalid spine colour');
    if (sp.dir !== undefined && !['down', 'up'].includes(sp.dir)) throw Error('Invalid spine direction');
    text(sp.text, 200);
  }
}
export function assertCoverRender(p: any): asserts p is CoverRender {
  if (!p || typeof p !== 'object') throw Error('Invalid cover');
  assertCover(p.cover); text(p.title, 300);
  for (const [k, min, max] of [['trimW', 60, 500], ['trimH', 60, 500], ['spine', 0, 120]] as const) if (!(Number.isFinite(p[k]) && p[k] >= min && p[k] <= max)) throw Error('Invalid cover size');
  if (typeof p.spineText !== 'boolean') throw Error('Invalid spine flag');
  for (const f of [p.headingFont, p.bodyFont]) if (f !== undefined && (typeof f !== 'string' || !/^[\w ,'-]{1,100}$/.test(f))) throw Error('Invalid font');
  fontCss(p.customFonts || []);
  if (p.imageSrc !== undefined && (typeof p.imageSrc !== 'string' || p.imageSrc.length > 2_100_000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(p.imageSrc))) throw Error('Invalid cover picture');
}

/** Everything the renderer needs, from the stored book. */
export function coverRender(book: Book, pages: number, cover: Cover): CoverRender {
  const g = coverGeometry(book, pages, cover);
  const asset = cover.imageId ? book.images?.find(i => i.id === cover.imageId) : undefined;
  const used = new Set([book.appearance.headingFont, book.appearance.bodyFont, cover.font]);
  return {cover, title: book.title, trimW: g.trimW, trimH: g.trimH, spine: g.spine, spineText: g.spineText,
    headingFont: book.appearance.headingFont, bodyFont: book.appearance.bodyFont,
    customFonts: (book.customFonts || []).filter(f => used.has(f.family)), imageSrc: asset?.src};
}

/** Pixels per inch the cover picture will print at (300 is ideal). */
export function coverImagePpi(book: Book, cover: Cover, pages: number): number | undefined {
  const asset = cover.imageId ? book.images?.find(i => i.id === cover.imageId) : undefined;
  if (!asset) return undefined;
  const g = coverGeometry(book, pages, cover);
  // The picture is cropped to fill its box (object-fit: cover), so the tighter side decides.
  const wideMm = cover.style === 'picture' ? (cover.imageFull ? g.width : g.trimW + g.bleed) : cover.style === 'bold' ? g.trimW + g.bleed : g.trimW * 0.7;
  const tallMm = cover.style === 'picture' ? g.height : g.trimH * (cover.style === 'bold' ? 0.56 : 0.35);
  return Math.round(Math.min(asset.naturalWidth / (wideMm / IN), asset.naturalHeight / (tallMm / IN)));
}
