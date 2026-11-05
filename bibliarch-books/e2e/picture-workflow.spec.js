import {test,expect} from '@playwright/test';
test('reusable picture library preserves writing, moves, resizes, wraps and reloads',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 const prose=page.locator('.pagination-body > p').first();await prose.click();await page.keyboard.insertText('Keep my writing safe. '.repeat(35));
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=120;c.height=80;const x=c.getContext('2d');x.fillStyle='#e7a325';x.fillRect(0,0,120,80);return c.toDataURL().split(',')[1];});
 const count=await page.locator('.paper').count();
 const chooser=page.waitForEvent('filechooser');await page.locator('.format-row').getByRole('button',{name:'Add picture',exact:true}).click();await (await chooser).setFiles({name:'sun.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 const thumb=page.getByRole('button',{name:'Drag sun.png onto page',exact:true});await expect(thumb).toBeVisible();await expect(page.locator('.paper')).toHaveCount(count);
 const paper=page.locator('.pagination-page').first();await paper.scrollIntoViewIfNeeded();let r=await paper.boundingBox(),t=await thumb.boundingBox();await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width*.2,r.y+r.height*.2,{steps:10});await page.mouse.up();
 const art=page.locator('[data-placed-image]');await expect(art).toHaveCount(1);await expect(prose).toContainText('Keep my writing safe.');
 let b=await art.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+30,b.y+b.height/2+20,{steps:8});await page.mouse.up();await expect.poll(async()=>(await art.boundingBox())?.x??-1).toBeGreaterThan(b.x+10);
 const handle=page.getByRole('button',{name:'Resize picture bottom-right',exact:true});b=await handle.boundingBox();const before=await art.boundingBox();await page.mouse.move(b.x+7,b.y+7);await page.mouse.down();await page.mouse.move(b.x-25,b.y-20,{steps:8});await page.mouse.up();await expect.poll(async()=>(await art.boundingBox())?.width??Infinity).toBeLessThan(before.width);
 await page.getByRole('combobox',{name:'Picture text flow'}).selectOption('wrap');await expect.poll(()=>art.evaluate(el=>el.parentElement?getComputedStyle(el.parentElement).float:'')).toBe('left');
 await page.screenshot({path:'test-results-picture/library-wrap.png'});
 await expect(page.locator('.save')).toHaveText('Saved on this device');await page.reload();await expect(art).toHaveCount(1);await page.getByRole('tab',{name:'Image',exact:true}).click();await expect(thumb).toBeVisible();await expect(prose).toContainText('Keep my writing safe.');
 await art.click();await page.getByRole('button',{name:'Remove from page',exact:true}).click();await expect(art).toHaveCount(0);await expect(thumb).toBeVisible();await expect(prose).toContainText('Keep my writing safe.');
});
