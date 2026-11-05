import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('section action row sits below paper without losing content',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const paper=page.locator('.paper').first();const row=page.locator('.section-controls').first();
 const p=await paper.boundingBox(),r=await row.boundingBox();expect(r!.y).toBeGreaterThanOrEqual(p!.y+p!.height);
 await expect(paper.locator('.section-controls')).toHaveCount(0);
 await expect(page.locator('.pagination-page').first()).not.toHaveText('');
});
test('visual crop applies and canvas PNG has book dimensions',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const art=page.locator('.template-color-art');
 await art.getByLabel('Upload illustration file').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1l8AAAAASUVORK5CYII=','base64')});
 await art.getByRole('button',{name:'Edit illustration and effects'}).click();
 await page.getByRole('button',{name:'Crop illustration',exact:true}).click();
 await expect(page.getByRole('img',{name:'Crop preview'})).toBeVisible();
 await page.getByRole('button',{name:'Apply crop',exact:true}).click();
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download illustration canvas',exact:true}).click();const download=await downloadEvent;
 const bytes=await readFile((await download.path())!);expect(bytes.subarray(1,4).toString()).toBe('PNG');
 const dims=download.suggestedFilename().match(/(\d+)x(\d+)px/)!;expect(bytes.readUInt32BE(16)).toBe(+dims[1]);expect(bytes.readUInt32BE(20)).toBe(+dims[2]);
 const decoded=await page.evaluate(async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const c=document.createElement('canvas');c.width=1;c.height=1;const ctx=c.getContext('2d')!;ctx.drawImage(image,0,0);return {width:image.naturalWidth,height:image.naturalHeight,alpha:ctx.getImageData(0,0,1,1).data[3]};},bytes.toString('base64'));expect(decoded).toEqual({width:+dims[1],height:+dims[2],alpha:0});
 const mm=download.suggestedFilename().match(/([\d.]+)x([\d.]+)mm/)!;expect(+dims[1]).toBe(Math.round(+mm[1]/25.4*300));expect(+dims[2]).toBe(Math.round(+mm[2]/25.4*300));
 await page.keyboard.press('Escape');await expect(art.locator('.illustration-art img')).toHaveCSS('object-position','50% 50%');await expect(art.locator('.illustration-art img')).toHaveCSS('object-fit','contain');
 await page.reload();await page.getByRole('button',{name:/Open/}).first().click();await expect(page.locator('.template-color-art .illustration-art img')).toHaveCSS('object-position','50% 50%');
});
