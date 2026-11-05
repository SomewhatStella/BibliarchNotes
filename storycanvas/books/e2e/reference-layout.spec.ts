import {test,expect} from '@playwright/test';
test('readable outline and collapsed tool rail give the manuscript room; decorations drag onto paper',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await expect(page.getByLabel('Outline panel')).toBeVisible();
 for(const name of ['File','Edit','View','Insert','Format'])await expect(page.getByRole('navigation',{name:'Document menu'}).getByText(name,{exact:true})).toBeVisible();
 const rail=page.getByRole('tablist',{name:'Page editing',exact:true});await expect(rail).toBeVisible();
 expect((await page.getByLabel('Page tools',{exact:true}).boundingBox())!.width).toBeLessThan(80);
 const closed=(await page.locator('main.document-scroller').boundingBox())!.width;
 await page.getByRole('tab',{name:'Decorations',exact:true}).click();await expect(page.getByLabel('Ornament tray')).toBeVisible();
 expect((await page.locator('main.document-scroller').boundingBox())!.width).toBeLessThan(closed-150);
 const source=(await page.getByRole('button',{name:/Drag .* onto page/}).first().boundingBox())!;
 const paper=(await page.locator('.pagination-page').first().boundingBox())!;
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();await page.mouse.move(paper.x+paper.width/2,paper.y+180,{steps:12});await page.mouse.up();
 await expect(page.locator('[data-decal-id]')).toHaveCount(1);
 await page.getByRole('button',{name:'Close tool panel'}).click();await expect(page.getByLabel('Ornament tray')).toBeHidden();
 // Book-level settings live in the toolbar's Design button (the rail no longer duplicates them).
 await expect(page.getByRole('button',{name:/Design/})).toBeVisible();
});
