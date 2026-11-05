import {it,expect} from 'vitest';
import JSZip from 'jszip';
import {createPresetBook} from '../src/templates';
import {seed,parseLibrary,emptyDoc} from '../src/model';
import {normalizeLayout,designCss} from '../src/design';
import {buildPrintHtml,buildEpub,type PublishBook} from '../src/publishing';
it('light novel starts with title, colored art, chapter one, writing page',()=>{
 const scenes=createPresetBook('light-novel').chapters.flatMap(c=>c.scenes);
 expect(scenes.map(s=>s.template)).toEqual(['book-front','color-art','characters','toc','chapter-title','chapter-title','bnw-art','afterword']);
 expect(scenes[5].title).toBe('Chapter one');
});
it('two-line drop caps survive backups and reject invalid preferences',()=>{
 const l=seed();l.books[0].chapters[0].scenes[0].layout={dropCap:true} as any;
 expect(normalizeLayout(parseLibrary(JSON.stringify(l)).books[0].chapters[0].scenes[0].layout)).toHaveProperty('dropCap',true);
 l.books[0].chapters[0].scenes[0].layout={dropCap:3} as any;
 expect(()=>parseLibrary(JSON.stringify(l))).toThrow(/layout/);
});
it('prose keeps outline titles but exports only body and two-line dropcap styles',async()=>{
 const book:PublishBook={title:'Book',format:{widthMm:128,heightMm:182,marginMm:14},sections:[{id:'p',title:'Writing page',kind:'prose',layout:{dropCap:true} as any,content:emptyDoc(['Original prose remains intact.'])}]};
 const html=buildPrintHtml(book);expect(html).not.toMatch(/<h1[^>]*>Writing page/);expect(html).toContain('drop-cap');expect(designCss).toContain('initial-letter:2');
 const zip=await JSZip.loadAsync(await buildEpub(book));const x=await zip.file('OEBPS/section-1.xhtml')!.async('string');
 expect(x).not.toMatch(/<h1/);expect(x).toContain('Original prose remains intact.');expect(x).toContain('drop-cap');expect(await zip.file('OEBPS/style.css')!.async('string')).toContain('initial-letter:2');
});
