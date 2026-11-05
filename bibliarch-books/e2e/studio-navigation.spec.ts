import {test, expect} from '@playwright/test';

test('navigation and everyday formatting are visible by default', async ({page}) => {
  await page.goto('/books');
  await page.getByRole('button', {name:'Create Japanese light novel', exact:true}).click();
  await expect(page.getByLabel('Outline panel')).toBeVisible();
  const menu = page.getByRole('navigation', {name:'Document menu'});
  for (const name of ['File','Edit','View','Insert','Format','Review','Cloud']) {
    await expect(menu.locator('summary').filter({hasText:new RegExp(`^${name}$`)})).toBeVisible();
  }
  await expect(page.getByLabel('Selection font')).toBeVisible();
  await page.getByLabel('Toggle outline', {exact:true}).click();
  await expect(page.getByLabel('Outline panel')).toBeHidden();
  await page.getByLabel('Toggle outline', {exact:true}).click();
  await expect(page.getByLabel('Outline panel')).toBeVisible();
});

test('Settings exposes focused dialogs and can be left without hiding navigation', async ({page}) => {
  await page.goto('/books');
  await page.getByRole('button', {name:'Create Japanese light novel', exact:true}).click();
  await page.getByRole('tab', {name:'Settings', exact:true}).click();
  for (const [button, title] of [['Page layout','Page styles'],['Typography','Page styles'],['Book theme','Book themes']]) {
    await page.getByRole('button', {name:button, exact:true}).click();
    await expect(page.getByRole('dialog', {name:title, exact:true})).toBeVisible();
    await page.getByRole('button', {name:'Close settings', exact:true}).click();
    await expect(page.getByRole('dialog', {name:title, exact:true})).toBeHidden();
  }
  await expect(page.getByRole('button', {name:'Export PDF', exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:'Preview book', exact:true})).toBeVisible();
  await page.getByRole('tab', {name:'Image', exact:true}).click();
  await expect(page.getByRole('button', {name:'Page layout', exact:true})).toBeHidden();
  await expect(page.getByLabel('Outline panel')).toBeVisible();
});
