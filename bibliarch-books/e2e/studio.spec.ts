import {test, expect, type Page} from './editor-fixture';
import {answerAsk} from './ask';
import {readFile} from 'node:fs/promises';
import {openTool, closeTool} from './tool-dialog';

const prose = (page: Page) => page.getByRole('textbox', {name: 'Manuscript', includeHidden: true}).nth(1);
async function fileMenu(page: Page) {
  const menu = page.locator('details.menu').filter({has: page.locator('summary', {hasText: /^File$/})});
  if (!(await menu.getAttribute('open'))) {
    if (!(await menu.evaluate(el => (el as HTMLDetailsElement).open))) await menu.locator('summary').click();
  }
}

test('writing, source formatting, pages, books and reload preserve content', async ({page}) => {
  await page.goto('/books');
  await expect(page.getByLabel('Book title', {exact: true})).toHaveValue('Book name');
  await expect(page.getByRole('textbox', {name: 'Manuscript'})).toHaveCount(2);
  await expect(page.locator('.paper').first()).toHaveClass(/template-book-front/);
  await expect(page.locator('.chapter-kicker')).toHaveText('CHAPTER 1');
  await page.getByLabel('Book title', {exact: true}).fill('Regression book');
  await prose(page).fill('Reliable ending.');
  await prose(page).press('Control+a');
  await page.getByRole('button', {name: 'Bold', exact: true}).click();
  await expect(prose(page).locator('strong')).toHaveText('Reliable ending.');
  const pageTools = page.getByLabel('Page tools', {exact: true});
  await pageTools.getByText('Organize', {exact: true}).click();
  await pageTools.getByRole('button', {name: 'Add blank page', exact: true}).click();
  const editors = page.getByRole('textbox', {name: 'Manuscript'});
  await expect(editors).toHaveCount(3);
  await expect(editors.nth(2).locator('p')).toHaveText('');
  await editors.nth(2).fill('Second scene');
  await page.reload();
  await expect(prose(page).locator('strong')).toHaveText('Reliable ending.');
  await expect(editors.nth(2).locator('p')).toHaveText('Second scene');
  await fileMenu(page);
  await page.getByRole('button', {name: 'New book', exact: true}).click();
  await expect(page.getByLabel('Book title', {exact: true})).toHaveValue('Untitled book');
  await expect(page.getByRole('textbox', {name: 'Manuscript'})).toHaveCount(1);
  await expect(page.getByRole('textbox', {name: 'Manuscript'})).not.toContainText('Reliable ending.');
  await page.getByLabel('Book library').selectOption({label: 'Regression book'});
  await expect(prose(page).locator('strong')).toHaveText('Reliable ending.');
  await page.getByRole('button', {name: 'Toggle outline', exact: true}).click();
  await expect(page.getByLabel('Outline panel')).toBeHidden();
  await page.getByRole('button', {name: 'Toggle outline', exact: true}).click();
  await expect(page.getByLabel('Outline panel')).toBeVisible();
});

test('literal replacement and snapshot restore keep a recovery copy', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.text().includes('IndexSizeError'))errors.push(m.text())});
  await page.goto('/books');
  await prose(page).fill('A.* A.* untouched');
  await openTool(page, 'Review');
  await page.getByRole('button', {name: 'Save snapshot', exact: true}).click();
  await closeTool(page);
  await page.locator('summary[aria-label="Find & replace"]').click();
  await page.getByLabel('Find text', {exact: true}).fill('A.*');
  await page.getByLabel('Replace with').fill('$1');
  await page.getByRole('button', {name: 'Replace all'}).click();
  await expect(prose(page).locator('p')).toHaveText('$1 $1 untouched');
  expect(errors).toEqual([]);
  await openTool(page, 'Review');
  await page.getByRole('button', {name: 'Restore', exact: true}).first().click();
  await answerAsk(page);
  await expect(prose(page).locator('p')).toHaveText('A.* A.* untouched');
  await expect(page.getByText('Before restore', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Restore', exact: true}).first().click();
  await answerAsk(page);
  await expect(prose(page).locator('p')).toHaveText('$1 $1 untouched');
  await page.reload();
  await expect(prose(page).locator('p')).toHaveText('$1 $1 untouched');
  expect(errors).toEqual([]);
});

test('storage failures remain visible, retain the draft and allow recovery download', async ({page}) => {
  await page.addInitScript(() => {Storage.prototype.setItem = () => {throw new Error('Quota exceeded');};});
  await page.goto('/books');
  await expect(page.locator('.error[role="alert"]')).toContainText('Not saved');
  await prose(page).fill('Keep this draft');
  await expect(page.locator('.error[role="alert"]')).toContainText('Not saved');
  await expect(prose(page).locator('p')).toHaveText('Keep this draft');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Download draft', exact: true}).click();
  const download = await pending;
  const library = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(JSON.stringify(library)).toContain('Keep this draft');
});

test('invalid JSON never replaces existing writing', async ({page}) => {
  await page.goto('/books');
  await prose(page).fill('Irreplaceable manuscript');
  const before = await page.evaluate(() => localStorage.getItem('bibliarch-books-v1'));
  await fileMenu(page);
  await page.getByLabel('Import JSON backup').setInputFiles({name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"books":[]}')});
  await expect(page.locator('.error[role="alert"]')).toContainText('Invalid Bibliarch backup');
  await expect(prose(page).locator('p')).toHaveText('Irreplaceable manuscript');
  expect(await page.evaluate(() => localStorage.getItem('bibliarch-books-v1'))).toBe(before);
});
