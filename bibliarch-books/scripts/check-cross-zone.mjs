import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch();
try {
 const c=await b.newContext({colorScheme:'light'});const p=await c.newPage();
 for(const width of [1440,390]) {
  await p.setViewportSize({width,height:950});
  await p.goto('http://127.0.0.1:3210/');
  await p.getByRole('heading',{name:'Visual story planning.',exact:false}).waitFor();
  const nav=async()=>p.locator('.site-navigation').evaluate(e=>({height:e.getBoundingClientRect().height,bg:getComputedStyle(e).backgroundColor}));
  const home=await nav();
  await p.getByRole('button',{name:'Toggle color theme'}).click();
  assert.equal(await p.locator('html').getAttribute('data-ui-theme'),'dark');
  await p.screenshot({path:`test-results/home-restored-${width}.png`,fullPage:true});
  await p.locator('.site-navigation').getByRole('link',{name:'Notes',exact:true}).click();
  await p.getByRole('button',{name:'Toggle color theme'}).waitFor();
  assert.equal(await p.locator('html').getAttribute('data-ui-theme'),'dark');
  await p.reload();assert.equal(await p.locator('html').getAttribute('data-ui-theme'),'dark');
  await p.getByRole('button',{name:'Toggle color theme'}).click();
  assert.deepEqual(await nav(),home);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:`test-results/notes-shared-${width}.png`,fullPage:true});
  await p.locator('.site-navigation').getByRole('link',{name:'Books',exact:true}).click();
  await p.getByRole('button',{name:'Toggle color theme'}).waitFor();
  assert.equal(await p.locator('html').getAttribute('data-ui-theme'),'light');
  assert.deepEqual(await nav(),home);
  const tab=await c.newPage();await tab.goto('http://127.0.0.1:3210/notes/login');
  await p.getByRole('button',{name:'Toggle color theme'}).click();
  await tab.waitForFunction(()=>document.documentElement.getAttribute('data-ui-theme')==='dark');
  await p.getByRole('button',{name:'Toggle color theme'}).click();await tab.close();
  console.log(`PASS ${width}: shared nav geometry/colors, route persistence, reload, reverse theme toggle, cross-tab updates`);
 }
} finally {await b.close();}
