import {test,expect} from '@playwright/test';
const key='bibliarch-books-v1';
async function open(page:any){await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();}
test('top menus are exclusive and dismiss outside or with Escape',async({page})=>{
 await open(page); const nav=page.getByRole('navigation',{name:'Document menu'});
 await nav.locator('summary').filter({hasText:/^File$/}).click();
 await nav.locator('summary').filter({hasText:/^Edit$/}).click();
 await expect(nav.locator('details[open]')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(nav.locator('details[open]')).toHaveCount(0);
 await nav.locator('summary').filter({hasText:/^File$/}).click();await page.getByLabel('Book title',{exact:true}).click();await expect(nav.locator('details[open]')).toHaveCount(0);
});
test('theme selection requires Apply and persists appearance without altering manuscript',async({page})=>{
 await open(page);const before=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
 const paper=page.locator('.paper').first(); const oldSize=await paper.boundingBox();
 await page.getByRole('navigation',{name:'Document menu'}).getByText('Format',{exact:true}).click();await page.getByRole('button',{name:'Book themes',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Book themes',exact:true});
 await dialog.getByRole('button',{name:'Select Poetry collection theme',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Select Poetry collection theme',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).books.at(-1).appearance.preset,key)).toBe('B6');
 await dialog.getByRole('button',{name:'Use this theme',exact:true}).click();await expect(dialog).toBeHidden();
 await expect(page.getByRole('status')).toContainText('Poetry collection applied');
 const after=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),key);
 expect(after.books.at(-1).chapters).toEqual(before.books.at(-1).chapters);expect(after.books.at(-1).appearance.preset).toBe('A4');
 expect((await paper.boundingBox())!.width).toBeGreaterThan(oldSize!.width);
 await page.reload();await page.getByRole('button',{name:'Open Japanese light novel',exact:true}).click();
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).books.at(-1).appearance.preset,key)).toBe('A4');
});
test('review shows one focused panel and invalid backup leaves data untouched',async({page})=>{
 await open(page); const nav=page.getByRole('navigation',{name:'Document menu'});
 await nav.locator('summary').filter({hasText:/^Review$/}).click();await page.getByRole('button',{name:'Comments, changes and snapshots'}).click();
 const dialog=page.getByRole('dialog',{name:'Review & references'});await expect(dialog.getByRole('tab',{name:'Comments',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(dialog.getByRole('button',{name:'Add comment',exact:true})).toBeVisible();await expect(dialog.getByRole('button',{name:'Save snapshot',exact:true})).toBeHidden();
 await page.keyboard.press('Escape');await nav.locator('summary').filter({hasText:/^File$/}).click();
 await expect(page.getByRole('button',{name:'Open backup…',exact:true})).toBeVisible();
 const before=await page.evaluate(k=>localStorage.getItem(k),key);
 await page.getByLabel('Import JSON backup',{exact:true}).setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});
 await expect(page.locator('.error[role="alert"]')).toBeVisible();expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBe(before);
});
