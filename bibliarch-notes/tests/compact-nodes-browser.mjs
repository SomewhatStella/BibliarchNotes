import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir='tests/artifacts/compact-nodes';mkdirSync(dir,{recursive:true});
await build({entryPoints:['tests/compact-nodes-fixture.tsx'],bundle:true,outfile:`${dir}/fixture.js`,jsx:'automatic',alias:{'@':'./src'},plugins:[{name:'offline',setup(b){b.onResolve({filter:/lib\/storage$/},()=>({path:'storage',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const getImageUrl=()=>null;',loader:'js'}));}}]});
execFileSync(process.execPath,['node_modules/tailwindcss/lib/cli.js','-i','src/app/globals.css','-o',`${dir}/fixture.css`],{stdio:'pipe'});
const server=createServer((req,res)=>{const file=['/fixture.js','/fixture.css'].includes(req.url)?req.url:null;res.setHeader('Content-Type',file?.endsWith('js')?'text/javascript':file?'text/css':'text/html');res.end(file?readFileSync(dir+file):'<link rel="stylesheet" href="/fixture.css"><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try {
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:820,height:650}});
 await page.route('**/*',r=>new URL(r.request().url()).origin===`http://127.0.0.1:${server.address().port}`?r.continue():r.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('[data-node-id="0"]').waitFor();
 const before=await page.evaluate(()=>window.compactState.nodes);
 await page.screenshot({path:`${dir}/cards.png`});
 for(const n of before){
  const card=page.locator(`[data-node-id="${n.id}"]`),box=await card.boundingBox(),button=card.getByRole('button',{name:`Open ${n.text}`,exact:true}),b=await button.boundingBox();
  assert.equal(box.width,n.width,`${n.text}: saved width`);assert.equal(box.height,n.height,`${n.text}: saved height (no footer enlargement)`);
  assert.ok(b.x>=box.x+box.width-90,`${n.text}: Open belongs on right, not in footer`);
  assert.ok(Math.abs(b.y+b.height/2-(box.y+box.height/2))<=3,`${n.text}: vertically centered Open`);
  const text=await card.getByText(n.text,{exact:true}).boundingBox();assert.ok(text.x+text.width<=b.x,`${n.text}: text does not overlap Open`);
  await button.click();
 }
 const after=await page.evaluate(()=>window.compactState);
 assert.deepEqual(after.nodes,before,'opening preserves all saved data');assert.equal(after.writes,0);assert.equal(after.moves,0);assert.deepEqual(after.opened,before.map(n=>n.id));
 assert.deepEqual(after.defaults.character,{w:320,h:72});assert.deepEqual(after.defaults.location,{w:320,h:72});assert.deepEqual(after.defaults.folder,{w:300,h:139});
 assert.equal(await page.locator('[data-node-id="0"]').evaluate(el=>getComputedStyle(el).cursor),'default','nodes use the native arrow');
 assert.equal(await page.locator('[data-node-id="0"] button').evaluate(el=>getComputedStyle(el).cursor),'pointer','buttons use the native pointer');
 const label=page.locator('[data-node-id="0"]').getByText('Character',{exact:true});
 const lb=await label.boundingBox();
 await page.evaluate(()=>window.getSelection().removeAllRanges());
 await page.mouse.move(lb.x+2,lb.y+lb.height/2);await page.mouse.down();await page.mouse.move(lb.x+70,lb.y+lb.height/2,{steps:12});await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.getSelection().toString()),'','dragging a label must not select text');
 assert.ok(await page.evaluate(()=>window.compactState.moves)>0,'drag callback still runs');
 await label.dblclick();
 const input=page.locator('[data-node-id="0"] input');await input.waitFor();await input.fill('Editable character');await input.press('Control+a');
 assert.equal(await input.evaluate(el=>el.value.substring(el.selectionStart,el.selectionEnd)),'Editable character','editing still permits selection');
 await input.press('Enter');
 console.log('PASS drag selection suppressed and editing preserved');
 console.log('PASS compact and custom saved dimensions, right-side Open geometry, all navigation clicks, unchanged node data and restored defaults');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
