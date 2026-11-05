/*
 * Turn an existing manuscript (Word .docx — including Google Docs downloaded as
 * .docx — plain text or Markdown) into a book: chapters are found from headings,
 * "Chapter …" lines or page breaks; bold, italic, underline, alignment, tabs and
 * indents are kept. Runs in the browser and in tests (no DOM needed).
 */
import JSZip from 'jszip';
import {uid, type Book, type Chapter, type Scene} from './model';
import {heading, para, doc} from './paragraph-styles';
import {createPresetBook} from './templates';

type Run = {text: string; format: number} | {tab: true} | {br: true};
export type ImportBlock = {kind: 'p' | 'heading' | 'title' | 'subtitle' | 'break' | 'scene-break'; level?: number; runs: Run[]; align?: string; indent?: number};
export type ManuscriptChapter = {label?: string; title: string; blocks: ImportBlock[]};
export type Manuscript = {title: string; author?: string; front: ImportBlock[]; chapters: ManuscriptChapter[]; words: number};

const BOLD = 1, ITALIC = 2, STRIKE = 4, UNDERLINE = 8, SUPER = 64;
const CHAPTER_LINE = /^(chapter|ch\.|part|book|prologue|epilogue|interlude|afterword|foreword|preface|introduction)\b/i;
const SCENE_BREAK = /^\s*(?:(?:\*\s*){3,}|(?:#\s*){1,3}|~{3,}|-{3,}|•\s*•\s*•|◆|❧|\*)\s*$/;

/* ---------- tiny XML reader (enough for WordprocessingML) ---------- */
type XNode = {name: string; attrs: Record<string, string>; children: XNode[]; text?: string};
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    : ({amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"} as Record<string, string>)[e.toLowerCase()]);
function parseXml(xml: string): XNode {
  const root: XNode = {name: '#root', attrs: {}, children: []};
  const stack = [root];
  const re = /<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!\[CDATA\[([\s\S]*?)\]\]>|<[?!][\s\S]*?>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[6] !== undefined || m[5] !== undefined) { top.children.push({name: '#text', attrs: {}, children: [], text: m[5] ?? decode(m[6])}); continue; }
    if (!m[2]) continue;
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    const attrs: Record<string, string> = {};
    for (const a of m[3].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = decode(a[2] ?? a[3]);
    const node: XNode = {name: m[2], attrs, children: []};
    top.children.push(node);
    if (!m[4]) stack.push(node);
  }
  return root;
}
const kids = (n: XNode | undefined, name: string) => (n?.children || []).filter(c => c.name === name);
const kid = (n: XNode | undefined, name: string) => n?.children.find(c => c.name === name);
const textOf = (n: XNode): string => n.text ?? n.children.map(textOf).join('');
const on = (n?: XNode) => !!n && !['0', 'false', 'off', 'none'].includes((n.attrs['w:val'] ?? 'true').toLowerCase());

/* ---------- .docx ---------- */
export async function parseDocx(data: ArrayBuffer | Uint8Array): Promise<Manuscript> {
  const zip = await JSZip.loadAsync(data);
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('This file doesn’t look like a Word document. Try saving it again as .docx.');
  const body = kid(kid(parseXml(await file.async('string')), 'w:document'), 'w:body');
  // Style ids (e.g. "Heading1", or a translated id) → their real names ("heading 1").
  const names: Record<string, string> = {};
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  if (stylesXml) for (const s of kids(kid(parseXml(stylesXml), 'w:styles'), 'w:style')) {
    const id = s.attrs['w:styleId'], name = kid(s, 'w:name')?.attrs['w:val'];
    if (id && name) names[id] = name.toLowerCase();
  }
  const core = await zip.file('docProps/core.xml')?.async('string');
  const meta = core ? parseXml(core) : undefined;
  const find = (n: XNode | undefined, name: string): XNode | undefined => !n ? undefined : n.name === name ? n : n.children.map(c => find(c, name)).find(Boolean);
  const metaTitle = meta ? textOf(find(meta, 'dc:title') || {name: '', attrs: {}, children: []}).trim() : '';
  const metaAuthor = meta ? textOf(find(meta, 'dc:creator') || {name: '', attrs: {}, children: []}).trim() : '';

  const blocks: ImportBlock[] = [];
  const paragraphs: XNode[] = [];
  const collect = (n: XNode) => { for (const c of n.children) { if (c.name === 'w:p') paragraphs.push(c); else if (['w:tbl', 'w:tr', 'w:tc', 'w:sdt', 'w:sdtContent', 'w:customXml'].includes(c.name)) collect(c); } };
  if (body) collect(body);
  for (const p of paragraphs) {
    const pPr = kid(p, 'w:pPr');
    const styleId = kid(pPr, 'w:pStyle')?.attrs['w:val'] || '';
    const style = (names[styleId] || styleId).toLowerCase().replace(/\s+/g, ' ');
    const jc = kid(pPr, 'w:jc')?.attrs['w:val'];
    const align = jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : jc === 'both' || jc === 'distribute' ? 'justify' : '';
    const left = Number(kid(pPr, 'w:ind')?.attrs['w:left'] ?? kid(pPr, 'w:ind')?.attrs['w:start'] ?? 0);
    const runs: Run[] = [];
    let pageBreak = on(kid(pPr, 'w:pageBreakBefore'));
    const walk = (n: XNode, inDeleted = false) => {
      for (const c of n.children) {
        if (c.name === 'w:del' || c.name === 'w:pPr' || c.name === 'w:rPr' && n.name === 'w:p') continue;
        if (c.name === 'w:r') {
          const rPr = kid(c, 'w:rPr');
          let f = 0;
          if (on(kid(rPr, 'w:b'))) f |= BOLD;
          if (on(kid(rPr, 'w:i'))) f |= ITALIC;
          if (on(kid(rPr, 'w:strike'))) f |= STRIKE;
          const u = kid(rPr, 'w:u'); if (u && u.attrs['w:val'] !== 'none') f |= UNDERLINE;
          if (kid(rPr, 'w:vertAlign')?.attrs['w:val'] === 'superscript') f |= SUPER;
          for (const r of c.children) {
            if (r.name === 'w:t' && !inDeleted) { const t = textOf(r); if (t) runs.push({text: t, format: f}); }
            else if (r.name === 'w:tab') runs.push({tab: true});
            else if (r.name === 'w:br' || r.name === 'w:cr') { if (r.attrs['w:type'] === 'page') pageBreak = true; else runs.push({br: true}); }
            else if (r.name === 'w:noBreakHyphen') runs.push({text: '-', format: f});
            else if (r.name === 'w:lastRenderedPageBreak') continue;
          }
        } else if (['w:hyperlink', 'w:ins', 'w:smartTag', 'w:fldSimple', 'w:sdt', 'w:sdtContent', 'w:customXml'].includes(c.name)) walk(c, inDeleted);
      }
    };
    walk(p);
    if (pageBreak) blocks.push({kind: 'break', runs: []});
    const plain = runs.map(r => 'text' in r ? r.text : ' ').join('').trim();
    let kind: ImportBlock['kind'] = 'p', level: number | undefined;
    const h = /^heading (\d)$/.exec(style) || /^heading(\d)$/.exec(styleId.toLowerCase());
    if (style === 'title') kind = 'title';
    else if (style === 'subtitle') kind = 'subtitle';
    else if (h) { kind = 'heading'; level = Number(h[1]); }
    else if (plain && SCENE_BREAK.test(plain)) kind = 'scene-break';
    blocks.push({kind, level, runs: trimRuns(runs), align, indent: left > 0 ? Math.min(8, Math.round(left / 720)) : 0});
  }
  return assemble(blocks, metaTitle, metaAuthor);
}

/* ---------- .txt / .md ---------- */
function inlineMarkdown(s: string): Run[] {
  const out: Run[] = [];
  const re = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({text: s.slice(last, m.index), format: 0});
    out.push(m[2] !== undefined ? {text: m[2], format: BOLD} : {text: m[4], format: ITALIC});
    last = re.lastIndex;
  }
  if (last < s.length) out.push({text: s.slice(last), format: 0});
  return out.flatMap(r => 'text' in r && r.text.includes('\t') ? r.text.split('\t').flatMap((t, i) => i ? [{tab: true} as Run, {text: t, format: r.format}] : [{text: t, format: r.format}]) : [r]).filter(r => !('text' in r) || r.text);
}
export function parseText(text: string, markdown = false, fileTitle = ''): Manuscript {
  const lines = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '').split('\n');
  const blankSeparated = lines.filter(l => !l.trim()).length > lines.length / 6;
  const blocks: ImportBlock[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (!buffer.length) return;
    // Hard-wrapped text (paragraphs separated by blank lines) is unwrapped into one paragraph.
    const joined = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) blocks.push(SCENE_BREAK.test(joined) ? {kind: 'scene-break', runs: []} : {kind: 'p', runs: markdown ? inlineMarkdown(joined) : [{text: joined, format: 0}]});
    buffer = [];
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '\f') { flush(); blocks.push({kind: 'break', runs: []}); continue; }
    const md = markdown ? /^(#{1,6})\s+(.*)$/.exec(line) : null;
    if (md) { flush(); blocks.push({kind: 'heading', level: md[1].length, runs: inlineMarkdown(md[2].trim())}); continue; }
    if (!line.trim()) { flush(); continue; }
    if (!blankSeparated) { buffer.push(line); flush(); } else buffer.push(line.trim());
  }
  flush();
  return assemble(blocks, '', '', fileTitle);
}

