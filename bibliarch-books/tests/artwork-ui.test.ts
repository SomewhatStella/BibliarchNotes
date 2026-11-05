import {test,expect} from 'vitest';
import {buildPrintHtml} from '../src/publishing';
import {emptyDoc,newBook,parseLibrary} from '../src/model';
const overlay={text:'<Dream>',x:20,y:30,size:32,color:'#aa2244'};
test('illustration exports no automatic title or manuscript text, but safe overlay',()=>{
 const html=buildPrintHtml({title:'Book',format:{widthMm:128,heightMm:182,marginMm:15},sections:[{id:'art',title:'Hidden illustration title',kind:'color-art',content:emptyDoc(['Hidden manuscript']),overlay} as any]});
 expect(html).not.toContain('Hidden illustration title');expect(html).not.toContain('Hidden manuscript');expect(html).toContain('&lt;Dream&gt;');expect(html).toContain('left:20%');expect(html).not.toContain('Upload illustration');
});
test('overlay survives library reload and rejects unsafe styling',()=>{
 const b=newBook();(b.chapters[0].scenes[0] as any).overlay=overlay;
 const l={version:1,books:[b],activeBook:b.id,activeScene:b.chapters[0].scenes[0].id};
 expect((parseLibrary(JSON.stringify(l)).books[0].chapters[0].scenes[0] as any).overlay).toEqual(overlay);
 (b.chapters[0].scenes[0] as any).overlay.color='red;position:fixed';expect(()=>parseLibrary(JSON.stringify(l))).toThrow();
});
