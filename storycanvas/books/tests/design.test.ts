import { describe,it,expect } from 'vitest';
import { assertDesign, fontCss, normalizeLayout, IMAGE_MODES } from '../src/design';
import {buildPrintHtml,buildEpub,assertPublishBook} from '../src/publishing';
import JSZip from 'jszip';
const book:any={title:'Design',format:{widthMm:148,heightMm:210,marginMm:15},sections:[{id:'s',title:'Scene',kind:'scene',content:null}]};
describe('safe page design',()=>{
 it('bounds decals and rejects arbitrary SVG and remote URLs',()=>{
  for(const src of ['https://evil.test/a.png','data:image/svg+xml;base64,PHN2Zz4=']) expect(()=>assertDesign({decals:[{id:'d',src,alt:'',x:0,y:0,width:20,rotation:0,opacity:1}]})).toThrow();
  expect(()=>assertDesign({decals:[{id:'d',src:'builtin:stars',alt:'',x:201,y:0,width:20,rotation:0,opacity:1}]})).toThrow();
 });
 it('supports all six image modes and safe layout defaults',()=>{expect(IMAGE_MODES).toHaveLength(6);expect(normalizeLayout({titleAlign:'url(evil)',chapterSpacing:999}).chapterSpacing).toBe(100);});
 it('rejects injected fonts',()=>{expect(()=>fontCss([{id:'x',family:'x',data:'https://evil.test/font',mime:'font/woff2'}] as any)).toThrow();});
 it('exports fixed decals to print but omits them from reflow EPUB',async()=>{
  const b=structuredClone(book);b.sections[0].decals=[{id:'d',src:'builtin:stars',alt:'Stars',x:5,y:10,width:20,rotation:10,opacity:.5}];b.sections[0].layout={divider:'stars',titleAlign:'center',chapterSpacing:12,border:'double'};
  expect(buildPrintHtml(b)).toContain('class="decal"');
  const zip=await JSZip.loadAsync(await buildEpub(b));expect(await zip.file('OEBPS/section-1.xhtml')!.async('text')).not.toContain('class="decal"');
  b.sections[0].layout.titleAlign='center; background:url(https://evil.test)';expect(()=>assertPublishBook(b)).toThrow();
 });
});
