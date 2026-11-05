import {test,expect} from './editor-fixture';
async function openReview(page: import('@playwright/test').Page) {
  const menu = page.locator('details.menu').filter({has: page.getByRole('button', {name: 'Review', exact: true})});
  if (!(await menu.evaluate(e => (e as HTMLDetailsElement).open))) await page.getByRole('button', {name: 'Review', exact: true}).click();
  await page.getByRole('button', {name: 'Comments, changes and snapshots', exact: true}).click();
}
test('tracked page edits survive reload and can be rejected or accepted', async ({page}) => {
  await page.goto('/books');
  const ed = page.getByRole('textbox', {name: 'Manuscript', includeHidden: true}).nth(1);
  await ed.fill('Original words');
  await openReview(page);
  await page.getByLabel('Track page changes').check();
  await page.getByRole('button', {name: /^Close (dialog|settings)$/}).click();
  await ed.fill('Suggested words');
  await openReview(page);
  await expect(page.getByRole('button', {name: 'Reject all changes'})).toBeVisible();
  await page.reload();
  await ed.click();
  await openReview(page);
  await page.getByRole('button', {name: 'Reject all changes'}).click();
  await expect(ed.locator('p')).toHaveText('Original words');
  await page.getByLabel('Track page changes').check();
  await page.getByRole('button', {name: /^Close (dialog|settings)$/}).click();
  await ed.fill('Accepted words');
  await openReview(page);
  await page.getByRole('button', {name: 'Accept all changes'}).click();
  await page.reload();
  await expect(ed.locator('p')).toHaveText('Accepted words');
});
