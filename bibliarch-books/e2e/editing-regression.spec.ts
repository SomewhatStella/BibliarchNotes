import {test, expect, type Page} from '@playwright/test';

async function typeBody(page:Page, index=0) {
 const p=page.getByRole('textbox',{name:'Manuscript',exact:true}).nth(index).locator('.pagination-body > p').first();
 await p.click(); await page.keyboard.type('alpha omega');
 await page.keyboard.press('Home'); await page.keyboard.type('START ');
 await page.keyboard.press('Home'); for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight');
 await page.keyboard.type('MIDDLE ');
 await page.keyboard.press('End'); await page.keyboard.type(' END');
 await expect(p).toHaveText('START alpha MIDDLE omega END');
}

test('blank book accepts pointer and keyboard edits at start middle end and persists',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
 const title=page.getByLabel('Book title',{exact:true});await title.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Keyboard blank');
 await typeBody(page);
 await page.getByRole('button',{name:'← My books',exact:true}).click();
 await page.getByRole('button',{name:'Open Keyboard blank',exact:true}).click();
 await expect(page.locator('.pagination-body > p').first()).toHaveText('START alpha MIDDLE omega END');
 await page.reload();await page.getByRole('button',{name:'Open Keyboard blank',exact:true}).click();
 await expect(page.locator('.pagination-body > p').first()).toHaveText('START alpha MIDDLE omega END');
});

test('preset visible title and chapter heading accept typing and persist without damaging body',async({page})=>{
 await page.goto('/books');await page.getByRole('button',{name:'Create Classic novel',exact:true}).click();
 const title=page.locator('.pagination-prefix h1').first();await title.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Keyboard novel');
 await expect(page.getByLabel('Book title',{exact:true})).toHaveValue('Keyboard novel');
 const heading=page.locator('.pagination-prefix h1').nth(1);await heading.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('A changed chapter',{delay:25});
 await expect(page.getByLabel('Page title',{exact:true}).nth(1)).toHaveValue('A changed chapter');
 await typeBody(page,1);
 await page.getByRole('button',{name:'← My books',exact:true}).click();await page.getByRole('button',{name:'Open Keyboard novel',exact:true}).click();
 await expect(page.getByLabel('Page title', {exact:true}).nth(1)).toHaveValue('A changed chapter');
 await expect(page.getByRole('textbox',{name:'Manuscript',exact:true}).nth(1).locator('.pagination-body > p').first()).toHaveText('START alpha MIDDLE omega END');
 await page.reload();await page.getByRole('button',{name:'Open Keyboard novel',exact:true}).click();
 await expect(page.getByLabel('Page title', {exact:true}).nth(1)).toHaveValue('A changed chapter');
 await expect(page.getByRole('textbox',{name:'Manuscript',exact:true}).nth(1).locator('.pagination-body > p').first()).toHaveText('START alpha MIDDLE omega END');
});

test('prehydration Grammarly body attributes do not produce hydration warnings',async({page})=>{
 const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const observer=new MutationObserver(()=>{if(document.body){document.body.setAttribute('data-new-gr-c-s-check-loaded','14.1234.0');document.body.setAttribute('data-gr-ext-installed','');observer.disconnect();}});
  observer.observe(document,{childList:true,subtree:true});
 });
 await page.goto('/books');await page.getByRole('button',{name:'Create Blank book',exact:true}).click();await typeBody(page);
 await expect(page.locator('body')).toHaveAttribute('data-gr-ext-installed','');
 expect(errors.filter(e=>/hydration|hydrated|server rendered/i.test(e))).toEqual([]);
});
