import {test,expect} from './editor-fixture';
for(const template of ['Title page','Chapter opener'])test(`${template} title is editable text in the page and survives long chapters`,async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();await page.getByRole('button',{name:'Page templates',exact:true}).click();await page.getByRole('button',{name:`Choose ${template}`,exact:true}).click();await page.getByRole('button',{name:'Apply to selected page',exact:true}).click();await page.getByRole('button',{name:'Close gallery',exact:true}).click();
 const manuscript=page.getByRole('textbox',{name:'Manuscript',exact:true}).first();
 // Docs-style: the title is a heading inside the manuscript, not a separate control.
 await expect(page.getByRole('textbox',{name:'Page title',exact:true})).toHaveCount(0);
 const heading=manuscript.locator(template==='Title page'?'h1':'h2').first();
 await expect(heading).toBeVisible();
 const prose='The morning light fell across the quiet library. Readers turned the pages and waited for the rain to stop. '.repeat(130);
 await manuscript.locator('p').last().click();await page.keyboard.insertText(prose);
 await expect.poll(()=>manuscript.locator('.pagination-page').count()).toBeGreaterThan(2);
 await heading.click();await page.keyboard.press('End');await page.keyboard.press('Shift+Home');
 await page.keyboard.type('Alpha bravo charlie delta echo',{delay:20});
 await expect(heading).toHaveText('Alpha bravo charlie delta echo');
 await expect(page.getByLabel('Paragraph style',{exact:true})).toHaveValue(template==='Title page'?'title':'h1');
 const finalTitle='Alpha bravo charlie delta echo';
 // Observe actual rendered frames while typing in a continuation page, not just
 // before/after screenshots (which miss a collapsed frame).
 await manuscript.click();await page.keyboard.press('Control+End');
 await page.evaluate(()=>{window.__layoutSamples=[];window.__sampleLayout=true;const sample=()=>{if(!window.__sampleLayout)return;const root=document.querySelector('.editor-paginated');window.__layoutSamples.push({count:root.querySelectorAll('.pagination-page').length,height:root.getBoundingClientRect().height,scroll:(()=>{const values=[];for(let el=root.parentElement;el;el=el.parentElement)values.push(el.scrollTop);return values})()});requestAnimationFrame(sample)};requestAnimationFrame(sample)});
 await page.keyboard.type(' Continuous typing remains on the same page.',{delay:40});
 await page.evaluate(()=>window.__sampleLayout=false);
 const samples=await page.evaluate(()=>window.__layoutSamples);
 expect(samples.length).toBeGreaterThan(5);
 expect(new Set(samples.map(s=>s.count)).size).toBe(1);
 expect(new Set(samples.map(s=>JSON.stringify(s.scroll))).size).toBe(1);
 expect(Math.max(...samples.map(s=>s.height))-Math.min(...samples.map(s=>s.height))).toBeLessThan(2);
 await expect(manuscript).toContainText('Continuous typing remains on the same page.');
 await expect.poll(()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('bibliarch-books',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction('library').objectStore('library').get('bibliarch-books-v1');q.onsuccess=()=>{resolve(q.result?.raw||'');db.close();};};}))).toContain(finalTitle);
 await page.reload();
 const open=page.getByRole('button',{name:/^Open /}).first();if(await open.isVisible())await open.click();
 await expect(page.getByRole('textbox',{name:'Manuscript',exact:true}).first().locator('h1,h2').first()).toHaveText(finalTitle);
 await expect(page.getByRole('textbox',{name:'Manuscript',exact:true}).first()).toContainText('Continuous typing remains on the same page.');
});
