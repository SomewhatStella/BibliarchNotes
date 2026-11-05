import {describe,it,expect} from 'vitest';
import {newBook,seed,parseLibrary,pageDimensions,moveScene,pageMargins,pageTemplates} from '../src/model';
describe('core authoring',()=>{
 it('uses JIS B6',()=>expect(pageDimensions({...newBook().appearance,preset:'B6'})).toEqual([128,182]));
 it('moves sections across folders preserving IDs and content',()=>{const b=newBook();const s=b.chapters[0].scenes[0];const moved=moveScene(b,s.id,b.chapters[1].id,0);expect(moved.chapters.flatMap(c=>c.scenes).map(x=>x.id)).toEqual([s.id,b.chapters[1].scenes[0].id]);expect(moved.chapters[0].scenes[0]).toEqual(s);expect(b.chapters).toHaveLength(2)});
 it('mirrors inside and outside margins',()=>{const a={...newBook().appearance,mirror:true,insideMm:30,outsideMm:15};expect(pageMargins(a,1)).toEqual([30,15]);expect(pageMargins(a,2)).toEqual([15,30])});
 it('round trips typography bookmarks and folders without losing v1 text',()=>{const l=seed();Object.assign(l.books[0].appearance,{lineHeight:1.8,paragraphSpacing:18,tracking:0.4,recto:true,safeMm:5});Object.assign(l.books[0].chapters[0],{folder:true});Object.assign(l.books[0].chapters[0].scenes[0],{bookmark:true});expect(parseLibrary(JSON.stringify(l))).toEqual(l)});
 it('offers copyright and contents templates',()=>{expect(pageTemplates).toContain('copyright');expect(pageTemplates).toContain('toc')});
});
