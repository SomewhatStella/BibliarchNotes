import {it,expect} from 'vitest';
import JSZip from 'jszip';
import {createPresetBook} from '../src/templates';
import {emptyDoc,parseLibrary,seed} from '../src/model';
import {buildPrintHtml,buildEpub,type PublishBook} from '../src/publishing';

it('uses compact sans-serif, indented justified paragraphs and a lone folio',()=>{
 const b=createPresetBook('light-novel');
 expect(b.appearance).toMatchObject({preset:'B6',bodyFont:'Arial',bodySize:13,margin:12,lineHeight:1.45,paragraphSpacing:0,paragraphIndent:1,paragraphAlign:'justify',header:'',footer:'{page}'});
 for(const s of b.chapters.flatMap(c=>c.scenes)) {expect(s.layout?.divider).toBe('none');expect(s.layout?.border).toBe('none');expect(s.decals||[]).toEqual([]);}
 expect(createPresetBook('novel').appearance.bodyFont).toBe('Georgia');
});
it('round trips paragraph defaults and rejects unsafe values',()=>{
 const l=seed();Object.assign(l.books[0].appearance,{paragraphIndent:1,paragraphAlign:'justify'});
 expect(parseLibrary(JSON.stringify(l))).toEqual(l);
 for(const patch of [{paragraphIndent:-1},{paragraphIndent:Infinity},{paragraphAlign:'justify; color:red'}]){
  const bad=structuredClone(l);Object.assign(bad.books[0].appearance,patch);expect(()=>parseLibrary(JSON.stringify(bad))).toThrow();
 }
});
const book=():PublishBook=>({title:'Reference layout',format:{widthMm:128,heightMm:182,marginMm:12,bodyFont:'Arial',bodySizePt:9.75,lineHeight:1.45,paragraphSpacing:0,paragraphIndent:1,paragraphAlign:'justify',header:'',footer:'{page}'} as any,sections:[{id:'prose',title:'Writing page',kind:'prose',content:emptyDoc(['Original writing.','Another paragraph.'])}]});
it('prints paragraph defaults with no browser top margins or running header',()=>{
 const html=buildPrintHtml(book());expect(html).toContain('text-indent:1em');expect(html).toContain('text-align:justify');expect(html).toContain('margin:0 0 0px');expect(html).toContain('@top-center{content:""');expect(html).not.toContain('<h1');
});
it('exports the same reflowable EPUB typography',async()=>{
 const zip=await JSZip.loadAsync(await buildEpub(book()));const css=await zip.file('OEBPS/style.css')!.async('string');
 for(const value of ['font-family:Arial','font-size:9.75pt','text-indent:1em','text-align:justify','margin:0 0 0px'])expect(css).toContain(value);
 expect(await zip.file('OEBPS/section-1.xhtml')!.async('string')).toContain('Original writing.');
});
it('rejects unsafe export paragraph preferences',()=>{
 for(const patch of [{paragraphIndent:-1},{paragraphAlign:'left;color:red'}]){const b=book();Object.assign(b.format,patch);expect(()=>buildPrintHtml(b)).toThrow();}
});
