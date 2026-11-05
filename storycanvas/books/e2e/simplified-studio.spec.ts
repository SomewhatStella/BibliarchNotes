import {test,expect} from '@playwright/test';
const key='bibliarch-books-v1';
const active=(page:any)=>page.evaluate((k:string)=>{const l=JSON.parse(localStorage.getItem(k)!);return l.books.find((b:any)=>b.id===l.activeBook)},key);
test('Japanese light novel is a real blank B6 preset',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 const b=await active(page);expect(b.appearance.preset).toBe('B6');expect(b.appearance.bodyFont).not.toBe(b.appearance.headingFont);
 expect(b.chapters.flatMap((c:any)=>c.scenes.map((s:any)=>s.template))).toEqual(['book-front','color-art','chapter-title','prose']);
 await expect(page.getByRole('textbox',{name:'Manuscript'}).first().locator('p')).toHaveText('');
});
test('menus open focused dialogs and theme keeps manuscript',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await page.getByRole('textbox',{name:'Manuscript'}).fill('My original words');
 await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Book themes',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Book themes'});await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Select Japanese light novel theme',exact:true}).click();
 await dialog.getByRole('button',{name:'Use this theme',exact:true}).click();
 expect((await active(page)).appearance.preset).toBe('B6');
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
 await expect(page.getByRole('textbox',{name:'Manuscript'})).toContainText('My original words');
 await expect(page.getByTitle('Move chapter up')).not.toBeVisible();
});
test('near-section gallery and deletion protect text and last section',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await expect(page.getByRole('button',{name:'Delete section',exact:true})).toBeDisabled();
 await page.getByRole('textbox',{name:'Manuscript'}).fill('Keep me');
 await page.getByRole('button',{name:'Add section after this',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Add as new page',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Manuscript'})).toHaveCount(2);
 await page.getByRole('button',{name:'Page actions'}).first().click();await page.getByRole('button',{name:'Delete section',exact:true}).first().click();await page.locator('.ask-dialog').getByRole('button',{name:'Cancel'}).click();
 await expect(page.getByRole('textbox',{name:'Manuscript'}).first()).toContainText('Keep me');
 await page.getByRole('button',{name:'Page actions'}).first().click();await page.getByRole('button',{name:'Delete section',exact:true}).first().click();await page.locator('.ask-dialog').getByRole('button',{name:'Delete page'}).click();
 await expect(page.getByRole('textbox',{name:'Manuscript'})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Delete section',exact:true})).toBeDisabled();
});
