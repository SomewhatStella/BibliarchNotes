import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir='tests/artifacts/board-insertion';mkdirSync(dir,{recursive:true});
const storeMock=`import {create} from ${JSON.stringify(path.resolve('node_modules/zustand/index.js'))};
const nodes=[{id:'distant',type:'folder',text:'Far away',x:60,y:5900,width:300,height:139}];
export const useCanvasStore=create((set,get)=>({canvases:{main:{canvas_type:'main',nodes,connections:[]}},saveStatus:{},loading:false,loadStory:async()=>{},flushAll:async()=>{},getAllCharacters:()=>[],setPalette:()=>{},ensureCanvas:(key)=>{if(!get().canvases[key])set(s=>({canvases:{...s.canvases,[key]:{canvas_type:key,nodes:[],connections:[]}}}))},addNode:(key,node)=>set(s=>({canvases:{...s.canvases,[key]:{...s.canvases[key],nodes:[...s.canvases[key].nodes,node]}}})),updateNode:(key,id,patch)=>set(s=>({canvases:{...s.canvases,[key]:{...s.canvases[key],nodes:s.canvases[key].nodes.map(n=>n.id===id?{...n,...patch}:n)}}})),addConnection:()=>{}}));window.testStore=useCanvasStore;`;
const mocks={
 '@/lib/store':storeMock,
 'next/navigation':'export const useRouter=()=>({push:()=>{}});',
 '@/lib/storage':'export const getImageUrl=()=>null; export const uploadNodeImage=async()=>null;',
 '@/lib/supabase/client':'export const createClient=()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({data:{username:"Tester"}})})})})});',
 '@/lib/collaboration':'export const getStoryAccess=async()=>({isOwner:true,role:"owner"});',
 '@/lib/realtime':'export const useRealtimeCanvas=()=>({broadcastChange:()=>{},broadcastNodeLock:()=>{},broadcastNodeUnlock:()=>{}});export const useStoryCoordination=()=>{};export const usePresence=()=>({presenceState:{}});',
 '@/lib/migrate-images':'export const migrateLegacyImages=()=>{};',
 './ShareDialog':'export default ()=>null;', './FeedbackModal':'export default ()=>null;', './WorkspaceLinks':'export default ()=>null;',
};
await build({entryPoints:['tests/board-insertion-fixture.tsx'],bundle:true,outfile:`${dir}/fixture.js`,jsx:'automatic',alias:{'@':'./src'},plugins:[{name:'offline',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js',resolveDir:process.cwd()}));}}]});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/app/globals.css','-o',`${dir}/fixture.css`],{stdio:'pipe'});
const server=createServer((req,res)=>{const file=['/fixture.js','/fixture.css'].includes(req.url)?req.url:null;res.setHeader('Content-Type',file?.endsWith('js')?'text/javascript':file?'text/css':'text/html');res.end(file?readFileSync(dir+file):'<link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try {
 browser=await chromium.launch({args:['--enable-gpu']});const page=await browser.newPage({viewport:{width:1100,height:780}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===`http://127.0.0.1:${server.address().port}`?r.continue():r.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.getByRole('button',{name:'Text',exact:true}).click();
 const card=page.locator('[data-node-id]').filter({hasText:'Untitled'}).first();await card.waitFor();
 let box=await card.boundingBox();assert.ok(box.y>=0 && box.y<650,`new node must be onscreen, actual y=${box.y}`);
 const viewport=page.locator('.overflow-auto').filter({has:page.locator('[data-canvas-ground]')}).first();
 await viewport.evaluate(el=>{el.scrollLeft=800;el.scrollTop=900;});await page.waitForTimeout(80);
 await page.getByRole('button',{name:'Character',exact:true}).click();
 box=await page.locator('[data-node-id]').filter({hasText:'New character'}).boundingBox();assert.ok(box.x>=56 && box.x<1000 && box.y>=0 && box.y<650,'insert after pan must be onscreen');
 const v=await viewport.boundingBox();const before=await page.locator('[data-canvas-ground]').boundingBox();
 await viewport.screenshot({path:`${dir}/before-pan.png`});
 const nodesBefore=await page.evaluate(()=>window.testStore.getState().canvases.main.nodes);
 await viewport.evaluate(el=>{el.scrollLeft+=7;el.scrollTop+=11;});await page.waitForTimeout(80);
 await viewport.screenshot({path:`${dir}/after-pan.png`});
 assert.deepEqual(await page.evaluate(()=>window.testStore.getState().canvases.main.nodes),nodesBefore,'camera pan must not mutate node positions');
 assert.equal(await viewport.evaluate(el=>getComputedStyle(el).backgroundAttachment),'local','dots anchored to scrolling canvas');
 await page.getByRole('button',{name:'+',exact:true}).click();await page.getByRole('button',{name:'Location',exact:true}).click();
 box=await page.locator('[data-node-id]').filter({hasText:'New place'}).boundingBox();assert.ok(box.y>=v.y && box.y<650 && box.x>=v.x && box.x<1000,'insert after zoom must be onscreen');
 await page.getByRole('button',{name:'Custom folder types',exact:true}).hover();
 await page.screenshot({path:`${dir}/tooltip.png`});
 await page.getByRole('button',{name:'Custom folder types',exact:true}).click();
 await page.screenshot({path:`${dir}/custom-menu.png`});
 await page.getByLabel('Type name',{exact:true}).fill('Custom collection');
 await page.getByLabel('Default interior').selectOption('empty');
 await page.getByRole('button',{name:'Save type',exact:true}).click();
 await page.getByRole('button',{name:'Create instance',exact:true}).click();
 const custom=page.locator('[data-node-id]').filter({hasText:'Custom collection'});
 assert.equal(await custom.locator('svg.lucide-folder-kanban').count(),1,'custom folder has distinct icon');
 box=await custom.boundingBox();assert.ok(box.x>=v.x && box.x<1000 && box.y>=v.y && box.y<650,'custom insertion visible');
 await page.screenshot({path:`${dir}/custom-node.png`});
 for (const name of ['Folder','List','Table','Event','Rel. map','Sticky','Image']) {
  const beforeCount=await page.locator('[data-node-id]').count();
  await page.getByRole('button',{name,exact:true}).click();
  assert.equal(await page.locator('[data-node-id]').count(),beforeCount+1,`${name} inserts`);
  const id=await page.evaluate(()=>window.testStore.getState().canvases.main.nodes.at(-1).id);
  const b=await page.locator(`[data-node-id="${id}"]`).boundingBox();
  assert.ok(b.x>=v.x && b.x<1000 && b.y>=v.y && b.y<650,`${name} stays in camera`);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS real StoryBoard insertion after distant content, pan and zoom; unchanged existing node coordinates; moving-dot CSS; no runtime errors (mocked persistence/auth).');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
