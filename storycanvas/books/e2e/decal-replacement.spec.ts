import {test,expect} from '@playwright/test';

test('uploaded artwork remains available while trying builtins and printing hides chooser',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Page styles and typography',exact:true}).click();
 await page.getByLabel('Upload ornament (PNG, JPEG, WebP)').setInputFiles({name:'test-dot.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
 await expect(page.getByText('Ornament 1: test-dot.png',{exact:true})).toBeVisible();await page.keyboard.press('Escape');
 const decal=page.locator('[data-decal-id]');await decal.click();const original=await decal.getAttribute('src');
 await page.getByRole('button',{name:'Replace ornament',exact:true}).click();const chooser=page.getByRole('dialog',{name:'Replace ornament'});
 await chooser.getByRole('button',{name:/^Use /}).first().click();
 await chooser.getByLabel('Replacement collection').selectOption('Uploaded');await chooser.getByRole('button',{name:'Use test-dot.png',exact:true}).click();
 await expect(decal).toHaveCount(1);await expect(decal).toHaveAttribute('src',original!);
 await page.emulateMedia({media:'print'});await expect(chooser).toBeHidden();await page.emulateMedia({media:'screen'});
 await chooser.getByRole('button',{name:'Done'}).click();await expect(page.getByRole('button',{name:'Replace ornament',exact:true})).toBeFocused();
});

test('repeated replacement preserves identity, order and transforms through reload',async({page},info)=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 await page.getByRole('button',{name:'Format',exact:true}).click();await page.getByRole('button',{name:'Page styles and typography',exact:true}).click();
 const library=page.getByLabel('Curated decal library');
 await library.getByRole('button',{name:'Insert Crescent garland decal',exact:true}).click();
 await library.getByRole('button',{name:'Insert Crescent garland decal',exact:true}).click();
 const controls=page.locator('fieldset').filter({has:page.getByText('Ornament 1: Crescent garland',{exact:true})}).last();
 for(const [key,value] of [['x','23'],['y','42'],['width','37'],['rotation','17'],['opacity','0.65']])await controls.getByRole('slider',{name:new RegExp('^'+key+':')}).fill(value);
 await page.keyboard.press('Escape');
 const decals=page.locator('[data-decal-id]');await expect(decals).toHaveCount(2);
 const snapshot=()=>decals.evaluateAll(els=>els.map(el=>({id:el.getAttribute('data-decal-id'),left:(el as HTMLElement).style.left,top:(el as HTMLElement).style.top,width:(el as HTMLElement).style.width,transform:(el as HTMLElement).style.transform,opacity:(el as HTMLElement).style.opacity})));
 const before=await snapshot();await decals.first().click();
 await page.getByLabel('Selected ornament color').fill('#715394');
 await page.getByRole('button',{name:'Replace ornament',exact:true}).click();
 const chooser=page.getByRole('dialog',{name:'Replace ornament',exact:true});await expect(chooser).toBeVisible();
 const choices=chooser.getByRole('button',{name:/^Use /});
 await expect(chooser.getByLabel('Replacement collection')).toHaveValue('Fine-line');await expect(choices).toHaveCount(93);
 expect(await chooser.locator('option').allTextContents()).not.toEqual(expect.arrayContaining(['Original','Legacy']));
 await choices.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>(img as HTMLImageElement).decode()));});
 for(const index of [0,12,24,25,26,27,28,29,30,...Array.from({length:62},(_,i)=>i+31),2,13]){await choices.nth(index).click();await expect(chooser).toBeVisible();await expect(page.getByLabel('Resize selected ornament')).toBeVisible();expect(await snapshot()).toEqual(before);await expect(decals).toHaveCount(2);}
 const finalSource=await decals.first().getAttribute('src');expect(Buffer.from(finalSource!.split(',')[1],'base64').toString()).toContain('#715394');
 await page.screenshot({path:info.outputPath('replacement-chooser.png'),fullPage:true});
 await page.keyboard.press('Escape');await expect(chooser).toHaveCount(0);await expect(page.getByRole('button',{name:'Replace ornament',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Replace ornament',exact:true}).click();await chooser.getByRole('button',{name:'Done',exact:true}).click();await expect(chooser).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Replace ornament',exact:true})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>new Promise<string>((resolve,reject)=>{const r=indexedDB.open('bibliarch-books',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction('library').objectStore('library').get('bibliarch-books-v1');q.onsuccess=()=>{resolve(q.result?.raw||'');db.close();};};}))).toContain('builtin:bibliarch-lavender-air');
 await page.reload();const open=page.getByRole('button',{name:'Open Untitled book',exact:true});if(await open.isVisible())await open.click();
 await expect(decals).toHaveCount(2);expect(await snapshot()).toEqual(before);await expect(decals.first()).toHaveAttribute('src',finalSource!);
 // Replacement still uses the same drag/resize controls, including off-page bleed.
 await decals.first().click();const handle=page.getByLabel('Resize selected ornament');const h=(await handle.boundingBox())!;
 await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+20,h.y+h.height/2,{steps:4});await page.mouse.up();
 expect(parseFloat((await snapshot())[0].width)).toBeGreaterThan(37);
 const b=(await decals.first().boundingBox())!,paper=(await decals.first().locator('xpath=ancestor::*[contains(@class,"pagination-page")]').boundingBox())!;
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-paper.width*.35,b.y+b.height/2,{steps:5});await page.mouse.up();
 expect(parseFloat((await snapshot())[0].left)).toBeLessThan(0);await expect(decals).toHaveCount(2);
});
