import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {BooksCloudClient} from '../src/cloud';
afterEach(()=>vi.unstubAllGlobals());
it('accepts immediate signup session like Notes',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({access_token:'a',refresh_token:'r',expires_in:3600,user:{id:'u'}}))));const c=new BooksCloudClient('https://test.supabase.co','public');await c.signUp('a@b.c','password');expect(c.session?.user.id).toBe('u');});
it('rejects a missing save commit receipt',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}')));const c=new BooksCloudClient('https://test.supabase.co','public');c.session={access_token:'a',expires_at:Date.now()/1000+3600,user:{id:'u'}};await expect(c.saveProject('p',1,{})).rejects.toThrow(/receipt/i);});
it('mounts primary cloud saving and removes the browser-only notice',()=>{const studio=readFileSync('app/BooksStudio.tsx','utf8'),home=readFileSync('src/LibraryHome.tsx','utf8');expect(studio).toContain('<CloudPanel');expect(studio).toContain('status={cloudStatus}');expect(home).not.toContain('Your books are saved in this browser.');});
