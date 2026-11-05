import {test,expect} from '@playwright/test';
test('modern catalog filters, decodes offline and excludes retired insertion collections',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Page styles and typography',exact:true}).click();
 const library=page.getByLabel('Curated decal library');await expect(library.getByRole('button')).toHaveCount(26);
 await library.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>(img as HTMLImageElement).decode()));});
 const options=await page.getByLabel('Decal category').locator('option').allTextContents();expect(options).not.toContain('Original');expect(options).not.toContain('Legacy');
 for(const [category,count] of [['Botanical',6],['Celestial',7],['Geometric',5],['Dividers & corners',8]] as const){await page.getByLabel('Decal category').selectOption(category);await expect(library.getByRole('button')).toHaveCount(count);}
 await library.getByRole('button',{name:'Insert Crescent moon divider decal',exact:true}).click();await expect(page.getByText('Ornament 1: Crescent moon divider',{exact:true})).toBeVisible();
 await page.getByLabel('Collection name').fill('Moon collection');await page.getByRole('button',{name:'Save ornament collection',exact:true}).click();
 await page.getByText('Modern ornament sources & license',{exact:true}).click();await expect(page.getByRole('link',{name:'MIT license',exact:true})).toHaveAttribute('href','/decals/modern/LICENSE.txt');
 await page.keyboard.press('Escape');await page.reload();const open=page.getByRole('button',{name:'Open Untitled book',exact:true});if(await open.isVisible())await open.click();await expect(page.locator('img.decal')).toHaveCount(1);
 await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Page styles and typography',exact:true}).click();await expect(page.getByRole('button',{name:'Add Moon collection to page'})).toBeVisible();
});
