/*
 * "Ready to print?" — plain-language checks a writer can act on before sending a
 * book to Amazon KDP, IngramSpark or a local printer. Figures are the printers'
 * published guidelines; anything we can only estimate is worded as a suggestion.
 */
import {pageDimensions, wordCount, type Appearance, type Book, type Scene} from './model';
import {imageData} from './publishing';

export type Printer = 'kdp' | 'ingram' | 'home';
export type PrintIssue = {
  level: 'problem' | 'warning' | 'tip';
  title: string;
  detail: string;
  sceneId?: string;
  fix?: {label: string; patch: Partial<Appearance>};
};
const IN = 25.4;
type Trim = {w: number; h: number; name: string};
const t = (w: number, h: number, name = `${w} × ${h} in`): Trim => ({w: w * IN, h: h * IN, name});
export const PRINTERS: Record<Printer, {name: string; short: string; minPages: number; maxPages: number; trims?: Trim[]; about: string}> = {
  kdp: {
    name: 'Amazon KDP', short: 'KDP', minPages: 24, maxPages: 828, about: 'Sell paperbacks on Amazon. Free to set up; printed when someone orders.',
    trims: [t(5, 8), t(5.06, 7.81), t(5.25, 8), t(5.5, 8.5), t(6, 9), t(6.14, 9.21), t(6.69, 9.61), t(7, 10), t(7.44, 9.69), t(7.5, 9.25), t(8, 10), t(8.25, 6), t(8.25, 8.25), t(8.5, 8.5), t(8.5, 11), t(8.27, 11.69, 'A4')],
  },
  ingram: {
    name: 'IngramSpark', short: 'IngramSpark', minPages: 18, maxPages: 1200, about: 'Bookstores and libraries can order your book, as well as online shops.',
    trims: [t(4, 6), t(4.25, 7), t(5, 7), t(5, 8), t(5.06, 7.81), t(5.25, 8), t(5.5, 8.25), t(5.5, 8.5), t(5.83, 8.27, 'A5'), t(6, 9), t(6.14, 9.21), t(6.69, 9.61), t(7, 10), t(7.44, 9.69), t(7.5, 9.25), t(8, 8), t(8, 10), t(8.25, 11), t(8.5, 8.5), t(8.5, 11), t(8.27, 11.69, 'A4')],
  },
  home: {name: 'Home or local printer', short: 'Home printing', minPages: 1, maxPages: 100000, about: 'Print it yourself or take the PDF to a print shop.'},
};
/** Amazon KDP's minimum inside (gutter) margin, which grows with page count so words don't vanish into the spine. */
export function insideMarginMm(pages: number, printer: Printer): number {
  if (printer === 'home') return 10;
  const inch = pages <= 150 ? 0.375 : pages <= 300 ? 0.5 : pages <= 500 ? 0.625 : pages <= 700 ? 0.75 : 0.875;
  return inch * IN;
}
export const OUTSIDE_MIN_MM = 0.25 * IN;
export function supportedTrim(a: Appearance, printer: Printer): Trim | null | undefined {
  const list = PRINTERS[printer].trims;
  if (!list) return undefined;
  const [w, h] = pageDimensions(a);
  return list.find(x => Math.abs(x.w - w) < 1.2 && Math.abs(x.h - h) < 1.2) ?? null;
}
export function nearestTrim(a: Appearance, printer: Printer): Trim | undefined {
  const list = PRINTERS[printer].trims;
  if (!list) return undefined;
  const [w, h] = pageDimensions(a);
  return list.slice().sort((x, y) => Math.hypot(x.w - w, x.h - h) - Math.hypot(y.w - w, y.h - h))[0];
}
/** Settings that make a book meet the printer's margin rules for its page count. */
export function printerReadyPatch(a: Appearance, pages: number, printer: Printer): Partial<Appearance> {
  const inside = Math.ceil(insideMarginMm(pages, printer) + 3);
  const outside = Math.max(a.outsideMm ?? a.margin, Math.ceil(OUTSIDE_MIN_MM + 3));
  return {mirror: true, insideMm: Math.max(a.mirror ? a.insideMm ?? a.margin : a.margin, inside), outsideMm: outside, margin: Math.max(a.margin, Math.ceil(OUTSIDE_MIN_MM + 3))};
}

