// Exact upstream paths/transforms; only select complete divider components and crop viewBox.
const fs=require('fs');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage();const originals=JSON.parse(fs.readFileSync('assets/sourced-ornaments/prepared.json','utf8'));const result=[];
for(let i=0;i<7;i++){
 const source=originals[Math.min(i,4)];await page.setContent(source.svg);
 const svg=await page.evaluate(({i})=>{const root=document.querySelector('svg');if(i>=4){const layer=root.querySelector('g');const keep=i===4?[15]:i===5?[10,11,12,13,14]:[0,1,2,3,4,5,6,7,8,9];[...layer.children].forEach((el,n)=>{if(!keep.includes(n))el.remove()});}
 const b=root.getBBox();const pad=Math.max(b.width,b.height)*.005;root.setAttribute('viewBox',`${b.x-pad} ${b.y-pad} ${b.width+pad*2} ${b.height+pad*2}`);return root.outerHTML;},{i});
 const names=['Vintage calligraphic border','Vintage calligraphic portrait frame','Vintage calligraphic open frame','Delicate floral corner','Underline flourish — thread','Underline flourish — scroll','Underline flourish — elaborate'];
 const ids=['vintage-border','vintage-portrait-frame','vintage-open-frame','floral-corner','underline-thread','underline-scroll','underline-elaborate'];
 const {svg:unused,...provenance}=source;
 result.push({...provenance,id:'sourced-'+ids[i],name:names[i],category:i<3?'Frames':i===3?'Corners':'Book ornaments',svg,modifications:'Allowlisted SVG; monochrome presentation attributes; tight viewBox with 0.5% padding; original paths and transforms unchanged.'+(i>=4?' Selected complete components of one original stacked divider.':'')});
}
fs.writeFileSync('src/sourced-ornaments.json',JSON.stringify(result,null,2));
fs.mkdirSync('assets/sourced-ornaments/sanitized',{recursive:true});for(const d of result)fs.writeFileSync(`assets/sourced-ornaments/sanitized/${d.id}.svg`,d.svg);
fs.writeFileSync('assets/sourced-ornaments/provenance.json',JSON.stringify(result.map(({svg,...p})=>p),null,2));
const html='<html><head><meta charset="utf-8"><style>body{font:16px Georgia;background:#fbf7ef;color:#352e29;padding:24px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}article{background:white;border:1px solid #ddd;padding:18px;text-align:center}img{width:100%;height:220px;object-fit:contain}h1{font-size:24px}</style></head><body><h1>Seven approved sourced fine-line ornaments</h1><main>'+result.map(d=>`<article><img src="data:image/svg+xml;base64,${Buffer.from(d.svg).toString('base64')}"><p>${d.name}</p><small>${d.category} · ${d.author}</small></article>`).join('')+'</main></body></html>';
fs.writeFileSync('artifacts/approved-sourced-contact-sheet.html',html);await page.setViewportSize({width:1250,height:1050});await page.setContent(html);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.screenshot({path:'artifacts/approved-sourced-contact-sheet.png',fullPage:true});await browser.close();console.log('Created seven cropped entries and contact sheet');})();
