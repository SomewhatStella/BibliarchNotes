/*
 * Google-Docs-style paragraph styles. Titles, chapter numbers and headings are
 * ordinary editable text in the page flow; the style only changes the block tag.
 * Stored as Lexical HeadingNode tags so the book JSON stays standard.
 */
export type ParagraphStyle = 'normal' | 'title' | 'subtitle' | 'h1' | 'h2' | 'h3' | 'label';
export const PARAGRAPH_STYLES: {id: ParagraphStyle; name: string; tag: string | null; shortcut?: string}[] = [
  {id: 'normal', name: 'Normal text', tag: null, shortcut: 'Ctrl+Alt+0'},
  {id: 'title', name: 'Title', tag: 'h1'},
  {id: 'subtitle', name: 'Subtitle', tag: 'h5'},
  {id: 'label', name: 'Chapter number', tag: 'h6'},
  {id: 'h1', name: 'Heading 1', tag: 'h2', shortcut: 'Ctrl+Alt+1'},
  {id: 'h2', name: 'Heading 2', tag: 'h3', shortcut: 'Ctrl+Alt+2'},
  {id: 'h3', name: 'Heading 3', tag: 'h4', shortcut: 'Ctrl+Alt+3'},
];
export const styleForTag = (tag: string | null | undefined): ParagraphStyle => PARAGRAPH_STYLES.find(s => s.tag === (tag ?? null))?.id ?? 'normal';
export const tagForStyle = (id: ParagraphStyle) => PARAGRAPH_STYLES.find(s => s.id === id)?.tag ?? null;

/**
 * Shared look for the editor, PDF and EPUB. Expects --heading-font and
 * --heading-size on an ancestor. `scope` is prefixed to every selector.
 */
export function paragraphStyleCss(scope: string) {
  const s = (sel: string) => sel.split(',').map(x => `${scope} ${x.trim()}`).join(',');
  return `${s('h1,h2,h3,h4,h5,h6')}{font-family:var(--heading-font);text-indent:0;line-height:1.25;font-weight:400;letter-spacing:normal;break-after:avoid;page-break-after:avoid}`
    + `${s('h1')}{font-size:calc(var(--heading-size) * 1.45);margin:0 0 .35em}`
    + `${s('h5')}{font-size:calc(var(--heading-size) * .6);font-style:italic;margin:0 0 1.4em}`
    + `${s('h6')}{font-size:max(11px,calc(var(--heading-size) * .4));letter-spacing:.28em;text-transform:uppercase;margin:0 0 .7em}`
    + `${s('h2')}{font-size:var(--heading-size);margin:0 0 .9em}`
    + `${s('h3')}{font-size:calc(var(--heading-size) * .72);font-weight:600;margin:1.1em 0 .45em}`
    + `${s('h4')}{font-size:calc(var(--heading-size) * .58);font-weight:600;margin:.9em 0 .3em}`
    // Book convention: the first paragraph after a heading is not indented.
    + `${s('h1+p,h2+p,h3+p,h4+p,h5+p,h6+p')}{text-indent:0}`;
}

type Node = any;
const text = (t: string, format = 0) => ({type: 'text', version: 1, text: t, format, style: '', mode: 'normal', detail: 0});
/** Serialized block helpers for templates and migrations. */
export function heading(tag: string, t: string, align: string = ''): Node {
  return {type: 'heading', version: 1, tag, format: align, indent: 0, direction: null, children: t ? [text(t)] : []};
}
export function para(t: string, align: string = '', format = 0): Node {
  return {type: 'paragraph', version: 1, format: align, indent: 0, direction: null, textFormat: format, textStyle: '', children: t ? [text(t, format)] : []};
}
export function doc(blocks: Node[]) {
  return {root: {type: 'root', version: 1, format: '', indent: 0, direction: null, children: blocks.length ? blocks : [para('')]}} as any;
}
const plain = (n: Node): string => n?.type === 'text' ? n.text : n?.type === 'linebreak' ? ' ' : (n?.children || []).map(plain).join('');
/** Page name for the outline/contents: the first real heading on the page. */
const titleCache = new WeakMap<object, string | null>();
export function titleFromContent(content: any): string | undefined {
  if (content && typeof content === 'object') {
    const hit = titleCache.get(content);
    if (hit !== undefined) return hit ?? undefined;
    const t = findTitle(content);
    titleCache.set(content, t ?? null);
    return t;
  }
  return findTitle(content);
}
function findTitle(content: any): string | undefined {
  const blocks: Node[] = content?.root?.children?.flatMap((b: Node) => b.type === 'page' ? b.children : [b]) || [];
  const h = blocks.find(b => b.type === 'heading' && ['h1', 'h2', 'h3', 'h4'].includes(b.tag) && plain(b).trim());
  return h ? plain(h).trim().slice(0, 300) : undefined;
}
export function chapterLabelFromContent(content: any): string | undefined {
  const blocks: Node[] = content?.root?.children || [];
  const h = blocks.find(b => b.type === 'heading' && b.tag === 'h6' && plain(b).trim());
  return h ? plain(h).trim() : undefined;
}
export function hasHeading(content: any) {
  return (content?.root?.children || []).some((b: Node) => b.type === 'heading');
}
const WORDS = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
export const chapterWord = (n: number) => WORDS[n - 1] ?? String(n);
