// Offline production-CSS regression. Run after building both apps; no server restart.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
function load(file) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,React,require:name => name==='react'?React:name==='next/navigation'?{usePathname:()=>'/books'}:load(path.resolve(path.dirname(file),name+'.tsx'))});
 return exports;
}
function css(dir) {return fs.readdirSync(dir,{recursive:true}).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('\n');}
(async()=>{
 const browser=await chromium.launch();
 try {
 const page=await browser.newPage();
 const out=path.join(root,'test-results/site-navigation');fs.mkdirSync(out,{recursive:true});
 for(const width of [390,700,701,1440]) for(const theme of ['light','dark']) {
  const results=[];
  for(const zone of ['books','notes']) {
   const base=zone==='books'?path.resolve(root,'../bibliarch-books'):root;
   const Component=load(path.join(base,zone==='books'?'src/SiteNavigation.tsx':'src/components/OverviewNavigation.tsx')).default;
   const markup=renderToStaticMarkup(React.createElement(Component));
   await page.setViewportSize({width,height:300});
   await page.setContent(`<html data-ui-theme="${theme}"><head><style>${css(path.join(base,'.next/static'))}</style></head><body><div class="${zone==='books'?'site-shell':'notes-overview-shell'}">${markup}</div></body></html>`);
   results.push(await page.evaluate(()=>['.site-navigation','.site-wordmark','.site-wordmark svg','.site-navigation nav','.ui-theme-toggle'].map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {selector:s,x:r.x,y:r.y,width:r.width,height:r.height,color:c.color,background:c.backgroundColor,font:c.font};})));
   await page.screenshot({path:path.join(out,`${zone}-${width}-${theme}.png`)});
  }
  for(let i=0;i<results[0].length;i++) {
   const a=results[0][i],b=results[1][i];
   for(const key of ['x','y','width','height']) assert.ok(Math.abs(a[key]-b[key])<1,`${width}/${theme} ${a.selector} ${key}: Books=${a[key]}, Notes=${b[key]}`);
   for(const key of ['color','background','font']) assert.equal(a[key],b[key],`${width}/${theme} ${a.selector} ${key}`);
  }
 }
 console.log('PASS: production CSS navigation geometry, typography, and colors match at 390/700/701/1440px in light/dark. Screenshots: '+out);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
