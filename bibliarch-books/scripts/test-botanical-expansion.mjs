import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {chromium} from 'playwright';
const source='src/fine-line-botanical-expansion.ts';
assert.ok(fs.existsSync(source),'Botanical expansion implementation must exist');
const code=ts.transpileModule(fs.readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;
const {BOTANICAL_EXPANSION:items}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(items.length,31);
assert.equal(new Set(items.map(x=>x.id)).size,31);
assert.equal(new Set(items.map(x=>x.svg)).size,31);
assert.deepEqual(Object.fromEntries(['Botanical','Corners','Frames','Book ornaments'].map(c=>[c,items.filter(x=>x.category===c).length])),{'Botanical':12,'Corners':8,'Frames':6,'Book ornaments':5});
for(const x of items){assert.match(x.id,/^bibliarch-botx-/);assert.equal(x.source,'Custom AI-assisted Bibliarch vector composition (not sourced)');assert.equal(x.license,'CC0-1.0');}
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1100,height:760},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.setContent('<main></main>');
const results=await page.evaluate(items=>items.map(x=>{const doc=new DOMParser().parseFromString(x.svg,'image/svg+xml');if(doc.querySelector('parsererror'))return {id:x.id,error:'XML'};const svg=document.importNode(doc.documentElement,true);document.body.append(svg);const allowed=['svg','g','path','circle','ellipse','metadata'];for(const el of svg.querySelectorAll('*')){if(!allowed.includes(el.tagName))return {id:x.id,error:'unsafe element'};for(const a of el.attributes)if(/^on/i.test(a.name)||/href/i.test(a.name))return {id:x.id,error:'unsafe attribute'};}const b=svg.getBBox(),v=svg.viewBox.baseVal;const shapes=[...svg.querySelectorAll('path,circle,ellipse')];const valid=shapes.length>0&&shapes.every(p=>p.getTotalLength()>0&&Number.isFinite(p.getTotalLength()));const bounded=b.x>=1&&b.y>=1&&b.x+b.width<=v.width-1&&b.y+b.height<=v.height-1;const style=svg.getAttribute('stroke')==='#555'&&svg.getAttribute('stroke-width')==='0.8'&&svg.getAttribute('fill')==='none';svg.remove();return {id:x.id,valid,bounded,style,bounds:[b.x,b.y,b.width,b.height]};}),items);
for(const r of results){assert.ok(!r.error,JSON.stringify(r));assert.ok(r.valid&&r.bounded&&r.style,JSON.stringify(r));}
assert.deepEqual(errors,[]);
fs.mkdirSync('artifacts/fine-line-botanical',{recursive:true});
fs.writeFileSync('artifacts/fine-line-botanical/validation.json',JSON.stringify(results,null,2));
for(let sheet=0;sheet<2;sheet++){const subset=items.slice(sheet*16,sheet===0?16:31);await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:22px;background:#f7f5f0;color:#555;font:12px Georgia}h1{font-size:19px;font-weight:400;margin:0 0 16px}main{display:grid;grid-template-columns:repeat(4,250px);gap:12px}article{height:166px;background:#fff;border:1px solid #e6e2d9;padding:8px}svg{display:block;width:232px;height:130px}p{margin:3px 0;text-align:center;font-size:11px}</style><h1>Bibliarch · botanical hairlines · ${sheet+1}/2</h1><main>${subset.map((x,i)=>`<article>${x.svg}<p>${sheet*16+i+1}. ${x.name}</p></article>`).join('')}</main>`);await page.screenshot({path:`artifacts/fine-line-botanical/contact-sheet-${sheet+1}.png`,fullPage:true});}
await browser.close();console.log('PASS: 31 distinct compositions; XML, safety, geometry, bounds, metadata, category counts; two PNG contact sheets.');
