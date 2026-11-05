import {test,expect} from '@playwright/test';
test('artwork upload, overlay and right tools persist',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 await expect(page.locator('.outline')).not.toContainText('Bookmarks');await expect(page.locator('.outline')).not.toContainText('Outline tools');
 const art=page.locator('.template-color-art');await expect(art.getByRole('textbox')).toHaveCount(0);
 await expect(art.getByRole('button',{name:'Upload illustration',exact:true})).toBeVisible();
 await art.getByLabel('Upload illustration file').setInputFiles({name:'art.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1l8AAAAASUVORK5CYII=','base64')});
 await art.getByRole('button',{name:'Edit illustration and effects'}).click();
 await page.getByRole('button',{name:'Add text overlay',exact:true}).click();await page.getByRole('textbox',{name:'Overlay text',exact:true}).fill('Dream here');
 await page.keyboard.press('Escape');await expect(art.locator('.artwork-overlay')).toHaveText('Dream here');
 await page.reload();await page.getByRole('button',{name:/Open/}).first().click();await expect(page.locator('.template-color-art .artwork-overlay')).toHaveText('Dream here');
});
