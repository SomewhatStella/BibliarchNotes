import {it,expect} from 'vitest';
import {canvasDimensions} from '../src/IllustrationTools';
import {buildPrintHtml,type PublishBook} from '../src/publishing';
it('honors custom trim dimensions at 300 DPI and rejects unsafe allocation',()=>{
 expect(canvasDimensions(137,219)).toEqual({width:Math.round(137/25.4*300),height:Math.round(219/25.4*300)});
 for(const [w,h] of [[0,100],[NaN,100],[10000,100],[500,500]])expect(()=>canvasDimensions(w,h)).toThrow();
});
it('PDF HTML preserves slider focal crop and original image source',()=>{
 const src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1l8AAAAASUVORK5CYII=';
 const book:PublishBook={title:'Art',format:{widthMm:137,heightMm:219,marginMm:10},sections:[{id:'art',kind:'color-art',title:'Art',content:{root:{children:[]}},image:{src,alt:'Original',fit:'cover',position:'27% 73%'}}]};
 const html=buildPrintHtml(book);expect(html).toContain('object-fit:cover');expect(html).toContain('object-position:27% 73%');expect(html).toContain(src);expect(html).not.toContain('section-controls');
});
