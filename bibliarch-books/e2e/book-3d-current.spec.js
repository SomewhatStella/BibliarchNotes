import {test,expect} from '@playwright/test';
test('3D book opens, rotates, changes binding, shows covers, and returns to writing',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await page.getByLabel('View',{exact:true}).selectOption('3d');
 const model=page.locator('.book-model');await expect(model).toBeVisible();
 await page.getByLabel('Binding',{exact:true}).selectOption('hardcover');await expect(model).toHaveAttribute('data-binding','hardcover');
 await page.getByRole('button',{name:'Show back',exact:true}).click();await expect(model).toHaveAttribute('data-rotation','180');
 await page.getByRole('button',{name:'Show front',exact:true}).click();await expect(model).toHaveAttribute('data-rotation','0');
 const stage=await page.locator('.book-stage').boundingBox();await page.mouse.move(stage.x+stage.width/2,stage.y+150);await page.mouse.down();await page.mouse.move(stage.x+stage.width/2+100,stage.y+180,{steps:12});await page.mouse.up();await expect(model).not.toHaveAttribute('data-rotation','0');
 await page.screenshot({path:'test-results-selection/book-3d.png'});
 await page.getByLabel('View',{exact:true}).selectOption('write');await expect(page.getByRole('textbox',{name:'Manuscript',exact:true})).toBeVisible();
});
