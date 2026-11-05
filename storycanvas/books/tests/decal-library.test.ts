import {it,expect} from 'vitest';
import {decalSource,assertDesign,DECAL_LIBRARY} from '../src/design';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {PDFDocument} from 'pdf-lib';
import {buildEpub} from '../src/publishing';
import JSZip from 'jszip';
import {createPresetBook} from '../src/templates';
import {buildPrintHtml} from '../src/publishing';
it('accepts curated Tabler identifiers and embeds licensed offline SVG',()=>{
 const src=decalSource('builtin:tabler-moon');
 expect(src).toMatch(/^data:image\/svg\+xml;base64,/);
 const svg=atob(src.split(',')[1]);expect(svg).toContain('<svg');expect(svg).toContain('MIT License');expect(svg).toContain('Permission is hereby granted');
 for(const bad of ['builtin:tabler-unknown','builtin:__proto__','https://tabler.io/moon.svg','data:image/svg+xml,<svg/>'])expect(()=>decalSource(bad)).toThrow();
 const decal={id:'moon',src:'builtin:tabler-moon',alt:'Moon',x:45,y:5,width:10,rotation:0,opacity:.3};
 expect(()=>assertDesign({decals:[decal]})).not.toThrow();
 const html=buildPrintHtml({title:'Moon',format:{widthMm:148,heightMm:210,marginMm:15},sections:[{id:'s',title:'Chapter',kind:'chapter-title',content:null,decals:[decal]}]} as any);
 expect(html).toContain(src);expect(html).not.toContain('src="https:');
});
it('pins all sixteen original assets with verified provenance and passive SVG',()=>{
 expect(DECAL_LIBRARY).toHaveLength(16);
 for(const d of DECAL_LIBRARY){
  const original=readFileSync(new URL('../public/decals/tabler/'+d.id.slice(7)+'.svg',import.meta.url));
  expect(createHash('sha256').update(original).digest('hex')).toBe(d.sha256);
  expect(d.source).toContain('/cade2ac67f6c09f96363f096410172ebd1cc9eb3/icons/outline/');
  expect(d.svg).not.toMatch(/<script|<foreignObject|\son\w+=|href=|url\(/i);
  expect(atob(decalSource('builtin:'+d.id).split(',')[1])).toContain('MIT License');
 }
});
it('renders every decal offline in print and a genuine PDF; EPUB omits fixed decals',async()=>{
 const book:any={title:'Offline decals',format:{widthMm:148,heightMm:210,marginMm:15},sections:[{id:'s',title:'Chapter',kind:'chapter-title',content:null,decals:DECAL_LIBRARY.map((d,i)=>({id:'d'+i,src:'builtin:'+d.id,alt:d.name,x:(i%4)*20,y:Math.floor(i/4)*20,width:10,rotation:0,opacity:.5}))}]};
 const browser=await chromium.launch({headless:true});
 try{const page=await browser.newPage();await page.route('**/*',r=>r.abort());await page.setContent(buildPrintHtml(book));await page.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>(img as HTMLImageElement).decode()));});expect(await page.locator('img.decal').count()).toBe(16);const pdf=await page.pdf({preferCSSPageSize:true});expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(0);}finally{await browser.close();}
 const zip=await JSZip.loadAsync(await buildEpub(book));expect(await zip.file('OEBPS/section-1.xhtml')!.async('text')).not.toContain('class="decal"');
},30000);
it('keeps reference-inspired LN pages undecorated and preserves sequence',()=>{
 const scenes=createPresetBook('light-novel').chapters.flatMap(c=>c.scenes);
 expect(scenes.map(s=>s.template)).toEqual(['book-front','color-art','characters','toc','chapter-title','chapter-title','bnw-art','afterword']);
 for(const s of scenes)expect(s.decals||[]).toEqual([]);
});
