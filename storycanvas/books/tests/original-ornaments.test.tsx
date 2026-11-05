import React from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import * as design from '../src/design';
import DesignTools from '../src/DesignTools';
import {createPresetBook} from '../src/templates';
import {chromium} from 'playwright';
import {buildPrintHtml} from '../src/publishing';
it('decodes every original offline in print',async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage();await page.route('**/*',r=>r.abort());
  const decals=design.ORIGINAL_ORNAMENTS.map((d,i)=>({id:'original-'+i,src:'builtin:'+d.id,alt:d.name,x:5,y:i*6,width:40,rotation:0,opacity:1}));
  await page.setContent(buildPrintHtml({title:'Originals',format:{widthMm:148,heightMm:210,marginMm:15},sections:[{id:'s',title:'Chapter',kind:'chapter-title',content:null,decals}]} as any));
  await page.locator('img.decal').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>(img as HTMLImageElement).decode()));});
  expect(await page.locator('img.decal').count()).toBe(12);
 }finally{await browser.close();}
},30000);
it('offers twelve original passive thin-line CC0 ornaments',()=>{
 const originals=(design as any).ORIGINAL_ORNAMENTS;
 expect(originals).toHaveLength(12);
 for(const d of originals){
  expect(d.id).toMatch(/^bibliarch-/);expect(d.license).toBe('CC0-1.0');
  expect(d.source).toContain('Original');
  const svg=atob(design.decalSource('builtin:'+d.id).split(',')[1]);
  expect(svg).toContain('CC0');expect(svg).toContain('stroke-width="0.8"');
  expect(svg).not.toMatch(/<script|<foreignObject|\son\w+=|href=|url\(/i);
 }
 expect(atob(design.decalSource('builtin:tabler-stars').split(',')[1])).toContain('MIT License');
});
it('shows fine-line compositions and honest credits, keeping chunky icons hidden',()=>{
 const html=renderToStaticMarkup(<DesignTools scene={{}} book={{}} onSceneChange={()=>{}} onBookChange={()=>{}}/>);
 expect(html).toContain('Fine-line');expect(html).toContain('CC0');
 expect(html).not.toContain('Insert Leaf decal');expect(html).toContain('Insert Starlit thread decal');
});
it('uses modern ornaments only on new preset title furniture, never prose',()=>{
 for(const preset of ['journal','poetry']){
  const scenes=createPresetBook(preset).chapters.flatMap(c=>c.scenes);
  const decorated=scenes.filter(s=>s.decals?.length);
  expect(decorated).toHaveLength(1);
  expect(decorated[0].decals![0].src).toMatch(/^builtin:bibliarch-/);
  expect(decorated[0].template).toBe('book-front');
  for(const scene of scenes.filter(s=>s.template==='prose'))expect(scene.decals||[]).toEqual([]);
 }
});
