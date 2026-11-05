import {test,expect} from '@playwright/test';
test('visual crop applies a draggable selection and preserves original on reload',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const src=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,200,300);x.fillStyle='blue';x.fillRect(200,0,200,300);return c.toDataURL();});
 const art=page.locator('.template-color-art');await art.getByLabel('Upload illustration file').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from(src.split(',')[1],'base64')});
 await art.getByRole('button',{name:'Edit illustration and effects'}).click();await page.getByRole('button',{name:'Crop illustration',exact:true}).click();
 const frame=page.getByLabel('Move crop selection');const b=(await frame.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+20,b.y+b.height/2+10,{steps:5});await page.mouse.up();
 await page.getByRole('button',{name:'Apply crop',exact:true}).click();await page.keyboard.press('Escape');
 await expect(art.locator('.illustration-art img')).not.toHaveAttribute('src',src);
 await page.reload();await page.getByRole('button',{name:/Open/}).first().click();await page.locator('.template-color-art').getByRole('button',{name:'Edit illustration and effects'}).click();await page.getByRole('button',{name:'Crop illustration',exact:true}).click();await page.getByRole('button',{name:'Reset to whole image',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('.template-color-art .illustration-art img')).toHaveAttribute('src',src);
});
test('right tray pointer drop and direct move persist',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const item=page.getByRole('button',{name:'Drag Willow whisper onto page'});const p=page.locator('.pagination-page').first();await p.scrollIntoViewIfNeeded();const a=(await item.boundingBox())!,b=(await p.boundingBox())!;
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.4,{steps:12});await page.mouse.up();
 const decal=p.locator('[data-decal-id]').last();await expect(decal).toBeVisible();const d=(await decal.boundingBox())!;await page.mouse.move(d.x+d.width/2,d.y+d.height/2);await page.mouse.down();await page.mouse.move(d.x+d.width/2+30,d.y+d.height/2+20,{steps:5});await page.mouse.up();const left=await decal.evaluate(e=>(e as HTMLElement).style.left);
 await page.reload();await page.getByRole('button',{name:/Open/}).first().click();expect(await page.locator('.pagination-page').first().locator('[data-decal-id]').last().evaluate(e=>(e as HTMLElement).style.left)).toBe(left);
});
