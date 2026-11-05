import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {BooksCloudClient} from '../src/cloud';
const session=(id:string)=>({access_token:`token-${id}`,expires_at:Date.now()/1000+3600,user:{id}});
afterEach(()=>vi.unstubAllGlobals());
it('uses the shared Notes session rather than a separate Books login',async()=>{
 const fetcher=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response('[]'));vi.stubGlobal('fetch',fetcher);
 const storage={setItem:vi.fn(),getItem:vi.fn(),removeItem:vi.fn()};vi.stubGlobal('localStorage',storage);
 const c=new BooksCloudClient('https://test.supabase.co','public',{ownerId:'alice',sessionProvider:async()=>session('alice')});
 await c.listProjects();expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-alice');expect(storage.setItem).not.toHaveBeenCalled();
});
it('blocks writes after a switch even between blob upload and metadata commit',async()=>{
 let user='alice';const fetcher=vi.fn(async()=>{user='bob';return new Response('{}');});vi.stubGlobal('fetch',fetcher);
 const c=new BooksCloudClient('https://test.supabase.co','public',{ownerId:'alice',sessionProvider:async()=>session(user)});
 await expect(c.createProject('Private draft',{secret:'alice'})).rejects.toThrow(/account|session/i);
 expect(fetcher).toHaveBeenCalledTimes(1);
});
it('never falls back to a legacy session when Notes is logged out',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const c=new BooksCloudClient('https://test.supabase.co','public',{ownerId:'alice',sessionProvider:async()=>null});c.session=session('alice');
 await expect(c.listProjects()).rejects.toThrow(/account|session/i);expect(fetcher).not.toHaveBeenCalled();
});
it('gates the studio and removes the independent account flow',()=>{
 const page=readFileSync('app/books/page.tsx','utf8'),studio=readFileSync('app/BooksStudio.tsx','utf8');
 expect(page).toContain('SharedAccount');expect(studio).not.toContain('Account &amp; saving');expect(studio).not.toContain('<summary role="button">Help</summary>');
 expect(studio).toContain('<BugReport');
});
