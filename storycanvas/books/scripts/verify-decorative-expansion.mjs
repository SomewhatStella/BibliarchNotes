import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { chromium } from 'playwright';
import { XMLValidator } from 'fast-xml-parser';
const sourcePath = 'src/fine-line-decorative-expansion.ts';
assert.ok(fs.existsSync(sourcePath), 'Decorative expansion module must exist');
const js = ts.transpileModule(fs.readFileSync(sourcePath,'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {DECORATIVE_EXPANSION:items} = await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
assert.equal(items.length,31);
assert.equal(new Set(items.map(x=>x.id)).size,31);
assert.equal(new Set(items.map(x=>x.name)).size,31);
assert.equal(new Set(items.map(x=>x.svg)).size,31);
assert.equal(items.filter(x=>x.category==='Celestial').length,9);
for(const x of items){
 assert.deepEqual(Object.keys(x).sort(),['category','id','license','name','source','svg']);
 assert.match(x.id,/^bibliarch-decx-/); assert.equal(x.license,'CC0-1.0');
 assert.match(x.source,/AI-assisted.*not sourced/);
 assert.ok(['Celestial','Book ornaments','Corners','Frames','Winter'].includes(x.category));
 assert.equal(XMLValidator.validate(x.svg),true,x.id+' valid XML');
 assert.match(x.svg,/stroke-width="0.8"/); assert.match(x.svg,/stroke="#555"/); assert.match(x.svg,/fill="none"/);
 assert.ok(!/<(?:script|image|foreignObject)\b/.test(x.svg));
}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1104,height:660},deviceScaleFactor:2});
 await page.setContent(items.map(x=>x.svg).join(''));
 const bounds=await page.evaluate(()=>[...document.querySelectorAll('svg')].map(s=>{const b=s.getBBox(),v=s.viewBox.baseVal;return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,w:v.width,h:v.height,area:b.width*b.height};}));
 bounds.forEach((b,i)=>{assert.ok(b.area>20,items[i].id+' visible');assert.ok(b.x>=1&&b.y>=1&&b.right<=b.w-1&&b.bottom<=b.h-1,items[i].id+' inset render bounds '+JSON.stringify(b));});
 const out='artifacts/fine-line-decorative';fs.mkdirSync(out,{recursive:true});
 for(const [index,group] of [items.slice(0,16),items.slice(16)].entries()){
 const html=`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#f3f1ed;color:#454545;font:12px Arial}h1{font-size:18px;font-weight:400;margin:0 0 14px}.grid{display:grid;grid-template-columns:repeat(4,254px);gap:12px}.card{height:130px;background:#fff;border:1px solid #ddd;padding:8px 12px}.art{height:88px;display:flex;align-items:center;justify-content:center}.art svg{max-width:216px;max-height:82px;width:100%;height:100%}.label{font-size:11px;line-height:16px;white-space:nowrap}.number{color:#999;margin-right:6px}</style><h1>Bibliarch · Fine-line decorative expansion · ${index+1}/2</h1><div class="grid">${group.map((x,i)=>`<div class="card"><div class="art">${x.svg}</div><div class="label"><span class="number">${index*16+i+1}.</span>${x.name}</div></div>`).join('')}</div>`;
 fs.writeFileSync(path.join(out,`contact-sheet-${index+1}.html`),html);
 await page.setContent(html);await page.screenshot({path:path.join(out,`contact-sheet-${index+1}.png`),fullPage:true});
 }
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({count:items.length,xml:'pass',unique:'pass',bounds:'pass',renderer:'Playwright Chromium',cards:[16,15],bounds},null,2));
 console.log('PASS: 31 unique ornaments; XML, metadata, thin strokes, Chromium geometry bounds; two rendered contact sheets (16/15).');
}finally{await browser.close();}
