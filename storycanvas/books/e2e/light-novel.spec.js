import {test,expect} from '@playwright/test';
test('light novel theme preserves writing and pictures while setting compact paginated typography',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 const prose=page.locator('.pagination-body > p').first();await prose.click();await page.keyboard.insertText('The quiet room held its breath as the visitor opened the door. '.repeat(120));
 await expect(page.locator('.save')).toHaveText('Saved on this device');
 await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Book themes',exact:true}).click();
 await page.getByRole('button',{name:'Select Japanese light novel theme',exact:true}).click();await page.getByRole('button',{name:'Use this theme',exact:true}).click();
 await expect(prose).toHaveCSS('font-family','Arial');await expect(prose).toHaveCSS('font-size','13px');await expect(prose).toHaveCSS('line-height','18.85px');await expect(prose).toHaveCSS('margin-bottom','0px');await expect(prose).toHaveCSS('text-align','justify');await expect(prose).toHaveCSS('text-indent','13px');
 const next=page.locator('.pagination-page').nth(1).locator('.pagination-body > p').first();await expect(next).toHaveCSS('text-indent','0px');
 await expect(page.locator('[data-page-furniture="top"]')).toHaveCount(0);await expect(page.locator('.scene-divider')).toHaveCount(0);
 await expect(page.locator('.pagination-page').first().locator('.page-footer')).toHaveText('1');
 await expect(page.locator('.save')).toHaveText('Saved on this device');await page.reload();await expect(prose).toContainText('The quiet room');await expect(prose).toHaveCSS('text-indent','13px');
 await prose.scrollIntoViewIfNeeded();await page.screenshot({path:'test-results-light-novel/editor.png',fullPage:true});
});
