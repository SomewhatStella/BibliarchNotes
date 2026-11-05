import {test,expect} from '@playwright/test';
test('tray reports a full page without dropping or replacing existing ornaments',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Japanese light novel',exact:true}).click();
 // Bind the seeded scene to the actual rendered drop target, not chapter ordering.
 const sceneId=await page.locator('.pagination-page').first().evaluate(el=>el.closest('.paper').id.replace('page-',''));
 const before=await page.evaluate(id=>{const l=JSON.parse(localStorage.getItem('bibliarch-books-v1'));const scene=l.books.flatMap(b=>b.chapters.flatMap(c=>c.scenes)).find(s=>s.id===id);scene.decals=Array.from({length:24},(_,i)=>({id:'kept-'+i,src:'builtin:stars',alt:'Stars',x:10,y:10,width:5,rotation:0,opacity:1}));localStorage.setItem('bibliarch-books-v1',JSON.stringify(l));return l.books;},sceneId);
 await page.reload();await page.getByRole('button',{name:/Open Japanese light novel/}).or(page.getByRole('textbox',{name:'Book title',exact:true})).waitFor();if(await page.getByRole('button',{name:/Open Japanese light novel/}).isVisible())await page.getByRole('button',{name:/Open Japanese light novel/}).click();
 await page.getByRole('tab',{name:'Decorations',exact:true}).click();const item=page.getByRole('button',{name:'Drag Willow whisper onto page'}),paper=page.locator(`#page-${sceneId} .pagination-page`).first();await expect(paper.locator('[data-decal-id]')).toHaveCount(24);await paper.scrollIntoViewIfNeeded();const a=await item.boundingBox(),b=await paper.boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width*.4,b.y+b.height*.4,{steps:12});await page.mouse.up();
 await expect(page.getByLabel('Ornament tray')).toContainText('Maximum 24');await expect(paper.locator('[data-decal-id]')).toHaveCount(24);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-books-v1')).books)).toEqual(before);
 await page.reload();await expect(paper.locator('[data-decal-id]')).toHaveCount(24);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bibliarch-books-v1')).books)).toEqual(before);
});