/* ---------- shared: find title + chapters ---------- */
function trimRuns(runs: Run[]): Run[] {
  const r = runs.slice();
  while (r.length && 'text' in r[0] && !r[0].text.trim()) r.shift();
  while (r.length && 'text' in r[r.length - 1] && !(r[r.length - 1] as {text: string}).text.trim()) r.pop();
  if (r.length && 'text' in r[0]) r[0] = {...r[0], text: r[0].text.replace(/^\s+/, '')};
  const end = r.length - 1;
  if (end >= 0 && 'text' in r[end]) r[end] = {...(r[end] as {text: string; format: number}), text: (r[end] as {text: string}).text.replace(/\s+$/, '')};
  return r;
}
const plainOf = (b: ImportBlock) => b.runs.map(r => 'text' in r ? r.text : ' ').join('').replace(/\s+/g, ' ').trim();
const wordsIn = (s: string) => (s.match(/[\p{L}\p{N}’']+/gu) || []).length;

function splitLabel(t: string): {label?: string; title: string} {
  const m = /^((?:chapter|part|book)\s+[\w-]+)\s*[:.\-–—]\s*(.+)$/i.exec(t);
  return m ? {label: m[1], title: m[2]} : {title: t};
}

function assemble(blocks: ImportBlock[], metaTitle: string, metaAuthor: string, fileTitle = ''): Manuscript {
  let title = metaTitle;
  const titleBlock = blocks.find(b => b.kind === 'title' && plainOf(b));
  if (titleBlock) title = plainOf(titleBlock);
  const headings = blocks.filter(b => b.kind === 'heading' && plainOf(b));
  const levels = [1, 2, 3].filter(l => headings.some(b => b.level === l));
  // Chapters are the top heading level used more than once (a single top heading is usually the book title).
  let chapterLevel = levels.find(l => headings.filter(b => b.level === l).length > 1);
  if (!chapterLevel && levels.length === 1 && headings.length === 1 && !title) { title = plainOf(headings[0]); headings[0].kind = 'title'; }
  const isChapterStart = (b: ImportBlock, i: number) => {
    if (chapterLevel) return b.kind === 'heading' && b.level === chapterLevel;
    const t = plainOf(b);
    if (b.kind === 'p' && t && t.length < 80 && CHAPTER_LINE.test(t) && !/[.!?,;]$/.test(t.replace(/[”"’)]$/, ''))) return true;
    return b.kind === 'heading' && !!t && i >= 0;
  };
  const byLines = !chapterLevel && blocks.some((b, i) => b.kind === 'p' && isChapterStart(b, i));
  const usePageBreaks = !chapterLevel && !byLines && !headings.length && blocks.filter(b => b.kind === 'break').length >= 2;

  const front: ImportBlock[] = [];
  const chapters: ManuscriptChapter[] = [];
  let current: ManuscriptChapter | null = null;
  blocks.forEach((b, i) => {
    if (b.kind === 'title' || (b.kind === 'subtitle' && !chapters.length && !current)) return;
    if (b.kind === 'break') { if (usePageBreaks && (current || front.some(x => plainOf(x)))) { current = {title: `Chapter ${chapters.length + 1}`, blocks: []}; chapters.push(current); } return; }
    const starts = (chapterLevel || byLines) && isChapterStart(b, i);
    if (starts) { current = {...splitLabel(plainOf(b)), blocks: []}; chapters.push(current); return; }
    (current ? current.blocks : front).push(b);
  });
  // Drop chapters created by page breaks that ended up empty.
  const cleaned = chapters.map(c => ({...c, blocks: tidy(c.blocks)})).filter(c => c.blocks.length || c.label || !/^Chapter \d+$/.test(c.title));
  let frontBlocks = tidy(front);
  if (!cleaned.length) { cleaned.push({title: 'Chapter One', blocks: frontBlocks}); frontBlocks = []; }
  // A short opening that just repeats the title/author is the old title page: the new book makes its own.
  const frontText = frontBlocks.map(plainOf).join(' ');
  let author = metaAuthor;
  const by = /^(?:by|written by)\s+(.{2,60})$/i;
  for (const b of frontBlocks) { const m = by.exec(plainOf(b)); if (m) author = m[1]; }
  if (!title && frontBlocks.length && wordsIn(plainOf(frontBlocks[0])) <= 12) title = plainOf(frontBlocks[0]);
  if (wordsIn(frontText) <= 40) frontBlocks = [];
  const words = [...frontBlocks, ...cleaned.flatMap(c => c.blocks)].reduce((n, b) => n + wordsIn(plainOf(b)), 0) + cleaned.reduce((n, c) => n + wordsIn(c.title), 0);
  return {title: (title || fileTitle || 'Untitled book').slice(0, 300), author: author || undefined, front: frontBlocks, chapters: cleaned, words};
}
function tidy(blocks: ImportBlock[]) {
  const out: ImportBlock[] = [];
  for (const b of blocks) {
    if (b.kind === 'break') continue;
    const empty = b.kind === 'p' && !b.runs.length;
    if (empty && (!out.length || (out[out.length - 1].kind === 'p' && !out[out.length - 1].runs.length))) continue;
    out.push(b);
  }
  while (out.length && out[out.length - 1].kind === 'p' && !out[out.length - 1].runs.length) out.pop();
  return out;
}

/* ---------- build the book ---------- */
const textNode = (t: string, format: number) => ({type: 'text', version: 1, text: t, format, style: '', mode: 'normal', detail: 0});
function lexicalBlock(b: ImportBlock) {
  if (b.kind === 'scene-break') return para('* * *', 'center');
  const children = b.runs.map(r => 'tab' in r ? {type: 'tab', version: 1, text: '\t', format: 0, style: '', mode: 'normal', detail: 2} : 'br' in r ? {type: 'linebreak', version: 1} : textNode(r.text, r.format));
  const base = b.kind === 'heading' ? heading(b.level && b.level >= 3 ? 'h4' : 'h3', '', b.align || '') : b.kind === 'subtitle' ? heading('h5', '', b.align || '') : para('', b.align || '');
  return {...base, indent: b.indent || 0, children};
}

/** A ready-to-edit book in the chosen style, with the imported chapters in place of the sample ones. */
export function bookFromManuscript(m: Manuscript, presetId = 'novel'): Book {
  const preset = createPresetBook(presetId === 'blank' ? 'novel' : presetId);
  const scenes = preset.chapters.flatMap(c => c.scenes);
  const chapterLayout = scenes.find(s => s.template === 'chapter-title')?.layout || {titleAlign: 'center', chapterSpacing: 30, border: 'none', divider: 'none'};
  const keepFront = new Set(['book-front', 'copyright', 'toc']);
  const author = m.author || 'Author Name';
  const swap = (s: Scene): Scene => {
    if (s.template !== 'book-front' && s.template !== 'copyright') return s;
    const fix = (n: any): any => n.type === 'text' ? {...n, text: n.text.replace(/^(The Long Road|A New Dawn|Field Notes|Collected Works|Quiet Hours)$/, m.title).replace(/Author Name|Poet Name|Artist Name|Your Name/g, author)} : n.children ? {...n, children: n.children.map(fix)} : n;
    return {...s, title: s.template === 'book-front' ? m.title : s.title, content: {...s.content, root: fix((s.content as any).root)}};
  };
  const frontScenes = presetId === 'blank' ? [preset.chapters[0].scenes[0]].map(swap) : preset.chapters.flatMap(c => c.scenes).filter(s => keepFront.has(s.template || '')).map(swap);
  const book: Book = {...preset, id: uid(), title: m.title, updatedAt: new Date().toISOString(), revisions: []};
  const sections: Chapter[] = [{id: uid(), title: 'Front matter', scenes: frontScenes}];
  if (m.front.length) sections[0].scenes.push({id: uid(), title: 'Opening', template: 'prose', inlineTitle: true, content: doc(m.front.map(lexicalBlock)), layout: {titleAlign: 'left', chapterSpacing: 0, border: 'none', divider: 'none'}});
  for (const c of m.chapters) {
    const head = [...(c.label ? [heading('h6', c.label, 'center')] : []), heading('h2', c.title, 'center')];
    sections.push({id: uid(), title: c.title, scenes: [{id: uid(), title: c.title, template: 'chapter-title', inlineTitle: true, content: doc([...head, ...c.blocks.map(lexicalBlock)]), layout: {...chapterLayout}}]});
  }
  book.chapters = sections;
  return book;
}

/** Read whichever kind of file the person picked. */
export async function readManuscript(file: File): Promise<Manuscript> {
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (/\.docx$/i.test(file.name)) {
    const m = await parseDocx(await file.arrayBuffer());
    if (m.title === 'Untitled book' && name) m.title = name;
    return m;
  }
  if (/\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith('text/')) return parseText(await file.text(), /\.(md|markdown)$/i.test(file.name), name);
  if (/\.(doc|pages|odt|rtf)$/i.test(file.name)) throw new Error('This kind of file can’t be read directly. Open it in Word, Pages or Google Docs and save or download it as .docx, then try again.');
  throw new Error('Choose a Word file (.docx), a text file (.txt) or a Markdown file (.md).');
}
