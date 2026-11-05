import {test,expect} from '@playwright/test';
test('simple illustration editing with pointer gestures survives reload',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Decorations',exact:true})).toBeVisible();await expect(page.getByLabel('Ornament tray')).toBeHidden();
 const art=page.locator('.template-color-art');await art.scrollIntoViewIfNeeded();
 const src=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,200,300);x.fillStyle='blue';x.fillRect(200,0,200,300);return c.toDataURL();});
 const chooser=page.waitForEvent('filechooser');await art.getByRole('button',{name:'Upload illustration',exact:true}).click();await(await chooser).setFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from(src.split(',')[1],'base64')});
 await art.locator('.illustration-art').dblclick();const frame=page.getByLabel('Move crop selection');await expect(frame).toBeVisible();
 async function drag(el:any,dx:number,dy:number){const b=(await el.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2+dy,{steps:8});await page.mouse.up();}
 await drag(frame,10,10);await drag(page.getByLabel('Resize crop selection'),-35,-25);await page.getByRole('button',{name:'Apply crop',exact:true}).click();await expect(art.locator('.illustration-art img')).not.toHaveAttribute('src',src);
 await art.getByRole('button',{name:'Text',exact:true}).click();const text=art.getByRole('textbox',{name:'Illustration text'});await text.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('My story');await drag(art.getByLabel('Move text'),30,25);await expect(text).toHaveText('My story');
 await page.getByRole('tab',{name:'Decorations',exact:true}).click();const item=page.getByRole('button',{name:'Drag Willow whisper onto page'});const a=(await item.boundingBox())!,b=(await art.locator('.pagination-page').boundingBox())!;await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.4,{steps:12});await page.mouse.up();await expect(art.locator('[data-decal-id]')).toHaveCount(1);
 await page.reload();await page.getByRole('button',{name:'Open Japanese light novel',exact:true}).click();await expect(page.locator('.template-color-art').getByRole('textbox',{name:'Illustration text'})).toHaveText('My story');await expect(page.locator('.template-color-art [data-decal-id]')).toHaveCount(1);
});
