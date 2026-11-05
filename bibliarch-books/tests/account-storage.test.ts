import {it,expect,vi,afterEach} from 'vitest';
import {createLibraryStore} from '../src/library-storage';
import {KEY,seed} from '../src/model';
afterEach(()=>vi.unstubAllGlobals());
it('does not expose the unowned device library to a signed-in account',async()=>{
 const legacy=seed();legacy.books[0].title='Private old draft';
 const getItem=vi.fn((key:string)=>key===KEY?JSON.stringify(legacy):null);
 vi.stubGlobal('localStorage',{getItem});vi.stubGlobal('indexedDB',{open:()=>{throw Error('unavailable');}});
 const result=await createLibraryStore('bob').load();
 expect(result.library.books.some(b=>b.title==='Private old draft')).toBe(false);
 expect(getItem).not.toHaveBeenCalledWith(KEY);
});
it('uses separate durable databases for different accounts',async()=>{
 const names:string[]=[];vi.stubGlobal('indexedDB',{open:(name:string)=>{names.push(name);throw Error('unavailable');}});vi.stubGlobal('localStorage',{getItem:()=>null});
 await createLibraryStore('alice').load();await createLibraryStore('bob').load();expect(names[0]).not.toBe(names[1]);
});
