import {it,expect} from 'vitest';
import {chromium} from 'playwright';
import {buildPrintHtml,type PublishBook} from '../src/publishing';
import {seed,parseLibrary} from '../src/model';
it('round trips signed artwork through the real library parser',()=>{const l=seed(),s=l.books[0].chapters[0].scenes[0];s.decals=[{id:'bleed',src:'builtin:stars',alt:'Stars',x:-20,y:105,width:80,rotation:15,opacity:.7}];s.overlay={text:'Bleed',x:110,y:-10,size:32,color:'#222222'};const saved=parseLibrary(JSON.stringify(l)).books[0].chapters[0].scenes[0];expect(saved.decals).toEqual(s.decals);expect(saved.overlay).toEqual(s.overlay);});
it('print clips off-page ornaments and text even without an uploaded illustration',async()=>{
 const book:PublishBook={title:'Bleed',format:{widthMm:137,heightMm:219,marginMm:10},sections:[{id:'a',kind:'color-art',title:'Art',content:null,decals:[{id:'bleed',src:'builtin:stars',alt:'Stars',x:-20,y:95,width:80,rotation:15,opacity:1}],overlay:{text:'Bleed',x:95,y:95,size:32,color:'#222222'}}]};
 const browser=await chromium.launch();try{const page=await browser.newPage();await page.setContent(buildPrintHtml(book));const metrics=await page.locator('.art').evaluate(e=>({overflow:getComputedStyle(e).overflow,height:e.getBoundingClientRect().height}));expect(metrics.overflow).toBe('clip');expect(metrics.height).toBeGreaterThan(700);expect(await page.locator('.artwork-overflow-ghost').count()).toBe(0);}finally{await browser.close();}
});
