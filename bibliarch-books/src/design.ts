import curatedDecals from './decal-library.json';
import modernOrnaments from './modern-ornaments.json';
import {ORIGINAL_ORNAMENTS} from './original-ornaments';
import {NEW_FINE_LINE_ORNAMENTS} from './fine-line-ornaments';
import sourcedOrnaments from './sourced-ornaments.json';
import {BOTANICAL_EXPANSION} from './fine-line-botanical-expansion';
import {DECORATIVE_EXPANSION} from './fine-line-decorative-expansion';
export const MODERN_ORNAMENTS = [...ORIGINAL_ORNAMENTS,...NEW_FINE_LINE_ORNAMENTS,...sourcedOrnaments,...BOTANICAL_EXPANSION,...DECORATIVE_EXPANSION];
export const MODERN_CATEGORIES = ['Fine-line','Botanical','Celestial','Book ornaments','Corners','Frames','Winter'];
export {ORIGINAL_ORNAMENTS} from './original-ornaments';
export const DECAL_LIBRARY = curatedDecals;
export const IMAGE_MODES = ['inline','half','full','float-left','float-right','spread'] as const;
export type ImageMode = typeof IMAGE_MODES[number];
export type Decal = {id:string;src:string;alt:string;x:number;y:number;width:number;rotation:number;opacity:number;color?:string};
export type PageLayout = {dropCap?:boolean;chapterSpacing:number;titleAlign:'left'|'center'|'right'|'justify';border:'none'|'solid'|'double';divider:'none'|'stars'|'diamond'|'leaves'};
export type CustomFont = {id:string;family:string;data:string;mime:string;name?:string;license?:string};
export const MAX_FONT_BYTES = 256 * 1024;
// Display alias only: retain existing CSS/storage/export family values.
export function fontLabel(family:string):string {return family;}
export const ORNAMENTS = {stars:'✦  ✧  ✦',diamond:'◆',leaves:'❧'};
export const BUILTIN_SVG:Record<string,string> = {
 // Compatibility only: never expose the chunky icon collection in pickers.
 ...Object.fromEntries(modernOrnaments.map(d=>[d.id,d.svg])),
 ...Object.fromEntries(DECAL_LIBRARY.map(d=>[d.id,d.svg])),
 ...Object.fromEntries(ORIGINAL_ORNAMENTS.map(d=>[d.id,d.svg])),
 ...Object.fromEntries(MODERN_ORNAMENTS.map(d=>[d.id,d.svg])),
 stars:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 30"><path fill="#555" d="M20 0L24 11 35 15 24 19 20 30 16 19 5 15 16 11ZM60 5L63 12 70 15 63 18 60 25 57 18 50 15 57 12ZM100 0L104 11 115 15 104 19 100 30 96 19 85 15 96 11Z"/></svg>',
 diamond:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><path fill="#555" d="M50 2L65 15 50 28 35 15Z"/><path stroke="#555" d="M0 15H30M70 15H100"/></svg>',
 leaves:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><path fill="none" stroke="#555" stroke-width="2" d="M5 25Q50 0 95 25M25 17Q15 0 40 10M50 12Q55 0 70 14M70 17Q80 4 90 22"/></svg>'
};
const bound=(v:unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
export function normalizeLayout(v:any={}):PageLayout {return {dropCap:v.dropCap===true,chapterSpacing:bound(v.chapterSpacing,0,100,0),titleAlign:['left','center','right','justify'].includes(v.titleAlign)?v.titleAlign:'left',border:['none','solid','double'].includes(v.border)?v.border:'none',divider:['none','stars','diamond','leaves'].includes(v.divider)?v.divider:'none'};}
export function rasterSource(src:unknown):src is string {
 if(typeof src!=='string'||src.length>1400000)return false;
 const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src);if(!m||m[2].length%4)return false;
 const b=atob(m[2]);return m[1]==='png'?b.startsWith('\x89PNG\r\n\x1a\n'):m[1]==='jpeg'?b.startsWith('\xff\xd8\xff'):b.startsWith('RIFF')&&b.slice(8,12)==='WEBP';
}
export function decalSource(src:string,color?:string):string {
 if(color!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(color))throw new Error('Invalid ornament color');
 if(src.startsWith('builtin:')&&Object.hasOwn(BUILTIN_SVG,src.slice(8))){let svg=BUILTIN_SVG[src.slice(8)];if(color)svg=svg.replace(/(fill|stroke)="(?!none"|inherit"|transparent"|#fff"|#ffffff"|white")[^"]*"/gi,`$1="${color}"`);return 'data:image/svg+xml;base64,'+btoa(svg);}
 if(rasterSource(src))return src;throw new Error('Only vetted raster images or built-in ornaments are allowed');
}
export function assertDesign(scene:any) {
 if(scene.image?.mode!==undefined&&!IMAGE_MODES.includes(scene.image.mode))throw new Error('Invalid image mode');
 if(scene.layout!==undefined){if(!scene.layout||typeof scene.layout!=='object')throw new Error('Invalid layout');const clean=normalizeLayout(scene.layout);for(const key of Object.keys(clean) as (keyof PageLayout)[])if(scene.layout[key]!==undefined&&scene.layout[key]!==clean[key])throw new Error('Invalid layout '+key);}
 if(scene.decals!==undefined){if(!Array.isArray(scene.decals)||scene.decals.length>24)throw new Error('Maximum 24 decals');const ids=new Set();for(const d of scene.decals){if(!d||typeof d.id!=='string'||!/^[\w-]{1,80}$/.test(d.id)||ids.has(d.id)||typeof d.alt!=='string'||d.alt.length>500)throw new Error('Invalid decal');ids.add(d.id);decalSource(d.src,d.color);for(const [k,min,max] of [['x',-200,200],['y',-200,200],['width',1,100],['rotation',-360,360],['opacity',0,1]] as const)if(typeof d[k]!=='number'||!Number.isFinite(d[k])||d[k]<min||d[k]>max)throw new Error('Invalid decal '+k);}}
}
export function fontBytes(font:CustomFont):Uint8Array {
 if(!font||!/^font-[a-zA-Z0-9-]{1,80}$/.test(font.id)||font.family!==`Bibliarch-${font.id}`)throw new Error('Invalid font identifier');
 const m=/^data:(font\/(?:woff2?|ttf|otf));base64,([A-Za-z0-9+/]+={0,2})$/.exec(font.data);if(!m||m[1]!==font.mime||m[2].length%4||m[2].length>Math.ceil(MAX_FONT_BYTES/3)*4)throw new Error('Invalid font data or font exceeds 256 KiB');
 const bytes=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));const signature=String.fromCharCode(...bytes.slice(0,4));const expected:Record<string,string>={'font/woff':'wOFF','font/woff2':'wOF2','font/otf':'OTTO','font/ttf':'\0\x01\0\0'};
 if(signature!==expected[font.mime]||bytes.length<12)throw new Error('Invalid font signature');
 if(font.license!==undefined&&(typeof font.license!=='string'||font.license.length>10000))throw new Error('Invalid font license');return bytes;
}
export function fontCss(fonts:CustomFont[]=[],source?:(f:CustomFont)=>string):string {
 if(!Array.isArray(fonts)||fonts.length>8)throw new Error('Maximum eight custom fonts');const seen=new Set();return fonts.map(f=>{fontBytes(f);if(seen.has(f.id))throw new Error('Duplicate font');seen.add(f.id);return `@font-face{font-family:"${f.family}";src:url("${source?source(f):f.data}");font-weight:400;font-style:normal;font-display:block;}`;}).join('\n');
}
export async function readFont(file:File):Promise<CustomFont> {
 if(file.size>MAX_FONT_BYTES)throw new Error('Font limit is 256 KiB');const ext=file.name.split('.').pop()?.toLowerCase();if(!['woff','woff2','ttf','otf'].includes(ext||''))throw new Error('Use WOFF, WOFF2, TTF or OTF');
 const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(const b of bytes)binary+=String.fromCharCode(b);const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));const id='font-'+Array.from(digest.slice(0,12),b=>b.toString(16).padStart(2,'0')).join('');const f={id,family:`Bibliarch-${id}`,data:`data:font/${ext};base64,${btoa(binary)}`,mime:`font/${ext}`,name:file.name,license:'User confirms rights to embed this font; retain the original license.'};fontBytes(f);
 const face=new FontFace(f.family,bytes);await face.load();document.fonts.add(face);return f;
}
// Pseudo-elements leave Lexical text/selection untouched. Native initial-letter sizes
// the cap to exactly two lines; older EPUB readers get a floating-letter fallback.
export const designCss = `.drop-cap > p:first-of-type::first-letter{float:left;font-size:3em;line-height:.8;margin-right:.12em}@supports (initial-letter:2){.drop-cap > p:first-of-type::first-letter{float:none;font-size:1em;line-height:normal;initial-letter:2}}` + `.page-design{position:relative;display:flow-root}.page-design h1{text-align:var(--title-align,left);padding-top:var(--chapter-spacing,0)}.design-image{margin:0 0 1em;max-width:100%}.design-image img{display:block;width:100%;height:auto;object-fit:contain}.image-half{width:50%;margin-inline:auto}.image-full{break-before:page;break-after:page}.image-full img{max-height:85vh}.image-float-left{float:left;width:42%;margin:0 1.25em 1em 0}.image-float-right{float:right;width:42%;margin:0 0 1em 1.25em}.image-spread{display:grid;grid-template-columns:1fr 1fr;gap:0;clear:both}.spread-panel{overflow:clip;position:relative;aspect-ratio:0.707}.spread-panel img{position:absolute;width:200%;max-width:none;height:100%;object-fit:fill}.spread-panel:last-child img{left:-100%}.decal{position:absolute;pointer-events:none;height:auto;z-index:0}.page-design-content{position:relative;z-index:1}.scene-divider{text-align:center;clear:both;margin:1.5em 0}.page-design figcaption{text-align:center;font-size:.85em;grid-column:1/-1}`;
