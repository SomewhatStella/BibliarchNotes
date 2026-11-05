import {test,expect,type Page} from '@playwright/test';
async function setup(page:Page){
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 // Playwright's fresh context only: never connect to a user's browser/profile.
 await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible();
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('bibliarch-books',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('library','readwrite'),store=tx.objectStore('library'),req=store.get('bibliarch-books-v1');req.onsuccess=()=>{const l=JSON.parse(req.result.raw);const s=l.books.flatMap((b:any)=>b.chapters.flatMap((c:any)=>c.scenes)).find((s:any)=>s.template==='color-art');s.overlay={text:'Stable words',x:25,y:35,size:32,color:'#222222',background:'solid',backgroundColor:'#f0d9b5',backgroundWidth:300,backgroundHeight:180};store.put({raw:JSON.stringify(l),revision:crypto.randomUUID()},'bibliarch-books-v1');};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};};}));
 await page.reload();await page.getByRole('textbox',{name:'Book title',exact:true}).waitFor();
 const art=page.locator('.template-color-art');await art.scrollIntoViewIfNeeded();return art;
}
async function dragAt(page:Page,x:number,y:number,dx:number,dy:number){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:8});await page.mouse.up();}
test('Background is a compact single-click toggle with keyboard access',async({page},info)=>{
 const art=await setup(page),toggle=art.getByRole('button',{name:'Select text background',exact:true});
 await art.getByRole('textbox',{name:'Illustration text'}).click();
 const box=await toggle.boundingBox();expect(box!.height).toBeLessThanOrEqual(30);expect(box!.width).toBeLessThanOrEqual(115);
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:info.outputPath('background-active.png'),fullPage:true});
 await art.screenshot({path:info.outputPath('background-detail.png')});
 await toggle.click();await expect(toggle).toHaveAttribute('aria-pressed','false');
 await toggle.focus();await page.keyboard.press('Space');await expect(toggle).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');await expect(toggle).toHaveCount(0);
});
test('background interior including text drags only background and keeps mode selected',async({page},info)=>{
 const art=await setup(page),toggle=art.getByRole('button',{name:'Select text background',exact:true}),text=art.getByRole('textbox',{name:'Illustration text'}),bg=art.locator('.overlay-background');
 // Select artwork itself with double click, independently of the toggle behavior.
 const original=(await bg.boundingBox())!;await page.mouse.click(original.x+30,original.y+30);
 await expect(toggle).toHaveAttribute('aria-pressed','true');const fixed=await text.boundingBox();
 await dragAt(page,original.x+30,original.y+30,24,18);
 let moved=(await bg.boundingBox())!;expect(moved.x-original.x).toBeCloseTo(24,0);expect(moved.y-original.y).toBeCloseTo(18,0);
 await expect(toggle).toHaveAttribute('aria-pressed','true');expect(await text.boundingBox()).toEqual(fixed);
 await dragAt(page,fixed!.x+fixed!.width/2,fixed!.y+fixed!.height/2,20,12);
 const overText=(await bg.boundingBox())!;expect(overText.x-moved.x).toBeCloseTo(20,0);expect(overText.y-moved.y).toBeCloseTo(12,0);expect(await text.boundingBox()).toEqual(fixed);await expect(text).toHaveText('Stable words');
 await page.screenshot({path:info.outputPath('background-interior.png'),fullPage:true});
 await toggle.click();await text.click();await text.fill('Still editable');await expect(text).toHaveText('Still editable');const saved=(await bg.boundingBox())!;
 await page.reload();await page.getByRole('textbox',{name:'Book title',exact:true}).waitFor();expect((await bg.boundingBox())!.x).toBeCloseTo(saved.x,0);
});
