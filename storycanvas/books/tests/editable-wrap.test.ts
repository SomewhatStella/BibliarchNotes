import {describe,it,expect} from 'vitest';
import {createPresetBook,styledPage} from '../src/templates';
import {normalizeLayout} from '../src/design';
import {detectContour,wrapShape} from '../src/contour';
describe('editable layout and local contours',()=>{
 it('newly inserted minimal chapter opener starts centered too',()=>{expect(styledPage('chapter-title','minimal').layout?.titleAlign).toBe('center');expect(styledPage('prose','minimal').layout?.titleAlign).toBe('left');});
 it('centers new light novel chapters without locking later choices',()=>{const s=createPresetBook('light-novel').chapters.flatMap(c=>c.scenes).find(s=>s.template==='chapter-title')!;expect(s.layout?.titleAlign).toBe('center');expect(normalizeLayout({...s.layout,titleAlign:'right'}).titleAlign).toBe('right');expect(normalizeLayout({titleAlign:'justify'}).titleAlign).toBe('justify');});
 it('detects alpha silhouette conservatively and falls back for opaque photos',()=>{const data=new Uint8ClampedArray(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4;data[i+3]=x>=4&&x<12?255:0;}const c=detectContour(data,16,16);expect(c).not.toBeNull();expect(c!.some(([x])=>x===25)).toBe(true);data.fill(255);expect(detectContour(data,16,16)).toBeNull();});
 it('optionally detects a uniform background, not a full opaque rectangle',()=>{const d=new Uint8ClampedArray(16*16*4).fill(255);for(let y=3;y<13;y++)for(let x=5;x<11;x++){const i=(y*16+x)*4;d[i]=d[i+1]=d[i+2]=0;}expect(detectContour(d,16,16)).toBeNull();expect(detectContour(d,16,16,true)).not.toBeNull();});
 it('maps contours below vertical offset, rectangle fallback and gap are explicit',()=>{expect(wrapShape([[25,0],[75,100],[25,100]],100,200,30)).toContain('25px 30px');expect(wrapShape(undefined,100,200,30)).toBe('inset(30px 0 0 0)');});
});
