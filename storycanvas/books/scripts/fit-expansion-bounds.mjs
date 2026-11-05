import fs from 'node:fs';import ts from 'typescript';import {chromium} from 'playwright';
const b=await chromium.launch();const p=await b.newPage();
for(const [name,key] of [['botanical','BOTANICAL_EXPANSION'],['decorative','DECORATIVE_EXPANSION']]){
 const file=`src/fine-line-${name}-expansion.ts`;const src=fs.readFileSync(file,'utf8');const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.ES2022}}).outputText;const items=(await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64')))[key];
 for(const item of items){const change=await p.evaluate(svg=>{document.body.innerHTML=svg;const e=document.querySelector('svg'),r=e.getBBox(),v=e.viewBox.baseVal;if(r.x>=3&&r.y>=3&&r.x+r.width<=v.width-3&&r.y+r.height<=v.height-3)return null;const k=Math.min(1,(v.width-10)/r.width,(v.height-10)/r.height);return {k,tx:(v.width-r.width*k)/2-r.x*k,ty:(v.height-r.height*k)/2-r.y*k};},item.svg);if(change){item.svg=item.svg.replace(/(<svg[^>]*>)(.*)<\/svg>/s,`$1<g transform="translate(${change.tx} ${change.ty}) scale(${change.k})">$2</g></svg>`);console.log('Inset',item.name);}}
 fs.writeFileSync(file,'// Custom AI-assisted vector compositions, not sourced. CC0-1.0.\nexport const '+key+' = '+JSON.stringify(items,null,2)+';\n');
}await b.close();
