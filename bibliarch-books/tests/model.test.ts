import {describe,it,expect} from 'vitest';
import {seed,parseLibrary,saveLibrary,addRevision,restoreRevision,emptyDoc,reorder} from '../src/model';
describe('local manuscript',()=>{
 it('seeds generic front matter and chapter text with separate appearance',()=>{const s=seed(); expect(s.books[0].title).toBe('Book name'); expect(s.books[0].chapters[1].title).toBe('Chapter name'); expect(JSON.stringify(s.books[0].chapters)).toContain('Lorem ipsum'); expect(s.books[0].appearance.preset).toBe('A4'); expect(parseLibrary(JSON.stringify(s))).toEqual(s)});
 it('rejects corrupt, oversized and unsafe imports',()=>{for(const raw of ['{}','null','x',' '.repeat(4_000_001)]) expect(()=>parseLibrary(raw)).toThrow(); const s=seed(); s.books[0].chapters[0].scenes[0].content= {root:{type:'evil'}} as never; expect(()=>parseLibrary(JSON.stringify(s))).toThrow()});
 it('reports storage failure without claiming success',()=>{expect(saveLibrary(seed(),{setItem(){throw Error('quota')}}).ok).toBe(false); let result='';expect(saveLibrary(seed(),{setItem(k,v){result=v}}).ok).toBe(true);expect(parseLibrary(result).books).toHaveLength(1)});
 it('bounds snapshots and restores manuscript without changing appearance',()=>{let b=seed().books[0];for(let i=0;i<25;i++){b.title=String(i); b=addRevision(b,'manual')} expect(b.revisions).toHaveLength(12);const id=b.revisions[0].id;b.title='changed'; b.appearance.margin=30;const restored=restoreRevision(b,id);expect(restored.title).toBe('24');expect(restored.appearance.margin).toBe(30);expect(restored.revisions).toHaveLength(12)});
 it('reorders without losing items and provides valid blank documents',()=>{expect(reorder(['a','b','c'],1,-1)).toEqual(['b','a','c']);expect(reorder(['a'],0,-1)).toEqual(['a']);expect(emptyDoc().root.children).toHaveLength(1)})
});
