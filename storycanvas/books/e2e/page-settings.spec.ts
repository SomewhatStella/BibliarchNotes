import {test,expect} from '@playwright/test';

test('Book design uses named choices, applies them live and keeps preview reachable',async({page})=>{
  await page.goto('/books');
  await page.getByRole('button',{name:'Create Blank book',exact:true}).click();
  await page.locator('.style-button').click();
  const dialog=page.getByRole('dialog',{name:'Book design',exact:true});
  await expect(dialog.getByRole('heading',{name:'Book design'})).toBeVisible();
  await expect(dialog.getByRole('tab',{name:'Text'})).toHaveAttribute('aria-selected','true');
  // No raw number boxes anywhere in the panel.
  await expect(dialog.locator('input[type=number]')).toHaveCount(0);
  const size=dialog.getByRole('group',{name:'Size'}).first();
  await size.getByRole('button',{name:'Large',exact:true}).click();
  await expect(size.getByRole('button',{name:'Large',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.pages').evaluate(e=>getComputedStyle(e).getPropertyValue('--body-size').trim())).toBe('18px');
  await page.screenshot({path:'test-results-page-settings/desktop.png'});
  await dialog.getByRole('tab',{name:'Paper',exact:true}).click();
  const sizes=dialog.getByRole('group',{name:'Book size'});
  const before=await page.locator('.paper').first().evaluate(e=>e.getBoundingClientRect().width);
  await sizes.getByRole('button',{name:/6 × 9 in/}).click();
  await expect(sizes.getByRole('button',{name:/6 × 9 in/})).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.paper').first().evaluate(e=>e.getBoundingClientRect().width)).not.toBe(before);
  await expect(dialog.getByRole('group',{name:'Page numbers'})).toBeVisible();
  await dialog.getByRole('tab',{name:'This page',exact:true}).click();
  await expect(dialog.getByRole('button',{name:"Save this page's look…",exact:true})).toBeVisible();
  await expect(dialog.getByRole('group',{name:'Kind of page'}).getByRole('button',{name:'Contents'})).toBeVisible();
  await dialog.getByRole('tab',{name:'Text'}).click();
  await expect(dialog.getByRole('group',{name:'Size'}).first().getByRole('button',{name:'Large',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results-page-settings/mobile.png'});
  expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  await page.emulateMedia({colorScheme:'dark'});
  await page.evaluate(()=>document.documentElement.setAttribute('data-ui-theme','dark'));
  await page.screenshot({path:'test-results-page-settings/mobile-dark.png'});
  await dialog.getByRole('button',{name:'See it as a book'}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('View',{exact:true})).toHaveValue('3d');
});
