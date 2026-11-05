import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch();
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for (const width of [1440,390]) {
  await page.setViewportSize({width,height:950});await page.goto('http://127.0.0.1:3210/');
  await page.locator('.welcome-game-preview img').evaluate(img=>img.decode());
  assert.equal(await page.locator('.welcome-primary').getAttribute('href'),'/notes/dashboard');
  assert.equal(await page.locator('.welcome-secondary').getAttribute('href'),'/books');
  assert.equal(await page.getByText('Coming soon',{exact:true}).count(),1);
  assert.ok(await page.locator('.welcome-home').evaluate(el=>el.scrollWidth<=el.clientWidth));
  const image=await page.locator('.welcome-game-preview img').evaluate(el=>({width:el.clientWidth,height:el.clientHeight,nw:el.naturalWidth,nh:el.naturalHeight}));
  assert.ok(image.nw>0);assert.ok(Math.abs(image.width/image.height-image.nw/image.nh)<.02);
  await page.screenshot({path:`test-results/home-${width}.png`});
  await page.locator('.welcome-discover').click();
  await page.locator('#coming-soon').scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/coming-soon-${width}.png`});
 }
 await page.setViewportSize({width:1440,height:950});await page.goto('http://127.0.0.1:3210/');await page.locator('.welcome-secondary').click();await page.locator('.book-presets').waitFor();
 await page.goto('http://127.0.0.1:3210/');await page.locator('.welcome-primary').click();await page.waitForURL(/\/notes\//);
 assert.ok((await page.locator('body').innerText()).length>0);assert.deepEqual(errors,[]);
 console.log('PASS homepage desktop/mobile layout, original screenshot loading/aspect ratio, coming-soon label and anchor, Books/Notes navigation, no runtime errors');
}finally{await browser.close();}