const PLACEHOLDERS = [
  'Start writing here', 'Author Name', 'Author name', 'Poet Name', 'Artist Name', 'Your Name', 'Book title', 'A subtitle, if you like', 'Chapter title',
  'ISBN: add yours here', 'Write two or three', 'One or two sentences about who they are', 'Thank the people who helped', 'Write a friendly note',
  'What do you make, and why', 'A short line from a review or a hook goes here', 'Character name',
];
const plain = (n: any): string => n?.type === 'text' ? n.text : (n?.children || []).map(plain).join(' ');
const pageName = (s: Scene) => s.title?.trim() || 'Untitled page';

export function printCheck(book: Book, pages: number, printer: Printer): PrintIssue[] {
  const out: PrintIssue[] = [];
  const a = book.appearance, info = PRINTERS[printer];
  const [w, h] = pageDimensions(a);
  const scenes = book.chapters.flatMap(c => c.scenes);

  // Size and page count
  const trim = supportedTrim(a, printer);
  if (trim === null) {
    const near = nearestTrim(a, printer)!;
    out.push({level: 'problem', title: `${info.name} doesn’t print this size`, detail: `Your book is ${(w / IN).toFixed(2)} × ${(h / IN).toFixed(2)} in. The closest size they offer is ${near.name}.`,
      fix: {label: `Use ${near.name}`, patch: {preset: 'Custom', widthMm: Math.round(near.w * 10) / 10, heightMm: Math.round(near.h * 10) / 10}}});
  }
  if (pages < info.minPages) out.push({level: 'problem', title: `Too few pages for ${info.name}`, detail: `They need at least ${info.minPages} pages and your book has ${pages}. Keep writing, or add front and back matter such as a dedication or an about-the-author page.`});
  if (pages > info.maxPages) out.push({level: 'problem', title: `Too many pages for ${info.name}`, detail: `They print up to ${info.maxPages} pages and your book has ${pages}. Try a larger book size or smaller text, or split it into two volumes.`});
  if (printer !== 'home' && pages % 2) out.push({level: 'tip', title: 'Odd number of pages', detail: 'Printed books always have an even number of pages, so the printer will add a blank page at the end. That’s normal.'});

  // Margins
  const inside = a.mirror ? a.insideMm ?? a.margin : a.margin, outside = a.mirror ? a.outsideMm ?? a.margin : a.margin;
  const needInside = insideMarginMm(pages, printer);
  if (printer !== 'home' && (inside < needInside - 0.2 || outside < OUTSIDE_MIN_MM - 0.2)) {
    out.push({level: 'problem', title: 'Margins are too small for a bound book', detail: `With ${pages} pages, ${info.name} needs at least ${(needInside / IN).toFixed(3).replace(/0+$/, '')} in on the spine side so words don’t disappear into the fold. Yours is ${(inside / IN).toFixed(2)} in.`,
      fix: {label: 'Fix the margins', patch: printerReadyPatch(a, pages, printer)}});
  } else if (printer !== 'home' && !a.mirror) {
    out.push({level: 'tip', title: 'Add extra room on the spine side', detail: 'Turning on “I’m printing this as a bound book” gives the inside edge of each page a little more space, which makes thick books easier to read.',
      fix: {label: 'Turn it on', patch: printerReadyPatch(a, pages, printer)}});
  }

  // Words left over from templates, and empty pages
  for (const s of scenes) {
    const text = plain(s.content.root);
    const hits = PLACEHOLDERS.filter(p => text.includes(p)).sort((x, y) => text.indexOf(x) - text.indexOf(y));
    if (hits.length) out.push({level: 'warning', title: `Sample text on “${pageName(s)}”`, detail: `${hits.slice(0, 3).map(x => `“${x}”`).join(', ')}${hits.length > 3 ? ' and more' : ''} ${hits.length === 1 ? 'is' : 'are'} from the template. Replace with your own words or delete.`, sceneId: s.id});
    const art = s.template === 'color-art' || s.template === 'bnw-art';
    if (!wordCount(s.content) && !s.image && !(s.images?.length) && !(s.decals?.length) && !art)
      out.push({level: 'warning', title: `“${pageName(s)}” is empty`, detail: 'It will print as a blank page. Add something to it or delete it.', sceneId: s.id});
    if (art && !s.image) out.push({level: 'warning', title: `“${pageName(s)}” has no picture yet`, detail: 'It will print as a blank page until you add artwork.', sceneId: s.id});
  }
  if (/^(untitled book|book name|book title)$/i.test(book.title.trim())) out.push({level: 'warning', title: 'Your book needs a title', detail: 'Click the title at the top of the screen to name it.'});

  // Pictures: sharp enough to print?
  const bodyMm = w - 2 * a.margin;
  const dpiNote = (dpi: number) => dpi < 150 ? 'problem' : 'warning';
  for (const s of scenes) {
    if (s.image?.src) {
      let px = 0;
      try { px = imageData(s.image.src).width; } catch { /* unknown format */ }
      const mm = s.image.mode === 'full' || s.image.mode === 'spread' ? w * (s.image.mode === 'spread' ? 2 : 1) : bodyMm * (s.image.widthPercent ?? 100) / 100;
      const dpi = px / (mm / IN);
      if (px && dpi < 300) out.push({level: dpiNote(dpi), title: `Picture on “${pageName(s)}” may print blurry`, detail: `It’s about ${Math.round(dpi)} dots per inch at this size; printers recommend 300. Use a larger version of the picture, or make it smaller on the page.`, sceneId: s.id});
    }
    for (const p of s.images || []) {
      const asset = book.images?.find(x => x.id === p.assetId);
      if (!asset?.naturalWidth) continue;
      const mm = (p.mode === 'wrap' ? bodyMm : w) * p.width / 100, dpi = asset.naturalWidth / (mm / IN);
      if (dpi < 300) out.push({level: dpiNote(dpi), title: `“${asset.name}” may print blurry`, detail: `On “${pageName(s)}” it’s about ${Math.round(dpi)} dots per inch; printers recommend 300. Use a larger version, or make it smaller on the page.`, sceneId: s.id});
    }
  }

  // Things close enough to the edge to be trimmed off
  const edge = 3.2 / w * 100, edgeY = 3.2 / h * 100;
  for (const s of scenes) {
    const near = (s.decals || []).some(d => d.x < edge || d.y < edgeY || d.x + d.width > 100 - edge) ||
      (s.images || []).some(p => p.mode === 'overlay' && (p.x < edge || p.y < edgeY || p.x + p.width > 100 - edge));
    if (near) out.push({level: 'warning', title: `Something on “${pageName(s)}” is very close to the edge`, detail: 'Printers trim a sliver off every page, so decorations or pictures within about ⅛ inch of the edge can get cut off. Move them in a little.', sceneId: s.id});
  }

  if (!a.footer) out.push({level: 'tip', title: 'No page numbers', detail: 'Most printed books have page numbers. You can add them in Book design → Paper.', fix: {label: 'Add page numbers', patch: {footer: '{page}'}}});
  if (printer !== 'home' && !scenes.some(s => s.template === 'copyright')) out.push({level: 'tip', title: 'No copyright page', detail: 'Books for sale usually have one near the front with the copyright line and ISBN. Add one from Page types.'});

  const order = {problem: 0, warning: 1, tip: 2};
  return out.sort((x, y) => order[x.level] - order[y.level]);
}

/** Spine thickness from page count (published paper-thickness figures; a close estimate, not a press proof). */
export function spineWidthIn(pages: number, paper: 'white' | 'cream' | 'color' = 'cream', printer: Printer = 'kdp'): number {
  const perPage = printer === 'ingram' ? {white: 0.0022, cream: 0.0025, color: 0.0022}[paper] : {white: 0.002252, cream: 0.0025, color: 0.002347}[paper];
  return Math.max(0, Math.ceil(pages / 2) * 2 * perPage);
}
