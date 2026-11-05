import {it,expect,vi} from 'vitest';
import {LibraryStore,type DurableBackend} from '../src/library-storage';
import {seed,saveLibrary} from '../src/model';
const backend=():DurableBackend=>({read:async()=>null,write:async()=> 'revision'});
it('retries a failed load after storage access recovers',async()=>{let blocked=true;const s=new LibraryStore(backend(),{getItem:()=>{if(blocked)throw Error('blocked');return null;}});await expect(s.load()).rejects.toThrow('blocked');blocked=false;expect((await s.load()).library.books).toHaveLength(1);});
it('protects empty legacy data instead of silently seeding over it',async()=>{const write=vi.fn(async()=> 'revision');const s=new LibraryStore({...backend(),write},{getItem:()=>''});await expect(s.load()).rejects.toThrow();expect((await s.save(seed())).ok).toBe(false);expect(write).not.toHaveBeenCalled();});
it('can download legacy bytes while IndexedDB is unavailable',async()=>{const s=new LibraryStore({...backend(),read:async()=>{throw Error('unavailable');}},{getItem:()=>'{original bytes'});expect(await s.storedRaw()).toBe('{original bytes');});
it('never writes invalid libraries through the legacy save API',()=>{const setItem=vi.fn();const l=seed();l.activeScene='missing';expect(saveLibrary(l,{setItem}).ok).toBe(false);expect(setItem).not.toHaveBeenCalled();});
