import React from 'react';
import {it,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {renderToStaticMarkup} from 'react-dom/server';
import Chooser from '../src/DecalReplacementChooser';
import sourced from '../src/sourced-ornaments.json';
import {decalSource} from '../src/design';
import {buildPrintHtml} from '../src/publishing';
it('bundles only approved exact source bytes and passive individually cropped geometry',()=>{
 expect(sourced.map(d=>d.id)).toEqual(['sourced-vintage-border','sourced-vintage-portrait-frame','sourced-vintage-open-frame','sourced-floral-corner','sourced-underline-thread','sourced-underline-scroll','sourced-underline-elaborate']);
 for(const d of sourced){const file=d.source.split('/').pop()!;expect(createHash('sha256').update(readFileSync('assets/sourced-ornaments/originals/'+file)).digest('hex')).toBe(d.sha256);expect(d.source).toContain('e9da54c346f38ad9b67e43efb688beb783d106f8');expect(d.svg).not.toMatch(/<(?:script|image|use|metadata|defs|foreignObject)|\bstyle=|href=|url\(|\bon\w+=/i);const recolored=atob(decalSource('builtin:'+d.id,'#715394').split(',')[1]);expect(recolored).toContain('#715394');expect(recolored).not.toContain('#555555');}
 expect(new Set(sourced.map(d=>d.svg)).size).toBe(7);
});
it('decodes every new recolored ornament offline in print/PDF and captures actual replacement picker',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.route('**/*',r=>r.abort());
 const decals=sourced.map((d,i)=>({id:'approved-'+i,src:'builtin:'+d.id,alt:d.name,x:5,y:i*12,width:30,rotation:0,opacity:1,color:'#715394'}));
 await page.setContent(buildPrintHtml({title:'Approved ornaments',format:{widthMm:148,heightMm:210,marginMm:15},sections:[{id:'s',title:'Chapter',kind:'chapter-title',content:null,decals}]} as any));
 await page.locator('img.decal').evaluateAll(imgs=>Promise.all(imgs.map(i=>(i as HTMLImageElement).decode())));expect(await page.locator('img.decal').count()).toBe(7);const pdf=await page.pdf();expect(pdf.subarray(0,5).toString()).toBe('%PDF-');writeFileSync('artifacts/approved-sourced-export.pdf',pdf);
 const html=renderToStaticMarkup(<Chooser scenes={[]} decal={decals[0]} onReplace={()=>{}} onClose={()=>{}}/>);await page.setContent('<style>body{font:15px Georgia;background:#f7f3eb}.decal-replacement-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}button{background:white;padding:12px;border:1px solid #ddd}img{width:170px;height:90px;object-fit:contain}span{display:block}</style>'+html);await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>(i as HTMLImageElement).decode())));expect(await page.locator('.decal-replacement-grid button').count()).toBe(93);await page.screenshot({path:'artifacts/approved-sourced-picker.png',fullPage:true});
 }finally{await browser.close();}
},30000);
