import {it,expect} from 'vitest';
import {seed,parseLibrary} from '../src/model';
import {buildPrintHtml,type PublishBook} from '../src/publishing';
const src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1l8AAAAASUVORK5CYII=';
const placement={x:12,y:24,width:60,height:30};
it('round trips placement independently from original and crop and rejects unsafe geometry',()=>{const l:any=seed();const s=l.books[0].chapters[0].scenes[0];s.image={src,alt:'Art',originalSrc:src,crop:{x:0,y:0,width:1,height:1},placement};expect(parseLibrary(JSON.stringify(l)).books[0].chapters[0].scenes[0].image).toEqual(s.image);for(const bad of [{...placement,width:0},{...placement,x:10000},{...placement,height:null}]){s.image.placement=bad;expect(()=>parseLibrary(JSON.stringify(l))).toThrow();}});
it('publishes page-relative placement without modifying image pixels',()=>{const b:PublishBook={title:'Art',format:{widthMm:137,heightMm:219,marginMm:10},sections:[{id:'a',kind:'color-art',title:'Art',content:{root:{children:[]}},image:{src,alt:'Art',placement} as any}]};const html=buildPrintHtml(b);expect(html).toContain('left:12%;top:24%;width:60%;height:30%');expect(html).toContain(src);(b.sections[0].image as any).placement.width=Infinity;expect(()=>buildPrintHtml(b)).toThrow();});
