import {chromium} from 'playwright';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 for(const [width,columns] of [[1440,6],[1100,6],[900,3],[760,2],[390,2]]){
  await page.setViewportSize({width,height:950});
  await page.goto('http://127.0.0.1:3210/books');
  await page.locator('.book-preset').first().waitFor();
  if(process.env.INJECT_CSS)await page.addStyleTag({content:readFileSync('app/library.css','utf8')});
  const boxes=await page.locator('.preset-stage').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,scroll:e.scrollWidth,client:e.clientWidth}}));
  assert.equal(boxes.length,6);
  assert.equal(boxes.filter(b=>Math.abs(b.y-boxes[0].y)<1).length,columns);
  for(const b of boxes){assert.ok(b.x>=0&&b.x+b.w<=width,'card within viewport');assert.ok(b.scroll<=b.client+1,'preview fits card');assert.ok(Math.abs(b.h-boxes[0].h)<1);}
  const heading=await page.locator('.start-section h1').boundingBox();
  const desc=await page.getByText('Begin with a blank page or make a template your own.',{exact:true}).boundingBox();
  assert.ok(Math.abs(heading.x-desc.x)<1);assert.ok(desc.y>=heading.y+heading.height);
  if(width===1440){mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/library-alignment.png'});}
 }
 console.log('PASS balanced 6/3/2-column rows, matching preview heights, contained cards and left-aligned heading/description at five viewport sizes');
}finally{await browser.close();}
