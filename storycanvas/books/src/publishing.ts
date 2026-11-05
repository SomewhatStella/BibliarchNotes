import JSZip from "jszip";
import {paragraphStyleCss} from './paragraph-styles';
import {assertImagePlacement, type ImagePlacement} from './image-placement';
import {overlayTextHtml} from './overlay-runs';
import {assertOverlay, overlayStyle, overlayBackgroundStyle, isIllustration, type ArtworkOverlay} from './artwork';
import {assertDesign, fontCss, fontBytes, decalSource, normalizeLayout, ORNAMENTS, designCss, type CustomFont, type Decal, type PageLayout, type ImageMode} from './design';

export type PublishSection = {
  overlay?: ArtworkOverlay;
  /** Small label above a chapter opener's title, e.g. "CHAPTER 3" (matches the editor). */
  label?: string;
  /** Chapter title for right-hand running heads. */
  chapter?: string;
  /** Title and chapter number are already headings inside `content`. */
  inlineTitle?: boolean;
  tocTitle?: string;
  id: string;
  title: string;
  kind: string;
  content: any;
  image?: {
    placement?: ImagePlacement;
    src: string;
    alt: string;
    caption?: string;
    widthPercent?: number;
    rotation?: number;
    opacity?: number;
    fit?: "contain" | "cover";
    position?: string;
    mode?: ImageMode;
  };
  decoration?: string;
  decals?: Decal[];
  layout?: Partial<PageLayout>;
};
export type PublishBook = {
  title: string;
  author?: string;
  customFonts?: CustomFont[];
  format: {
    widthMm: number;
    heightMm: number;
    marginMm: number;
    mirror?: boolean;
    bleedMm?: number;
    header?: string;
    footer?: string;
    bodyFont?: string;
    bodySizePt?: number;
    headingFont?: string;
    paragraphIndent?: number;
    indentStepMm?: number;
    paragraphAlign?: 'left' | 'justify';
    headingSizePt?:number;lineHeight?:number;paragraphSpacing?:number;tracking?:number;insideMm?:number;outsideMm?:number;recto?:boolean;safeMm?:number;
  };
  sections: PublishSection[];
};
export const MAX_PUBLISH_BYTES = 12 * 1024 * 1024;
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
const cssString = (s: string) =>
  '"' +
  s.replace(/[\\"\n\r<>]/g, (c) => "\\" + c.charCodeAt(0).toString(16) + " ") +
  '"';
function range(n: unknown, min: number, max: number, label: string) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
    throw new Error(`Invalid ${label} (${min}–${max})`);
}
function text(s: unknown, label: string, max = 2000) {
  if (typeof s !== "string" || s.length > max)
    throw new Error(`Invalid ${label}`);
}
export function imageData(src: string) {
  const match =
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src);
  if (!match || match[2].length % 4 !== 0)
    throw new Error("Only embedded PNG, JPEG or WebP images are supported");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const kind = match[1];
  if (
    (kind === "png" &&
      !(
        bytes[0] === 137 &&
        bytes[1] === 80 &&
        bytes[2] === 78 &&
        bytes[3] === 71
      )) ||
    (kind === "jpeg" &&
      !(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)) ||
    (kind === "webp" &&
      !(
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      ))
  )
    throw new Error("Invalid image signature");
  let width = 0,
    height = 0;
  if (kind === "png" && bytes.length >= 24) {
    const v = new DataView(bytes.buffer);
    width = v.getUint32(16);
    height = v.getUint32(20);
  }
  if (kind === "jpeg") {
    for (let p = 2; p + 9 < bytes.length;) {
      if (bytes[p] !== 255) break;
      const marker = bytes[p + 1];
      const len = (bytes[p + 2] << 8) | bytes[p + 3];
      if ([192, 193, 194].includes(marker)) {
        height = (bytes[p + 5] << 8) | bytes[p + 6];
        width = (bytes[p + 7] << 8) | bytes[p + 8];
        break;
      }
      if (len < 2) break;
      p += 2 + len;
    }
  }
  if (kind === "webp") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    const v = new DataView(bytes.buffer);
    if (chunk === 'VP8X' && bytes.length >= 30) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = v.getUint32(21, true);
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >>> 14) & 0x3fff);
    } else if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 1 && bytes[25] === 0x2a) {
      width = v.getUint16(26, true) & 0x3fff;
      height = v.getUint16(28, true) & 0x3fff;
    }
  }
  if (width > 20000 || height > 20000 || width * height > 60000000)
    throw new Error("Image exceeds safe decoded dimensions");
  return { bytes, kind, width, height };
}
export function assertPublishBook(
  value: unknown,
): asserts value is PublishBook {
  if (!value || typeof value !== "object") throw new Error("Invalid book");
  const b = value as PublishBook;
  fontCss(b.customFonts || []);
  if (JSON.stringify(value).length > MAX_PUBLISH_BYTES)
    throw new Error("Book exceeds 12 MiB limit");
  text(b.title, "title");
  if (b.author !== undefined) text(b.author, "author");
  if (!b.format) throw new Error("Missing page format");
  const f = b.format;
  if(f.paragraphIndent!==undefined)range(f.paragraphIndent,0,4,'paragraph indent');
  if(f.indentStepMm!==undefined)range(f.indentStepMm,3,40,'indent size');
  if(f.paragraphAlign!==undefined&&!['left','justify'].includes(f.paragraphAlign))throw Error('Invalid paragraph alignment');
  for(const [key,min,max] of [['headingSizePt',6,72],['lineHeight',1,3],['paragraphSpacing',0,60],['tracking',-2,5],['insideMm',0,60],['outsideMm',0,60],['safeMm',0,20]] as const)if(f[key]!==undefined)range(f[key],min,max,key);
  if(f.recto!==undefined&&typeof f.recto!=='boolean')throw Error('Invalid recto flag');
  range(f.widthMm, 60, 500, "width");
  range(f.heightMm, 60, 500, "height");
  range(f.marginMm, 0, Math.min(f.widthMm, f.heightMm) / 3, "margin");
  if (f.bleedMm !== undefined) range(f.bleedMm, 0, 10, "bleed");
  if (f.bodySizePt !== undefined) range(f.bodySizePt, 6, 48, "font size");
  for (const s of [f.header, f.footer])
    if (s !== undefined) text(s, "running text", 500);
  for (const font of [f.bodyFont, f.headingFont])
    if (font !== undefined && !/^[\w ,'-]{1,100}$/.test(font))
      throw new Error("Invalid font family");
  if (
    !Array.isArray(b.sections) ||
    !b.sections.length ||
    b.sections.length > 500
  )
    throw new Error("Book requires 1–500 sections");
  let nodes = 0;
  function walk(n: any, depth: number) {
    if (!n || typeof n !== "object" || depth > 40 || ++nodes > 100000)
      throw new Error("Invalid or excessively complex editor content");
    if (n.text !== undefined) text(n.text, "editor text", 200000);
    if (n.children !== undefined) {
      if (!Array.isArray(n.children))
        throw new Error("Invalid editor children");
      for (const c of n.children) walk(c, depth + 1);
    }
  }
  for (const s of b.sections) {
    assertDesign(s);
    assertOverlay(s.overlay);
    text(s.id, "section id");
    text(s.title, "section title");
    if (s.label !== undefined) text(s.label, "chapter label", 60);
    if (s.chapter !== undefined) text(s.chapter, "chapter title", 300);
    text(s.kind, "section kind", 100);
    if (s.content?.root) walk(s.content.root, 0);
    else if (s.content != null)
      throw new Error("Expected serialized Lexical editor state");
    if (s.image) {
      text(s.image.src, "image", MAX_PUBLISH_BYTES);
      imageData(s.image.src);
      if(s.image.placement!==undefined)assertImagePlacement(s.image.placement);
      text(s.image.alt, "image alt");
      if (s.image.caption !== undefined) text(s.image.caption, "caption");
      if (s.image.widthPercent !== undefined)
        range(s.image.widthPercent, 1, 100, "image width");
      if (s.image.rotation !== undefined)
        range(s.image.rotation, -360, 360, "image rotation");
      if (s.image.opacity !== undefined)
        range(s.image.opacity, 0, 1, "image opacity");
      if (
        s.image.fit !== undefined &&
        !["contain", "cover"].includes(s.image.fit)
      )
        throw new Error("Invalid image fit");
      if (
        s.image.position !== undefined &&
        !/^(?:(?:center|top|bottom|left|right)(?: (?:center|top|bottom|left|right))?|(?:100|[0-9]{1,2})% (?:100|[0-9]{1,2})%)$/.test(
          s.image.position,
        )
      )
        throw new Error("Invalid image position");
    }
  }
}
function lexical(n: any): string {
  if (!n) return "";
  if (n.type === "text") {
    let t = esc(n.text);
    const f = Number(n.format) || 0;
    if (f & 2) t = `<em>${t}</em>`;
    if (f & 1) t = `<strong>${t}</strong>`;
    if (f & 4) t = `<s>${t}</s>`;
    if (f & 8) t = `<u>${t}</u>`;
    if (f & 16) t = `<code>${t}</code>`;
    if (f & 32) t = `<sub>${t}</sub>`;
    if (f & 64) t = `<sup>${t}</sup>`;
    return t;
  }
  if (n.type === "linebreak") return "<br />";
  if (n.type === "tab") return "	";
  const c = (n.children || []).map(lexical).join("");
  const tag =
    n.type === "paragraph"
      ? "p"
      : n.type === "heading" && /^h[1-6]$/.test(n.tag)
        ? n.tag
        : n.type === "quote"
          ? "blockquote"
          : n.type === "list"
            ? n.listType === "number"
              ? "ol"
              : "ul"
            : n.type === "listitem"
              ? "li"
              : null;
  const indent = Math.max(0, Math.min(10, Math.floor(Number(n.indent) || 0)));
  const styles = [
    ["left", "center", "right", "justify"].includes(n.format) ? `text-align:${n.format}` : "",
    indent && tag !== "ul" && tag !== "ol" && tag !== "li" ? `padding-left:calc(${indent} * var(--indent-step, 12.7mm))` : "",
  ].filter(Boolean);
  const align = styles.length ? ` style="${styles.join(";")}"` : "";
  return tag ? `<${tag}${align}>${c || "<br />"}</${tag}>` : c;
}
function section(
  s: PublishSection,
  i: number,
  epub = false,
  imageSrc?: string,
  all:PublishSection[]=[],
) {
  const toc=s.kind==='toc'?`<ol class="toc-list">${all.map((x,j)=>x.kind==='toc'||(x.inlineTitle&&!x.tocTitle)?'':`<li><a href="${epub?'':'#'}section-${j+1}${epub?'.xhtml':''}">${esc(x.tocTitle??x.title)}</a></li>`).join('')}</ol>`:'';
  const art = ["color-art", "bnw-art", "back-cover"].includes(s.kind);
  const image = s.image;
  const p=!epub&&art?image?.placement:undefined;
  const style =
    !epub && image
      ? ` style="${p?`position:absolute;left:${p.x}%;top:${p.y}%;width:${p.width}%;height:${p.height}%;max-width:none;max-height:none;margin:0;`:`width:${image.widthPercent ?? 100}%;`}transform:rotate(${image.rotation ?? 0}deg);opacity:${image.opacity ?? 1};object-fit:${image.fit ?? "contain"};object-position:${image.position ?? "center"};${s.kind === "bnw-art" ? "filter:grayscale(1);" : ""}"`
      : "";
  const l=normalizeLayout(s.layout);
  const mode=image?.mode || 'inline';
  const img=image?`<img src="${esc(imageSrc??image.src)}" alt="${esc(image.alt)}"${style} />`:'';
  const figure=image?`<figure class="design-image image-${isIllustration(s.kind)?'inline':mode}">${mode==='spread'&&!epub&&!isIllustration(s.kind)?`<div class="spread-panel">${img}</div><div class="spread-panel"><img src="${esc(imageSrc??image.src)}" alt="" /></div>`:img}${image.caption&&!isIllustration(s.kind)?`<figcaption>${esc(image.caption)}</figcaption>`:''}</figure>`:'';
  const decals=epub?'':(s.decals||[]).map(d=>`<img class="decal" src="${decalSource(d.src,d.color)}" alt="" style="left:${d.x}%;top:${d.y}%;width:${d.width}%;transform:rotate(${d.rotation}deg);opacity:${d.opacity}" />`).join('');
  const divider=l.divider==='none'||isIllustration(s.kind)?'':`<div class="scene-divider">${ORNAMENTS[l.divider]}</div>`;
  const chapterPage=!epub&&s.chapter?`page:ch${[...new Set(all.map(x=>x.chapter).filter(Boolean))].indexOf(s.chapter)};`:'';
  return `<section data-kind="${esc(s.kind)}" id="section-${i + 1}" class="page-design ${art ? "art" : "text"}${["book-front", "chapter-title"].includes(s.kind)&&!s.inlineTitle ? " title-page" : ""}" style="${!epub&&["book-front","copyright"].includes(s.kind)?"page:front;":!epub&&s.kind==="toc"?"page:contents;":chapterPage}border:${l.border==='none'?'none':`3px ${l.border} currentColor;padding:8mm;min-height:var(--page-content-h)`}">${decals}${isIllustration(s.kind)?'':s.inlineTitle?(l.chapterSpacing>0?`<div class="first-line-space" style="height:${l.chapterSpacing}mm"></div>`:''):s.kind==='prose'?'':`${s.kind==='chapter-title'&&s.label?`<p class="chapter-label" style="padding-top:${l.chapterSpacing}mm">${esc(s.label)}</p>`:''}<h1 style="text-align:${l.titleAlign};padding-top:${s.kind==='chapter-title'&&s.label?0:l.chapterSpacing}mm">${esc(s.title)}</h1>`}${s.inlineTitle?'':toc}${figure}<div class="page-design-content${l.dropCap?' drop-cap':''}">${isIllustration(s.kind)?'':lexical(s.content?.root)}</div>${s.inlineTitle?toc:''}${s.overlay?`<div class="artwork-overlay" style="${epub?'':overlayStyle(s.overlay)}">${epub?'':`<span aria-hidden="true" class="overlay-background" style="${overlayBackgroundStyle(s.overlay)}"></span>`}${overlayTextHtml(s.overlay)}</div>`:''}${divider}</section>`;
}
export function validatePrint(book: PublishBook): string[] {
  try {
    assertPublishBook(book);
  } catch (e) {
    return [(e as Error).message];
  }
  const warnings: string[] = [];
  for (const s of book.sections)
    if (s.image) {
      const d = imageData(s.image.src);
      const mm =
        ((book.format.widthMm - 2 * book.format.marginMm) *
          (s.image.widthPercent ?? 100)) /
        100;
      if (d.width && d.width / (mm / 25.4) < 150)
        warnings.push(
          `${s.title}: low image resolution (below 150 DPI at print size).`,
        );
      if (!d.width)
        warnings.push(
          `${s.title}: image resolution could not be determined; verify 300 DPI artwork.`,
        );
    }
  for (const s of book.sections) {
    if(s.image?.mode==='spread') warnings.push(`${s.title}: spread artwork prints as two consecutive cropped halves; verify facing-page alignment and source aspect ratio.`);
    for(const d of s.decals||[]) if(!d.src.startsWith('builtin:')) {const info=imageData(d.src);const mm=(book.format.widthMm-2*book.format.marginMm)*d.width/100;if(!info.width||info.width/(mm/25.4)<150)warnings.push(`${s.title}: ornament resolution is low or unknown; verify 300 DPI artwork.`);}
  }
  if (book.format.bleedMm)
    warnings.push(
      "PDF includes bleed and trim boxes. Confirm bleed artwork and your printer’s color/profile requirements before production.",
    );
  return warnings;
}
export function buildPrintHtml(book: PublishBook): string {
  assertPublishBook(book);
  const f = book.format;
  const m = f.marginMm;
  const inner = f.mirror ? (f.insideMm ?? Math.min(m + 5, f.widthMm / 3)) : m;
  const outer = f.mirror ? (f.outsideMm ?? m) : m;
  const running=(value:string)=>value.replaceAll('{title}',book.title).split('{page}').map(cssString).join(' counter(page) ');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;" /><title>${esc(book.title)}</title><style>
 @page {size:${f.widthMm}mm ${f.heightMm}mm;margin:${m}mm;@top-center{content:${running(f.header ?? book.title)};font-size:9pt;}@bottom-center{content:${running(f.footer ?? "{page}")};font-size:9pt;}}
 ${(f.header??'{title}')==='{title}'?[...new Set(book.sections.map(x=>x.chapter).filter(Boolean))].map((c,k)=>`@page ch${k}:right{@top-center{content:${cssString(c!)}}}`).join(''):''}
 @page front{@top-center{content:none}@bottom-center{content:none}}@page contents{@top-center{content:none}}@page :left{margin-left:${outer}mm;margin-right:${inner}mm;}@page :right{margin-left:${inner}mm;margin-right:${outer}mm;}
 *{box-sizing:border-box}.page-design-content :is(p,h1,h2,h3,h4,h5,h6){white-space:pre-wrap;tab-size:var(--indent-step,12.7mm)}.page-design-content p{hyphens:auto;-webkit-hyphens:auto;hyphenate-limit-chars:5 2 2;text-wrap:pretty}:root{--indent-step:${f.indentStepMm??12.7}mm;--page-content-h:${Math.max(20,f.heightMm-2*m-12)}mm;--heading-font:${f.headingFont ?? "Georgia, serif"};--heading-size:${f.headingSizePt??26}pt}${paragraphStyleCss('.page-design-content')}.toc-list{list-style:none;padding:0;margin:1em 0 0}.toc-list li{margin:0 0 .6em}.toc-list a{color:inherit;text-decoration:none}html{print-color-adjust:exact;-webkit-print-color-adjust:exact}body{margin:0;color:#171717;background:white;font-family:${f.bodyFont ?? "Georgia, serif"};font-size:${f.bodySizePt ?? 11}pt;line-height:${f.lineHeight??1.55};letter-spacing:${f.tracking??0}px;overflow-wrap:anywhere}h1,h2,h3{font-family:${f.headingFont ?? "Georgia, serif"};break-after:avoid}h1{font-size:${f.headingSizePt??26}pt}section{break-before:page}section:first-child{break-before:auto}p{orphans:3;widows:3;margin:0 0 ${f.paragraphSpacing??16}px;${f.paragraphIndent!==undefined?`text-indent:${f.paragraphIndent}em;`:''}${f.paragraphAlign?`text-align:${f.paragraphAlign};`:''}}figure{margin:0;break-inside:avoid}img{display:block;max-width:100%;max-height:${f.heightMm - 2 * m - 25}mm;margin:auto}figcaption{text-align:center;font-size:9pt}.title-page{padding-top:20mm}.title-page[data-kind=book-front] .page-design-content{text-align:center}.chapter-label{margin:0 0 4mm;text-align:center;font-size:.75em;letter-spacing:.3em;text-transform:uppercase}.art{page:artwork;text-align:center}.art h1{display:none}.art figure{width:100%}.art img{width:100%;height:${f.heightMm}mm;max-height:${f.heightMm}mm}.art figure:has(figcaption) img{height:${f.heightMm - 15}mm}.art figcaption{padding:2mm}@page artwork{margin:0;@top-center{content:none}@bottom-center{content:none}}blockquote{border-left:2px solid #aaa;padding-left:1em}a{color:inherit}
 ${fontCss(book.customFonts||[])}${designCss}
 .art .design-image{margin:0}.art .design-image img{height:${f.heightMm}mm}.art .design-image:has(figcaption) img{height:${f.heightMm-15}mm}
 .page-design{overflow:clip}.art[data-kind="color-art"],.art[data-kind="bnw-art"],.art:has(figure img[style*="position:absolute"]){height:${f.heightMm}mm;overflow:clip}.art:has(figure img[style*="position:absolute"]) figure{position:static;margin:0}.art .decal{z-index:2}.art .artwork-overlay{z-index:3}
 ${f.recto?'section[data-kind="chapter-title"]{break-before:right}':''}
 .image-spread{display:block;break-before:page;break-inside:auto}.image-spread .spread-panel{width:100%;height:${f.heightMm-2*m}mm;aspect-ratio:auto;break-after:page}.image-spread .spread-panel img{width:200%!important;max-width:none!important;max-height:none!important;height:100%!important}.image-spread .spread-panel:last-child img{left:-100%}.image-full img{height:${f.heightMm-2*m-15}mm;max-height:none}.decal{max-height:none;margin:0}.page-design{display:block}.image-half{width:50%}.image-float-left,.image-float-right{width:42%}
 </style></head><body>${book.sections.map((s, i) => section(s, i, false, undefined,book.sections)).join("")}</body></html>`;
}
export async function buildEpub(book: PublishBook): Promise<Uint8Array> {
  assertPublishBook(book);
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    '<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/package.opf" media-type="application/oebps-package+xml" /></rootfiles></container>',
  );
  let manifest =
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" /><item id="style" href="style.css" media-type="text/css" />',
    spine = "",
    nav = "";
  const xhtml = (title: string, body: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en" xml:lang="en"><head><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css" /></head><body>${body}</body></html>`;
  book.sections.forEach((s, i) => {
    const id = i + 1;
    let src: string | undefined;
    if (s.image) {
      const d = imageData(s.image.src);
      src = `images/image-${id}.${d.kind}`;
      zip.file("OEBPS/" + src, d.bytes);
      manifest += `<item id="img-${id}" href="${src}" media-type="image/${d.kind}" />`;
    }
    const file = `section-${id}.xhtml`;
    zip.file("OEBPS/" + file, xhtml(s.title, section(s, i, true, src,book.sections)));
    manifest += `<item id="s-${id}" href="${file}" media-type="application/xhtml+xml" />`;
    spine += `<itemref idref="s-${id}" />`;
    nav += `<li><a href="${file}">${esc(s.title || "Untitled section")}</a></li>`;
  });
  const fonts=book.customFonts||[];
  const fontPath=(f:CustomFont)=>`fonts/${f.id}.${f.mime.split('/')[1]}`;
  for(const font of fonts){zip.file('OEBPS/'+fontPath(font),fontBytes(font));manifest+=`<item id="${font.id}" href="${fontPath(font)}" media-type="${font.mime}" />`;}
  zip.file('OEBPS/font-licenses.txt',fonts.map(f=>`${f.family}: ${f.license||'User-supplied font. Confirm embedding rights and retain the original font license.'}`).join('\n'));
  manifest+='<item id="font-licenses" href="font-licenses.txt" media-type="text/plain" />';
  zip.file(
    "OEBPS/nav.xhtml",
    xhtml(
      book.title,
      `<nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${nav}</ol></nav>`,
    ),
  );
  zip.file(
    "OEBPS/style.css",
    fontCss(fonts,fontPath)+`body{line-height:${book.format.lineHeight??1.5};letter-spacing:${book.format.tracking??0}px;font-family:${book.format.bodyFont||'serif'};${book.format.bodySizePt!==undefined?`font-size:${book.format.bodySizePt}pt;`:''}}:root{--indent-step:${book.format.indentStepMm??12.7}mm}p,h1,h2,h3,h4,h5,h6{white-space:pre-wrap;tab-size:var(--indent-step)}p{hyphens:auto;-webkit-hyphens:auto;${book.format.paragraphIndent!==undefined?`text-indent:${book.format.paragraphIndent}em;`:''}margin:0 0 ${book.format.paragraphSpacing??16}px;${book.format.paragraphAlign?`text-align:${book.format.paragraphAlign};`:''}}h1,h2,h3{font-family:${book.format.headingFont||'serif'}}:root{--heading-font:${book.format.headingFont||'serif'};--heading-size:${book.format.headingSizePt??22}pt}${paragraphStyleCss('.page-design-content')}img{max-width:100%;height:auto}figure{margin:1em 0}figcaption{font-size:0.9em}h1{break-after:avoid}${designCss}.image-spread{display:block}.image-spread img{width:100%}.image-full img{max-height:none}`,
  );
  zip.file(
    "OEBPS/package.opf",
    `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${crypto.randomUUID()}</dc:identifier><dc:title>${esc(book.title)}</dc:title><dc:creator>${esc(book.author ?? "Unknown")}</dc:creator><dc:language>en</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta><meta property="rendition:layout">reflowable</meta></metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`,
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
