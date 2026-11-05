import {test,expect} from '@playwright/test';
test('layer selection uses a single click and upper layer gestures never select the image',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 await page.evaluate(()=>{const l=JSON.parse(localStorage.getItem('bibliarch-books-v1')!);const s=l.books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.template==='color-art');s.image={src:document.createElement('canvas').toDataURL(),alt:'Test',fit:'cover'};s.decals=[{id:'selection-stars',src:'builtin:stars',alt:'Stars',x:50,y:60,width:20,rotation:0,opacity:1}];s.overlay={text:'Upper text',x:15,y:20,size:32,color:'#222222',background:'solid'};localStorage.setItem('bibliarch-books-v1',JSON.stringify(l));});
 await page.reload();await page.getByRole('button',{name:'Open Japanese light novel',exact:true}).or(page.getByRole('textbox',{name:'Book title',exact:true})).waitFor();if(await page.getByRole('button',{name:'Open Japanese light novel',exact:true}).isVisible())await page.getByRole('button',{name:'Open Japanese light novel',exact:true}).click();
 const art=page.locator('.template-color-art'),image=art.getByRole('button',{name:'Select illustration',exact:true}),text=art.getByRole('textbox',{name:'Illustration text'}),decal=art.locator('[data-decal-id="selection-stars"]'),bg=art.getByRole('button',{name:'Select text background',exact:true});
 await image.click({position:{x:20,y:100}});await expect(art.locator('.illustration-selection')).toBeVisible();
 await decal.click();await expect(page.locator('.decal-selection')).toBeVisible();await expect(art.locator('.illustration-selection')).toHaveCount(0);
 await image.click({position:{x:20,y:100}});await expect(art.locator('.illustration-selection')).toBeVisible();
 await text.click();await expect(text).toHaveAttribute('contenteditable','true');await expect(text).toBeFocused();await page.keyboard.press('End');await page.keyboard.type('!');await expect(text).toHaveText('Upper text!');await expect(art.locator('.illustration-selection')).toHaveCount(0);
 await page.screenshot({path:'test-results-selection/single-click-upper-layer.png'});
 await bg.click();await expect(bg).toHaveAttribute('aria-pressed','true');await art.getByLabel('Resize background right',{exact:true}).dblclick();await expect(art.locator('.illustration-selection')).toHaveCount(0);await expect(bg).toHaveAttribute('aria-pressed','true');
});
