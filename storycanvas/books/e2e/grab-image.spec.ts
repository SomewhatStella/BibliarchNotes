import {test,expect} from '@playwright/test';
test('grab artwork, resize corners and persist framing without sliders',async({page},testInfo)=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=400;const x=c.getContext('2d')!;x.fillStyle='orange';x.fillRect(0,0,400,400);x.fillStyle='blue';x.fillRect(400,0,400,400);return c.toDataURL().split(',')[1];});
 const art=page.locator('.template-color-art');await art.getByLabel('Upload illustration file').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await art.getByRole('button',{name:'Select illustration',exact:true}).click();
 const crop=art.locator('.inline-crop');await expect(crop).toBeVisible();await expect(crop.locator('input[type=range]')).toHaveCount(0);
 const frame=crop.getByLabel('Move image within crop');const img=crop.getByAltText('Crop preview');await expect(img).toHaveJSProperty('complete',true);
 const before=await img.getAttribute('style');const b=(await frame.boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+40,b.y+b.height/2,{steps:8});await page.mouse.up();expect(await img.getAttribute('style')).not.toBe(before);
 const moved=await img.getAttribute('style');const h=(await crop.getByLabel('Resize crop selection',{exact:true}).boundingBox())!;
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+45,h.y+h.height/2+45,{steps:8});await page.mouse.up();expect(await img.getAttribute('style')).not.toBe(moved);
 await page.screenshot({path:testInfo.outputPath('grab-resized.png')});await crop.getByRole('button',{name:'Done',exact:true}).click();await expect(crop).toHaveCount(0);
 const image=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-books-v1')!).books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.template==='color-art').image);
 const saved=await image();expect(saved.crop.x).toBeGreaterThan(0);expect(saved.crop.width).toBeLessThan(1);expect(saved.originalSrc).not.toBe(saved.src);
 await page.reload();expect(await image()).toEqual(saved);await page.screenshot({path:testInfo.outputPath('grab-reloaded.png')});
});
