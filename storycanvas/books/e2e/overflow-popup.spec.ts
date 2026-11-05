import {test,expect} from '@playwright/test';
test('selected overflow corners work at zoom; popup crop preserves placement',async({page},info)=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=400;const x=c.getContext('2d')!;x.fillStyle='#eeaa44';x.fillRect(0,0,800,400);x.fillStyle='#225599';x.fillRect(400,0,400,400);return c.toDataURL().split(',')[1];});
 const art=page.locator('.template-color-art');await art.getByLabel('Upload illustration file').setInputFiles({name:'picture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.getByLabel('Zoom',{exact:true}).selectOption('75');
 const img=art.locator('.illustration-art img');await img.scrollIntoViewIfNeeded();const b=(await img.boundingBox())!,src=await img.getAttribute('src');
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+65,b.y+b.height/2+25,{steps:8});await page.mouse.up();
 await expect(art.locator('.illustration-ghost')).toBeVisible();expect(await img.getAttribute('src')).toBe(src);
 const canvas=(await art.getByLabel('Illustration canvas').boundingBox())!,h=art.getByLabel('Resize image top right',{exact:true}),hb=(await h.boundingBox())!;expect(hb.x).toBeGreaterThan(canvas.x+canvas.width);
 expect(await h.evaluate(el=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===el;})).toBe(true);
 const before=(await img.boundingBox())!;await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(hb.x-25,hb.y+15,{steps:8});await page.mouse.up();expect((await img.boundingBox())!.width).toBeLessThan(before.width);
 await page.screenshot({path:info.outputPath('selected-overflow-75.png')});
 const image=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-books-v1')!).books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.template==='color-art').image);
 const placement=(await image()).placement;await art.getByRole('button',{name:'Crop',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Crop illustration',exact:true});await expect(dialog).toBeVisible();const frame=dialog.getByLabel('Move crop selection');const f=(await frame.boundingBox())!;await page.mouse.move(f.x+f.width/2,f.y+f.height/2);await page.mouse.down();await page.mouse.move(f.x+f.width/2+10,f.y+f.height/2+10,{steps:4});await page.mouse.up();await dialog.getByRole('button',{name:'Cancel crop',exact:true}).click();expect((await image()).placement).toEqual(placement);
 await art.getByRole('button',{name:'Crop',exact:true}).click();await dialog.getByRole('button',{name:'Apply crop',exact:true}).click();await expect(dialog).toHaveCount(0);expect((await image()).placement).toEqual(placement);expect((await image()).originalSrc).toBe(src);
 await page.emulateMedia({media:'print'});await expect(art.locator('.illustration-ghost')).toBeHidden();await expect(h).toBeHidden();await page.emulateMedia({media:'screen'});
 await page.keyboard.press('Escape');await expect(art.locator('.illustration-ghost')).toHaveCount(0);await expect(h).toHaveCount(0);
});
