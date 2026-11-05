import { test, expect } from '@playwright/test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
const route=path.resolve('app/pagination-test');
let created=false;
// A disposable route exercises the actual Editor without modifying the application page.
test.beforeAll(async()=>{
 if(process.env.PAGINATION_URL)return;
 await mkdir(route,{recursive:true});
 await writeFile(path.join(route,'page.tsx'),'export { default } from "../../src/pagination/TestHarness";\n',{flag:'wx'});
 created=true;
});
test.afterAll(async()=>{if(created)await rm(route,{recursive:true,force:true});});
test('long editable paragraph flows, edits reflow, deletion/undo and source reload', async ({page})=>{
 await page.goto(process.env.PAGINATION_URL || 'http://localhost:3210/pagination-test');
 const editor=page.getByRole('textbox',{name:'Manuscript'});
 await expect(editor).toBeVisible();
 await expect(page.locator('.pagination-page')).toHaveCount(1);
 await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const text=Array.from({length:1400},(_,i)=>`word${i} `).join('');
 await editor.click(); await page.keyboard.press('Control+Home'); await page.keyboard.press('Control+Shift+End');
 await page.keyboard.insertText(text);
 await expect.poll(()=>page.locator('.pagination-page').count(),{timeout:20000}).toBeGreaterThan(5);
 const source=()=>page.getByRole('textbox',{name:'source'}).inputValue();
 const plain=async()=>JSON.parse(await source()).root.children.map((p:any)=>p.children.map((n:any)=>n.text||'').join('')).join('\n');
 await expect.poll(plain).toBe(text);
 // All text must really fit inside distinct fixed-height page bodies.
 await expect.poll(()=>page.locator('.pagination-body').evaluateAll(bodies=>bodies.every(body=>Array.from(body.children).every(child=>child.getBoundingClientRect().bottom<=body.getBoundingClientRect().bottom+1))),{timeout:20000}).toBe(true);
 await editor.locator('p').nth(1).click(); await page.keyboard.press('Home'); await page.keyboard.insertText('BOUNDARY ');
 await expect.poll(plain).toContain('BOUNDARY ');
 await page.keyboard.press('Enter');
 await expect.poll(async()=>JSON.parse(await source()).root.children.length).toBe(2);
 await page.keyboard.press('Backspace');
 await expect.poll(async()=>JSON.parse(await source()).root.children.length).toBe(1);
 await page.keyboard.press('Control+Home'); await page.keyboard.insertText('EARLIER '.repeat(70));
 await expect.poll(plain).toContain('EARLIER ');
 const before=await plain();
 await page.keyboard.press('Control+Home'); await page.keyboard.press('Control+Shift+End'); await page.keyboard.press('Backspace');
 await expect.poll(()=>page.locator('.pagination-page').count(),{timeout:15000}).toBe(1);
 await page.keyboard.press('Control+z'); await expect.poll(plain,{timeout:15000}).toBe(before);
 await expect.poll(()=>page.locator('.pagination-page').count(),{timeout:20000}).toBeGreaterThan(5);
 const saved=await source(); expect(saved).not.toMatch(/flow-paragraph|"group"|"type":"page"/);
 await page.getByRole('button',{name:'Reload source'}).click();
 await expect.poll(plain).toBe(before);
 await expect.poll(()=>page.locator('.pagination-page').count(),{timeout:20000}).toBeGreaterThan(5);
});
