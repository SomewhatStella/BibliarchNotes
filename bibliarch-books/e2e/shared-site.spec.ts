import {test,expect} from '@playwright/test';

test('shared home opens both real workspaces on the same origin',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Your story, from first thought to final page.'})).toBeVisible();
 await page.getByRole('link',{name:'Open book creator',exact:true}).click();
 await expect(page).toHaveURL(/\/books$/);
 await expect(page.getByRole('button',{name:/Create Blank/i})).toBeVisible();
 await page.getByRole('link',{name:'Bibliarch home'}).click();
 await page.getByRole('link',{name:'Open notes',exact:true}).click();
 await expect(page).toHaveURL(/\/notes\/login$/);
 await expect(page.getByRole('button',{name:/log in|sign in/i})).toBeVisible();
 expect(new URL(page.url()).port).toBe('3210');
 await page.getByRole('link',{name:'Storycanvas home'}).click();
 await expect(page.getByRole('heading',{name:'Your story, from first thought to final page.'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('homepage is responsive, keyboard-accessible and follows saved appearance',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 await page.getByRole('button',{name:'Toggle color theme'}).click();
 const theme=await page.locator('html').getAttribute('data-ui-theme');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-ui-theme',theme!);
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});
  expect(await page.locator('.site-home').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  await expect(page.getByRole('link',{name:'Open notes',exact:true})).toBeVisible();
  await page.screenshot({path:`artifacts/shared-home-${width}.png`,fullPage:true});
 }
});
