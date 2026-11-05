import {test,expect} from '@playwright/test';
test('phone toolbar stays compact and all actions can be scrolled into view',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();const row=page.locator('.format-row');expect((await row.boundingBox()).height).toBeLessThanOrEqual(72);const advanced=row.getByRole('button',{name:'Book design',exact:true});await advanced.scrollIntoViewIfNeeded();await expect(advanced).toBeInViewport();await advanced.click();await expect(page.getByRole('dialog')).toBeVisible();
});
