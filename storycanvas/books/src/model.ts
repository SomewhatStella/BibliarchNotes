import type { SerializedEditorState } from "lexical";
import {assertImagePlacement} from './image-placement';
import {assertOverlay, type ArtworkOverlay} from './artwork';
import { assertDesign, fontCss } from './design';
import { assertCover } from './cover';
import { assertComic } from './comic';
export const KEY = "bibliarch-books-v1";
export const MAX_BYTES = 4_000_000;
export const fonts = [
  "Georgia",
  "Arial",
  "Verdana",
  "Times New Roman",
] as const;
export type Appearance = {
  preset: "B6" | "A4" | "A5" | "Letter" | "Custom";
  margin: number;
  bodyFont: string;
  bodySize: number;
  headingFont: string;
  headingSize: number;
  widthMm?: number;
  heightMm?: number;
  header?: string;
  footer?: string;
  mirror?: boolean;
  bleedMm?: number;
  insideMm?: number;
  outsideMm?: number;
  safeMm?: number;
  recto?: boolean;
  guides?: boolean;
  lineHeight?: number;
  paragraphSpacing?: number;
  paragraphIndent?: number; // First line, in em; not Lexical's whole-paragraph indent.
  indentStepMm?: number; // How far Tab indents a paragraph, and the spacing of tab stops.
  printer?: 'kdp' | 'ingram' | 'home';
  paragraphAlign?: 'left' | 'justify';
  tracking?: number;
};
export const pageTemplates = [
  "book-front",
  "chapter-title",
  "prose",
  "color-art",
  "bnw-art",
  "characters",
  "afterword",
  "back-cover",
  "copyright",
  "toc",
  "comic",
] as const;
export type PageTemplate = (typeof pageTemplates)[number];
export type PageImage = {
  placement?: import('./image-placement').ImagePlacement;
  mode?: 'inline' | 'half' | 'full' | 'float-left' | 'float-right' | 'spread';
  x?: number;
  y?: number;
  src: string;
  originalSrc?: string;
  crop?: {x:number;y:number;width:number;height:number};
  alt: string;
  caption?: string;
  widthPercent?: number;
  rotation?: number;
  opacity?: number;
  fit?: "contain" | "cover";
  position?: string;
  naturalWidth?: number;
  naturalHeight?: number;
};
export type ImageAsset = {id:string;src:string;name:string;naturalWidth:number;naturalHeight:number};
export type PlacedImage = {id:string;assetId:string;page:number;x:number;y:number;width:number;mode:'wrap'|'overlay';contour?:import('./contour').Contour;wrapGap?:number;contourMode?:'alpha'|'background'|'rectangle'};
export type Scene = {
  /** Comic / manga page: panel layout, the writer's own art per panel, and speech bubbles. */
  comic?: import('./comic').ComicPage;
  images?: PlacedImage[];
  overlay?: ArtworkOverlay;
  bookmark?: boolean;
  /** Title/chapter number are ordinary text at the top of `content` (Docs-style), not a separate field on the page. */
  inlineTitle?: boolean;
  decals?: import('./design').Decal[];
  layout?: Partial<import('./design').PageLayout>;
  id: string;
  title: string;
  content: SerializedEditorState;
  template?: PageTemplate;
  suggestion?: {before:SerializedEditorState;at:string};
  image?: PageImage;
  comments?: { id: string; text: string; resolved: boolean }[];
  references?: {
    id: string;
    kind: "Character" | "Location";
    name: string;
    notes: string;
  }[];
};
export function applyPageTemplate(scene: Scene, template: PageTemplate): Scene {
  return { ...scene, template };
}
export function validateImage(file: { type: string; size: number }): string {
  return !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ? "Choose a PNG, JPEG, or WebP image."
    : file.size > 1_500_000
      ? "Image exceeds 1.5 MB. Resize it before importing to protect local storage."
      : "";
}
export function pageDimensions(a: Appearance): [number, number] {
  return a.preset === "Custom"
    ? [a.widthMm || 148, a.heightMm || 210]
    : (
        {
          B6: [128, 182],
          A4: [210, 297],
          A5: [148, 210],
          Letter: [215.9, 279.4],
        } as Record<string, [number, number]>
      )[a.preset];
}
export type Chapter = { id: string; title: string; scenes: Scene[]; folder?: boolean };
export function pageMargins(a: Appearance, page: number): [number, number] {
  if (!a.mirror) return [a.margin, a.margin];
  const inside = a.insideMm ?? a.margin, outside = a.outsideMm ?? a.margin;
  return page % 2 ? [inside, outside] : [outside, inside];
}
export function moveScene(book: Book, id: string, chapterId: string, index: number): Book {
  const scene = book.chapters.flatMap(c => c.scenes).find(s => s.id === id);
  if (!scene || !book.chapters.some(c => c.id === chapterId)) return book;
  return {...book, chapters: book.chapters.map(c => {
    const scenes = c.scenes.filter(s => s.id !== id);
    if (c.id === chapterId) scenes.splice(Math.max(0, Math.min(index, scenes.length)), 0, scene);
    return {...c, scenes};
  }).filter(c => c.scenes.length)};
}
export type Revision = {
  id: string;
  at: string;
  kind: string;
  title: string;
  chapters: Chapter[];
};
export type Book = {
  images?: ImageAsset[];
  updatedAt?: string;
  customFonts?: import('./design').CustomFont[];
  id: string;
  title: string;
  chapters: Chapter[];
  appearance: Appearance;
  /** The printed wraparound cover (front, spine, back). */
  cover?: import('./cover').Cover;
  revisions: Revision[];
};
export type Library = {
  version: 1;
  books: Book[];
  activeBook: string;
  activeScene: string;
};
export const uid = () => crypto.randomUUID();
export function emptyDoc(paragraphs = [""]): SerializedEditorState {
  return {
    root: {
      type: "root",
      version: 1,
      format: "",
      indent: 0,
      direction: null,
      children: paragraphs.map((text) => ({
        type: "paragraph",
        version: 1,
        format: "",
        indent: 0,
        direction: null,
        children: text
          ? [
              {
                type: "text",
                version: 1,
                text,
                format: 0,
                style: "",
                mode: "normal",
                detail: 0,
              },
            ]
          : [],
      })),
    },
  } as SerializedEditorState;
}
export function newBook(title = "Book name"): Book {
  return {
    id: uid(),
    title,
    chapters: [
      {
        id: uid(),
        title: "Title page",
        scenes: [
          {
            id: uid(),
            title,
            template: "book-front",
            content: emptyDoc(["Author name"]),
          },
        ],
      },
      {
        id: uid(),
        title: "Chapter name",
        scenes: [
          {
            id: uid(),
            title: "Chapter name",
            template: "chapter-title",
            content: emptyDoc([
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
              "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
            ]),
          },
        ],
      },
    ],
    appearance: {
      preset: "A4",
      margin: 25,
      bodyFont: "Arial",
      bodySize: 16,
      headingFont: "Georgia",
      headingSize: 30,
      footer: "{page}",
    },
    revisions: [],
  };
}
export function seed(): Library {
  const b = newBook();
  return {
    version: 1,
    books: [b],
    activeBook: b.id,
    activeScene: b.chapters[0].scenes[0].id,
  };
}
export function reorder<T>(items: T[], index: number, delta: number): T[] {
  const out = [...items];
  const dest = index + delta;
  if (dest >= 0 && dest < out.length)
    [out[index], out[dest]] = [out[dest], out[index]];
  return out;
}
export function addRevision(book: Book, kind: string): Book {
  return {
    ...book,
    revisions: [
      {
        id: uid(),
        at: new Date().toISOString(),
        kind,
        title: book.title,
        chapters: structuredClone(book.chapters),
      },
      ...book.revisions,
    ].slice(0, 12),
  };
}
export function restoreRevision(book: Book, id: string): Book {
  const r = book.revisions.find((x) => x.id === id);
  if (!r) throw Error("Snapshot not found");
  return {
    ...addRevision(book, "Before restore"),
    title: r.title,
    chapters: structuredClone(r.chapters),
  };
}
const assert = (ok: unknown): void => {
  if (!ok)
    throw Error("Invalid Bibliarch backup. No existing writing was changed.");
};
function text(v: unknown, max = 300) {
  assert(typeof v === "string" && v.length <= max);
}
function doc(v: any) {
  assert(v && v.root?.type === "root");
  let count = 0;
  function node(n: any, depth: number) {
    assert(n && depth < 12 && ++count < 50000);
    assert(
      ["root", "paragraph", "text", "tab", "linebreak", "heading"].includes(n.type),
    );
    assert(n.version === 1);
    if (n.type === "tab") assert(n.text === "	");
    if (n.type === "text" || n.type === "tab") {
      text(n.text, 500000);
      assert(Number.isInteger(n.format) && n.format >= 0 && n.format < 2048);
      text(n.style, 300);
      assert(
        n.style
          .split(";")
          .every(
            (s: string) =>
              !s.trim() ||
              /^\s*(font-family|font-size|color)\s*:\s*[a-zA-Z0-9 #.,'"%-]+$/.test(
                s,
              ),
          ),
      );
      assert(["normal", "token", "segmented"].includes(n.mode));
    } else if (n.type !== "linebreak") {
      assert(Array.isArray(n.children));
      assert(
        ["", "left", "center", "right", "justify", "start", "end", 0].includes(
          n.format,
        ),
      );
      assert(Number.isInteger(n.indent) && n.indent >= 0 && n.indent <= 20);
      assert(n.direction === null || ["ltr", "rtl"].includes(n.direction));
      if (n.type === "heading") assert(["h1", "h2", "h3", "h4", "h5", "h6"].includes(n.tag));
      n.children.forEach((c: any) => node(c, depth + 1));
    }
  }
  node(v.root, 0);
}
function chapters(cs: any, ids: Set<string>) {
  assert(Array.isArray(cs) && cs.length > 0 && cs.length <= 200);
  cs.forEach((c: any) => {
    text(c.id);
    assert(!ids.has(c.id));
    ids.add(c.id);
    text(c.title);
    assert(
      Array.isArray(c.scenes) && c.scenes.length > 0 && c.scenes.length <= 500,
    );
    c.scenes.forEach((s: any) => {
      text(s.id);
      assert(!ids.has(s.id));
      ids.add(s.id);
      text(s.title);
      doc(s.content);
      assertDesign(s);
      assertOverlay(s.overlay);
      if (s.comic !== undefined) assertComic(s.comic);
      if(s.images!==undefined){assert(Array.isArray(s.images)&&s.images.length<=24);const seen=new Set();for(const p of s.images){text(p.id);text(p.assetId);assert(!seen.has(p.id));seen.add(p.id);assert(Number.isInteger(p.page)&&p.page>=0&&p.page<500);assert(['wrap','overlay'].includes(p.mode));for(const k of ['x','y','width'])assert(Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100);assert(p.width>=5);if(p.wrapGap!==undefined)assert(Number.isFinite(p.wrapGap)&&p.wrapGap>=0&&p.wrapGap<=48);if(p.contourMode!==undefined)assert(['alpha','background','rectangle'].includes(p.contourMode));if(p.contour!==undefined){assert(Array.isArray(p.contour)&&p.contour.length>=3&&p.contour.length<=256);for(const point of p.contour)assert(Array.isArray(point)&&point.length===2&&point.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100));}}}
      if (s.bookmark !== undefined) assert(typeof s.bookmark === 'boolean');
      if (s.inlineTitle !== undefined) assert(typeof s.inlineTitle === 'boolean');
      if(s.suggestion!==undefined){assert(s.suggestion&&typeof s.suggestion==='object');doc(s.suggestion.before);text(s.suggestion.at);assert(!Number.isNaN(Date.parse(s.suggestion.at)));}
      if(s.comments!==undefined){assert(Array.isArray(s.comments)&&s.comments.length<=1000);s.comments.forEach((x:any)=>{text(x.id);text(x.text,10000);assert(typeof x.resolved==='boolean')});}
      if(s.references!==undefined){assert(Array.isArray(s.references)&&s.references.length<=1000);s.references.forEach((x:any)=>{text(x.id);text(x.name,300);text(x.notes,10000);assert(['Character','Location'].includes(x.kind))});}
      if (s.template !== undefined) assert(pageTemplates.includes(s.template));
      if (s.image) {
        const im = s.image;
        text(im.src, 2_100_000);
        assert(
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(
            im.src,
          ),
        );
        if(im.originalSrc!==undefined){text(im.originalSrc,2_100_000);assert(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(im.originalSrc));}
        if(im.crop!==undefined){const c=im.crop;assert(c&&['x','y','width','height'].every(k=>Number.isFinite(c[k])&&c[k]>=0&&c[k]<=1));assert(c.width>0&&c.height>0&&c.x+c.width<=1.000001&&c.y+c.height<=1.000001);}
        if(im.placement!==undefined)assertImagePlacement(im.placement);
        text(im.alt, 2000);
        if (im.caption !== undefined) text(im.caption, 2000);
        for (const [key, min, max] of [
          ["widthPercent", 10, 100],
          ["rotation", -180, 180],
          ["opacity", 0, 1],
        ] as const)
          if (im[key] !== undefined)
            assert(
              Number.isFinite(im[key]) && im[key] >= min && im[key] <= max,
            );
        if (im.fit !== undefined) assert(["contain", "cover"].includes(im.fit));
        if (im.position !== undefined)
          assert(/^(100|[0-9]{1,2})% (100|[0-9]{1,2})%$/.test(im.position));
      }
    });
  });
}
export function parseLibrary(raw: string): Library {
  // Storage quotas belong to the storage backend, not the backup format.
  // Per-field, image and collection validation below still applies.
  const l = JSON.parse(raw);
  assert(
    l?.version === 1 &&
      Array.isArray(l.books) &&

      l.books.length <= 50,
  );
  const ids = new Set<string>();
  l.books.forEach((b: any) => {
    text(b.id);
    assert(!ids.has(b.id));
    ids.add(b.id);
    text(b.title);
    if(b.images!==undefined){assert(Array.isArray(b.images)&&b.images.length<=100);const seen=new Set();for(const im of b.images){text(im.id);assert(!seen.has(im.id));seen.add(im.id);text(im.name,2000);text(im.src,2100000);assert(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(im.src));assert(Number.isInteger(im.naturalWidth)&&im.naturalWidth>0&&Number.isInteger(im.naturalHeight)&&im.naturalHeight>0&&im.naturalWidth*im.naturalHeight<=16000000);}}
    chapters(b.chapters, ids);
    for(const c of b.chapters)for(const s of c.scenes)for(const p of s.images||[])assert(b.images?.some((im:any)=>im.id===p.assetId));
    if (b.cover !== undefined) assertCover(b.cover);
    const a = b.appearance;
    fontCss(b.customFonts || []);
    if(b.designLayout!==undefined)assertDesign({layout:b.designLayout});
    if(b.decalCollections!==undefined){assert(Array.isArray(b.decalCollections)&&b.decalCollections.length<=8);for(const collection of b.decalCollections){text(collection.id);text(collection.name,60);assertDesign({decals:collection.decals});assert(Array.isArray(collection.decals));}}
    const allowedFonts = [...fonts, ...(b.customFonts || []).map((f: any) => f.family)];
    if(a?.paragraphAlign!==undefined)assert(['left','justify'].includes(a.paragraphAlign));
    if(a?.printer!==undefined)assert(['kdp','ingram','home'].includes(a.printer));
    for (const [key,min,max] of [['paragraphIndent',0,4],['indentStepMm',3,40],['lineHeight',1,3],['paragraphSpacing',0,60],['tracking',-2,5],['insideMm',8,50],['outsideMm',8,50],['safeMm',0,20],['bleedMm',0,10]] as const)
      if (a?.[key] !== undefined) assert(Number.isFinite(a[key]) && a[key] >= min && a[key] <= max);
    if (a)
      for (const k of ["widthMm", "heightMm"])
        if (a[k] !== undefined)
          assert(Number.isFinite(a[k]) && a[k] >= 80 && a[k] <= 500);
    assert(
      a &&
        ["B6", "A4", "A5", "Letter", "Custom"].includes(a.preset) &&
        allowedFonts.includes(a.bodyFont) &&
        allowedFonts.includes(a.headingFont),
    );
    assert(
      Number.isFinite(a.margin) &&
        a.margin >= 8 &&
        a.margin <= 35 &&
        Number.isFinite(a.bodySize) &&
        a.bodySize >= 12 &&
        a.bodySize <= 28 &&
        Number.isFinite(a.headingSize) &&
        a.headingSize >= 20 &&
        a.headingSize <= 48,
    );
    assert(Array.isArray(b.revisions) && b.revisions.length <= 12);
    b.revisions.forEach((r: any) => {
      text(r.id);
      text(r.at);
      assert(!Number.isNaN(Date.parse(r.at)));
      text(r.kind);
      text(r.title);
      chapters(r.chapters, new Set());
    });
  });
  assert(
    (l.books.length===0 && l.activeBook==='' && l.activeScene==='') || l.books.some(
      (b: Book) =>
        b.id === l.activeBook &&
        b.chapters.some((c) => c.scenes.some((s) => s.id === l.activeScene)),
    ),
  );
  return l;
}
export function saveLibrary(
  l: Library,
  storage: Pick<Storage, "setItem">,
): { ok: boolean; error?: string } {
  try {
    const raw = JSON.stringify(l);
    parseLibrary(raw);
    if (raw.length > MAX_BYTES)
      throw Error("Your books are too big to save here (usually because of large pictures). Download a backup, then try smaller pictures.");
    storage.setItem(KEY, raw);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Storage unavailable",
    };
  }
}
const wordCache = new WeakMap<object, number>();
/** Cached per content object: unchanged chapters aren't re-counted on every keystroke. */
export function wordCount(content: SerializedEditorState): number {
  const hit = content && wordCache.get(content);
  if (hit !== undefined) return hit;
  const n = countWords(content);
  if (content) wordCache.set(content, n);
  return n;
}
function countWords(content: SerializedEditorState): number {
  const walk = (n: any): string =>
    n.type === "text"
      ? n.text
      : (n.children || []).map(walk).join(n.type === "root" ? "\n" : "");
  return walk(content.root).trim().split(/\s+/).filter(Boolean).length;
}
