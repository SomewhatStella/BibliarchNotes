import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdirSync} from 'node:fs';
const b=await chromium.launch();mkdirSync('test-results',{recursive:true});
try{const p=await b.newPage({viewport:{width:1440,height:950},colorScheme:'light'});await p.goto('http://127.0.0.1:3210/');
const palette=()=>p.evaluate(()=>{const s=getComputedStyle(document.documentElement);return ['--ui-surface','--ui-accent','--ui-tint'].map(k=>s.getPropertyValue(k).trim())});assert.deepEqual(await palette(),['#fdfbf4','#2e5aac','#f8edc8']);await p.screenshot({path:'test-results/brand-home.png'});
await p.goto('http://127.0.0.1:3210/books');await p.locator('.page-thumbnail').first().waitFor();const appearance=sel=>p.locator(sel).first().evaluate(el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.color]});const thumb=await appearance('.page-thumbnail');
await p.getByRole('button',{name:'Toggle color theme'}).click();assert.equal((await palette())[1],'#91b5f5');assert.deepEqual(await appearance('.page-thumbnail'),thumb);await p.screenshot({path:'test-results/brand-books-dark.png'});
await p.getByRole('button',{name:'Create Blank book'}).click();await p.locator('.pagination-page').first().waitFor();const paper=await appearance('.pagination-page');const darkChrome=await appearance('.document-scroller');
// Theme selector intentionally lives on overview, not the hidden editor header.
await p.evaluate(()=>document.documentElement.setAttribute('data-ui-theme','light'));assert.deepEqual(await appearance('.pagination-page'),paper);assert.notDeepEqual(await appearance('.document-scroller'),darkChrome);assert.equal(await p.locator('.site-navigation').isVisible(),false);await p.screenshot({path:'test-results/brand-editor.png'});
console.log('PASS Notes-matching light tokens, blue/yellow dark theme, unchanged thumbnail/paper paint and editor header stays hidden');}finally{await b.close()}
