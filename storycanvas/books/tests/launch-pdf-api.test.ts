import {it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({launch:vi.fn(),validate:vi.fn()}));
vi.mock('playwright',()=>({chromium:{launch:mocks.launch}}));
vi.mock('../src/publishing',()=>({MAX_PUBLISH_BYTES:12*1024*1024,assertPublishBook:mocks.validate,buildPrintHtml:()=>'<html></html>'}));
beforeEach(()=>{vi.resetModules();vi.resetAllMocks();});
const request=(origin?:string)=>new Request('https://books.example/api/pdf',{method:'POST',headers:origin?{Origin:origin}:{},body:JSON.stringify({format:{},sections:[]})});
it('rejects cross-origin rendering before launching Chromium',async()=>{const {POST}=await import('../app/api/pdf/route');const result=await POST(request('https://attacker.example'));expect(result.status).toBe(403);expect(mocks.launch).not.toHaveBeenCalled();});
it('does not leak internal errors for malformed input',async()=>{mocks.validate.mockImplementationOnce(()=>{throw Error('private filesystem path');});const {POST}=await import('../app/api/pdf/route');const result=await POST(request());expect(result.status).toBe(400);expect(await result.text()).not.toContain('private filesystem');});
it('releases the render lock even when browser cleanup rejects',async()=>{const page={setDefaultTimeout:vi.fn(),setContent:vi.fn(),emulateMedia:vi.fn(),evaluate:vi.fn(),pdf:vi.fn(async()=>new Uint8Array([1,2,3]))};mocks.launch.mockResolvedValue({newContext:async()=>({route:vi.fn(),newPage:async()=>page}),close:vi.fn(async()=>{throw Error('already disconnected');})});const {POST}=await import('../app/api/pdf/route');expect((await POST(request())).status).toBe(200);expect((await POST(request())).status).toBe(200);expect(mocks.launch).toHaveBeenCalledTimes(2);});
