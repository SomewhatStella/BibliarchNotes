// Real StoryBoard and child components; backend replacements exist only in this bundle.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir='tests/artifacts/board-theme';mkdirSync(dir,{recursive:true});
const storeMock=`import {create} from ${JSON.stringify(path.resolve('node_modules/zustand/index.js'))};
const nodes=[{id:'text',type:'text',title:'Story notes',text:'The journey begins here.',x:80,y:90,width:300,height:180},{id:'custom',type:'folder',text:'Authored coral accent',color:'#e56b52',x:430,y:90,width:300,height:139},{id:'table',type:'table',x:80,y:330,width:400,height:200,columns:['Scene','Status'],rows:[{'Scene':'Arrival','Status':'Draft'}]}];
window.paletteWrites=0;
export const useCanvasStore=create((set,get)=>({canvases:{main:{canvas_type:'main',nodes,connections:[]}},saveStatus:{},loading:false,loadStory:async()=>{},flushAll:async()=>{},getAllCharacters:()=>[],setPalette:()=>{window.paletteWrites++},ensureCanvas:()=>{},updateNode:()=>{}}));window.testStore=useCanvasStore;`;
const mocks={
 '@/lib/store':storeMock,
 'next/navigation':'export const useRouter=()=>({push:()=>{}});',
 '@/lib/storage':'export const getImageUrl=()=>null; export const uploadNodeImage=async()=>null;',
 '@/lib/supabase/client':'export const createClient=()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({data:{username:"Tester"}})})})})});',
 '@/lib/collaboration':'export const getStoryAccess=async()=>({isOwner:true,role:"owner"}); export const MAX_COLLABORATORS=5; export const getCollaborators=async()=>[]; export const getShareTokens=async()=>[]; export const searchUsers=async()=>[]; export const inviteUser=async()=>{}; export const removeCollaborator=async()=>{}; export const updateCollaboratorRole=async()=>{}; export const leaveCollaboration=async()=>{}; export const createShareToken=async()=>{}; export const deleteShareToken=async()=>{};',
 '@/lib/realtime':'export const useRealtimeCanvas=()=>({broadcastChange:()=>{},broadcastNodeLock:()=>{},broadcastNodeUnlock:()=>{}});export const useStoryCoordination=()=>{};export const usePresence=()=>({presenceState:{}});',
 '@/lib/migrate-images':'export const migrateLegacyImages=()=>{};',
};
await build({entryPoints:['tests/board-insertion-fixture.tsx'],bundle:true,outfile:`${dir}/fixture.js`,jsx:'automatic',alias:{'@':'./src'},plugins:[{name:'offline',setup(b){b.onResolve({filter:/.*/},args=>mocks[args.path]?{path:args.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js',resolveDir:process.cwd()}));}}]});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/app/globals.css','-o',`${dir}/fixture.css`],{stdio:'pipe'});
const bootstrap=readFileSync('src/components/ThemeToggle.tsx','utf8').match(/export const THEME_BOOTSTRAP = `([^`]+)`/)[1].replace('${THEME_STORAGE_KEY}','bibliarch.ui.theme.v1');
const server=createServer((req,res)=>{
 res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':req.url.endsWith('.css')?'text/css':'text/html');
 const files={'/fixture.js':`${dir}/fixture.js`,'/fixture.css':`${dir}/fixture.css`,'/site-theme.css':'src/app/site-theme.css','/board-theme.css':'src/app/board-theme.css'};
 res.end(files[req.url]?readFileSync(files[req.url]):`<!doctype html><html><head><script>${bootstrap}</script><link rel="stylesheet" href="/fixture.css"><link rel="stylesheet" href="/site-theme.css"><link rel="stylesheet" href="/board-theme.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try {
 browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1280,height:800},colorScheme:'light'});
 const origin=`http://127.0.0.1:${server.address().port}`;
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.evaluate(()=>localStorage.setItem('bibliarch.ui.theme.v1','dark'));await page.reload();
 const theme=()=>page.locator('html').getAttribute('data-ui-theme');
 const bg=sel=>page.locator(sel).first().evaluate(el=>getComputedStyle(el).backgroundColor);
 const waitTheme=async value=>{await page.waitForFunction(v=>document.documentElement.dataset.uiTheme===v,value);};
 await page.locator('[data-node-id="text"]').waitFor();
 assert.equal(await theme(),'dark');assert.equal(await bg('.canvas-ground'),'rgb(19, 27, 41)');
 assert.equal(await bg('[data-node-id="text"]'),'rgb(37, 50, 71)');
 assert.match(await bg('.board-toolbar'),/28, 38, 54/);
 const notes=page.getByRole('link',{name:'Notes',exact:true});assert.equal(await notes.getAttribute('href'),'/notes/dashboard');
 assert.equal(await page.getByRole('link',{name:'Books',exact:true}).getAttribute('href'),'/books');
 const before=await page.evaluate(()=>JSON.stringify(window.testStore.getState().canvases));
 const accent=()=>bg('[data-node-id="custom"] .h-\\[3px\\]');assert.equal(await accent(),'rgb(229, 107, 82)');
 await notes.hover();assert.notEqual(await notes.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 await page.screenshot({animations:'disabled',path:`${dir}/dark.png`});
 await page.getByTitle('Canvas settings',{exact:true}).click();
 assert.equal(await bg('.pop-in'),'rgb(37, 50, 71)');
 await page.screenshot({animations:'disabled',path:`${dir}/dark-settings.png`});
 await page.keyboard.press('Escape');
 // Close modal using its own close control if Escape is not implemented.
 if(await page.locator('.pop-in').count()) await page.locator('.pop-in button').first().click();
 for (const [title,shot] of [['Color palette','palette'],['Send feedback','feedback'],['Share','share']]) {
  await page.getByTitle(title,{exact:true}).click();
  await page.locator('.pop-in').waitFor();
  assert.equal(await bg('.pop-in'),'rgb(37, 50, 71)');
  await page.screenshot({animations:'disabled',path:`${dir}/dark-${shot}.png`});
  await page.locator('.pop-in button').first().click();
 }
 await page.getByRole('button',{name:'Custom folder types',exact:true}).click();
 assert.equal(await bg('[role="dialog"]'),'rgb(28, 38, 54)');
 await page.screenshot({animations:'disabled',path:`${dir}/dark-custom-types.png`});await page.keyboard.press('Escape');
 const toggle=page.getByRole('button',{name:'Toggle color theme'});
 await toggle.click();await waitTheme('light');assert.equal(await bg('.canvas-ground'),'rgb(245, 246, 249)');
 assert.equal(await accent(),'rgb(229, 107, 82)');
 assert.equal(await page.evaluate(()=>localStorage.getItem('bibliarch.ui.theme.v1')),'light');
 await page.screenshot({animations:'disabled',path:`${dir}/light.png`});
 await page.reload();await page.locator('[data-node-id="text"]').waitFor();assert.equal(await theme(),'light');
 const other=await context.newPage();await other.goto(origin);await other.getByRole('button',{name:'Toggle color theme'}).click();await waitTheme('dark');
 assert.equal(await bg('.canvas-ground'),'rgb(19, 27, 41)');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.testStore.getState().canvases)),before);
 // Legacy authored palette: display normalization must not save or replace its colors.
 await page.evaluate(()=>window.testStore.setState(s=>({canvases:{main:{...s.canvases.main,palette:{id:'legacy',main:'#c13f77',complementary:'#15304a',accent:'#e2f1df'}}}})));
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.canvas-ground')).backgroundColor==='rgb(226, 241, 223)');
 const customBefore=await page.evaluate(()=>JSON.stringify(window.testStore.getState().canvases));
 await page.getByRole('button',{name:'Toggle color theme'}).click();await waitTheme('light');
 assert.equal(await bg('.canvas-ground'),'rgb(226, 241, 223)');
 await page.getByRole('button',{name:'Toggle color theme'}).click();await waitTheme('dark');
 assert.equal(await accent(),'rgb(229, 107, 82)');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.testStore.getState().canvases)),customBefore);
 assert.equal(await page.evaluate(()=>window.paletteWrites),0);
 await page.screenshot({animations:'disabled',path:`${dir}/dark-custom-palette.png`});
 await page.setViewportSize({width:390,height:844});await page.screenshot({animations:'disabled',path:`${dir}/dark-390.png`});
 assert.ok(await notes.isVisible());assert.ok(await toggle.isVisible());
 await page.evaluate(()=>window.testStore.setState({saveStatus:{main:'error'}}));
 await notes.click();await page.getByRole('alert').waitFor();assert.equal(page.url(),origin+'/');
 await page.evaluate(()=>window.testStore.setState({saveStatus:{main:'saved'}}));
 await Promise.all([page.waitForURL('**/notes/dashboard'),notes.click()]);
 assert.equal(new URL(page.url()).pathname,'/notes/dashboard');
 assert.deepEqual(errors,[]);
 console.log('PASS actual StoryBoard: stored dark bootstrap/reload, toggle, cross-tab, default canvas/cards/chrome/settings/hover, explicit Notes URL, custom/legacy colors unchanged, zero palette writes, mobile controls, no runtime errors.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
