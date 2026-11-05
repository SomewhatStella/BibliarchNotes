import {test,expect} from '@playwright/test';
test('crop is on the page, cancel preserves data and Done keeps original',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const art=page.locator('.template-color-art');await art.getByLabel('Upload illustration file').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1l8AAAAASUVORK5CYII=','base64')});
 await art.getByRole('button',{name:'Select illustration',exact:true}).dblclick();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(art.getByRole('button',{name:'Done',exact:true})).toBeVisible();
 const before=await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'));await art.getByRole('button',{name:'Cancel',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'))).toBe(before);
 await art.getByRole('button',{name:'Select illustration',exact:true}).dblclick();const handle=(await art.getByLabel('Resize crop selection',{exact:true}).boundingBox())!;await page.mouse.move(handle.x+10,handle.y+10);await page.mouse.down();await page.mouse.move(handle.x+80,handle.y+80,{steps:8});await page.mouse.up();const frame=art.getByLabel('Move image within crop');await frame.focus();await page.keyboard.press('ArrowLeft');const rect=(await frame.boundingBox())!;await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2-15,rect.y+rect.height/2+10,{steps:5});await page.mouse.up();await art.getByRole('button',{name:'Done',exact:true}).click();await expect(art.locator('.inline-crop')).toHaveCount(0);
 const image=await page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-books-v1')!).books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.template==='color-art').image);expect(image.originalSrc).toContain('data:image/png');expect(image.crop.width).toBeLessThan(1);expect(image.crop.x).toBeGreaterThan(0);
 await page.getByLabel('View',{exact:true}).selectOption('facing');await expect(page.locator('.book-preview img').first()).toHaveAttribute('src',image.src);

});
test('physical previews use actual pages and leave saved manuscript unchanged',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const titles=await page.locator('.pages .pagination-page').allTextContents();
 const saved=await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'));
 await page.getByLabel('View', {exact:true}).selectOption('facing');await expect(page.locator('.book-preview .preview-page')).toHaveCount(titles.length);
 await page.getByLabel('View', {exact:true}).selectOption('covers');await expect(page.locator('.book-preview .preview-page')).toHaveCount(2);await expect(page.locator('.book-preview .preview-page').first()).toContainText(titles[0].trim());
 await page.getByLabel('View', {exact:true}).selectOption('3d');await expect(page.locator('.book-front-face')).toContainText('Japanese light novel');await page.getByLabel('Binding').selectOption('hardcover');await expect(page.locator('.book-model')).toHaveAttribute('data-binding','hardcover');await page.getByRole('button',{name:'Show back',exact:true}).click();await expect(page.locator('.book-model')).toHaveAttribute('data-rotation','180');
 await page.getByLabel('View', {exact:true}).selectOption('write');await expect(page.locator('.pages')).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('bibliarch-books-v1'))).toBe(saved);
});
