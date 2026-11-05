import {test,expect} from '@playwright/test';
test('only selected artwork has chrome; blank canvas, workspace and Escape clear selection',async({page},info)=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('bibliarch-books',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('library','readwrite'),store=tx.objectStore('library'),req=store.get('bibliarch-books-v1');req.onsuccess=()=>{const l=JSON.parse(req.result.raw);const s=l.books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.template==='color-art');s.overlay={text:'The Apple!!',x:25,y:35,size:32,color:'#222222',background:'solid',backgroundWidth:300,backgroundHeight:180};s.decals=[{id:'chrome-stars',src:'builtin:stars',alt:'Stars',x:60,y:70,width:20,rotation:0,opacity:1}];store.put({raw:JSON.stringify(l),revision:crypto.randomUUID()},'bibliarch-books-v1');};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 await page.reload();await page.getByRole('textbox',{name:'Book title',exact:true}).waitFor();
 const art=page.locator('.template-color-art'),canvas=art.locator('.illustration-page'),text=art.getByRole('textbox',{name:'Illustration text'}),grip=art.getByLabel('Move text',{exact:true}),toggle=art.getByLabel('Select text background',{exact:true});await canvas.scrollIntoViewIfNeeded();
 const clean=async()=>{await expect(grip).toHaveCount(0);await expect(toggle).toHaveCount(0);await expect(text).toHaveCSS('outline-style','none');await expect(art.locator('.background-bounds')).toHaveCount(0);};
 await clean();await art.screenshot({path:info.outputPath('unselected.png')});
 await text.click();await expect(text).toBeFocused();await expect(grip).toBeVisible();await expect(toggle).toBeVisible();await expect(text).toHaveCSS('outline-style','dashed');await art.screenshot({path:info.outputPath('selected.png')});
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Escape');await clean();
 await text.click();await canvas.click({position:{x:8,y:8}});await clean();
 await text.click();await art.locator('[data-decal-id="chrome-stars"]').click();await clean();await expect(page.locator('.decal-selection')).toBeVisible();
 await text.click();await expect(page.locator('.decal-selection')).toHaveCount(0);await page.getByRole('textbox',{name:'Book title',exact:true}).click();await clean();
});
