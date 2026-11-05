import {test, expect, type Page} from '@playwright/test';

async function books(page: Page) {
  const response = await page.goto('/books');
  if (response?.status() === 404) await page.goto('/');
  await expect(page.getByRole('button', {name:'Toggle color theme'})).toBeVisible();
}
const toggle = (page: Page) => page.getByRole('button', {name:'Toggle color theme'});
test('system default, keyboard toggle, persistence and hydration', async ({page}) => {
  const errors:string[]=[];
  page.on('console', msg => {if(msg.type()==='error') errors.push(msg.text());});
  await page.emulateMedia({colorScheme:'dark'});
  await books(page);
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','dark');
  await toggle(page).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','light');
  expect(await page.evaluate(() => localStorage.getItem('bibliarch.ui.theme.v1'))).toBe('light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','light');
  expect(errors.filter(e=>/hydration|did not match/i.test(e))).toEqual([]);
});
test('system changes are followed until explicit choice; blocked storage stays usable', async ({page}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {throw new DOMException('blocked','SecurityError');};
    Storage.prototype.setItem = () => {throw new DOMException('blocked','SecurityError');};
  });
  await page.emulateMedia({colorScheme:'light'});
  await books(page);
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','light');
  await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','dark');
  await toggle(page).click();
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','light');
  await page.emulateMedia({colorScheme:'light'}); await page.emulateMedia({colorScheme:'dark'});
  await expect(page.locator('html')).toHaveAttribute('data-ui-theme','light');
});
test('library and editor chrome switch without changing paper or thumbnail colors', async ({page}) => {
  await page.emulateMedia({colorScheme:'light'});
  await books(page);
  const thumbnail = page.locator('.page-thumbnail').first();
  const appearance = (selector:string) => page.locator(selector).first().evaluate(el => {
    const s=getComputedStyle(el); return {background:s.backgroundColor,color:s.color};
  });
  await expect(thumbnail).toBeVisible();
  const beforeThumb=await appearance('.page-thumbnail');
  const beforeLibrary=await appearance('.library-home');
  await toggle(page).click();
  expect(await appearance('.library-home')).not.toEqual(beforeLibrary);
  expect(await appearance('.page-thumbnail')).toEqual(beforeThumb);
  await page.getByRole('button',{name:/Create Blank/i}).click();
  await expect(page.locator('.pagination-page').first()).toBeVisible();
  const beforePaper=await appearance('.pagination-page');
  const beforeChrome=await appearance('.document-scroller');
  await toggle(page).click();
  expect(await appearance('.document-scroller')).not.toEqual(beforeChrome);
  expect(await appearance('.pagination-page')).toEqual(beforePaper);
  await expect(toggle(page)).toHaveAttribute('aria-pressed','false');
  await page.getByRole('tab',{name:'Decorations',exact:true}).click();
  await expect(page.locator('.decal-tray')).toBeVisible();
  await expect(page.locator('.decal-tray')).toHaveCSS('background-color','rgb(250, 248, 251)');
  await toggle(page).click();
  await expect(page.locator('.decal-tray')).toHaveCSS('background-color','rgb(37, 32, 44)');
  await page.getByLabel('View',{exact:true}).selectOption('facing');
  await expect(page.locator('.book-preview')).toBeVisible();
  expect(await appearance('.preview-page .pagination-page')).toEqual(beforePaper);
  await page.getByRole('button',{name:'Format',exact:true}).click();
  await expect(page.locator('.menu[open] > div')).toHaveCSS('background-color','rgb(48, 40, 55)');
  await page.getByRole('button',{name:'Page styles and typography',exact:true}).click();
  await expect(page.locator('.settings.tool-dialog')).toBeVisible();
  await expect(page.locator('.settings.tool-dialog')).toHaveCSS('background-color','rgb(48, 40, 55)');
});
