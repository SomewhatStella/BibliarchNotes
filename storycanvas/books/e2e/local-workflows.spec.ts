import {test, expect, type Page} from './editor-fixture';
import {answerAsk} from './ask';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {openTool, closeTool} from './tool-dialog';

const prose = (p: Page) => p.getByRole('textbox', {name: 'Manuscript', includeHidden: true}).nth(1);
async function promptClick(p: Page, button: string, answers: string[]) {
  const handler = (d: import('@playwright/test').Dialog) => d.accept(answers.shift() || '');
  p.on('dialog', handler);
  try { await p.getByRole('button', {name: button, exact: true}).click(); }
  finally { p.off('dialog', handler); }
}
async function backup(p: Page) {
  const pending = p.waitForEvent('download');
  await p.getByRole('button', {name: 'Save backup', exact: true}).click();
  return readFile((await (await pending).path())!);
}
async function openFile(p: Page) {
  const menu = p.locator('details.menu').filter({has: p.locator('summary', {hasText: /^File$/})});
  if (!(await menu.evaluate(e => (e as HTMLDetailsElement).open))) await menu.locator('summary').click();
}

test('page-local comments and character/location references survive reload and JSON import', async ({page}) => {
  await page.goto('/books');
  await prose(page).fill('Annotated manuscript');
  await prose(page).press('Control+a');
  await page.getByRole('button', {name: 'Italic', exact: true}).click();
  await openTool(page, 'Review');
  await promptClick(page, 'Add comment', ['Check the chronology']);
  await promptClick(page, 'Add character', ['Mira', 'Remembers the river']);
  await promptClick(page, 'Add location', ['North quay', 'Flooded at dawn']);
  await page.getByRole('button', {name: 'Resolve', exact: true}).click();
  await closeTool(page);
  await page.getByRole('textbox', {name: 'Manuscript'}).first().click();
  await openTool(page, 'Review');
  await expect(page.getByText('Check the chronology', {exact: true})).toHaveCount(0);
  await closeTool(page);
  await prose(page).click();
  await openTool(page, 'Review');
  await expect(page.getByRole('button', {name: 'Reopen', exact: true})).toBeVisible();
  await closeTool(page);
  const original = JSON.parse((await backup(page)).toString());
  await page.reload();
  await prose(page).click();
  await openTool(page, 'Review');
  await expect(page.getByText('Character: Mira', {exact: true})).toBeVisible();
  await expect(page.getByText('Flooded at dawn', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Reopen', exact: true}).click();
  await page.locator('.review-card').filter({hasText: 'Location: North quay'}).getByRole('button', {name: 'Remove reference'}).click();
  await expect(page.getByText('Location: North quay', {exact: true})).toHaveCount(0);
  await closeTool(page);
  await prose(page).fill('Changed after backup');
  await openFile(page);
  await page.getByLabel('Import JSON backup').setInputFiles({name: 'restore.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(original))});
  await answerAsk(page);
  await expect(prose(page).locator('em')).toHaveText('Annotated manuscript');
  const restored = JSON.parse((await backup(page)).toString());
  expect(restored.books).toEqual(original.books);
  await page.reload();
  await prose(page).click();
  await openTool(page, 'Review');
  await expect(page.getByRole('button', {name: 'Reopen', exact: true})).toBeVisible();
  await expect(page.getByText('Location: North quay', {exact: true})).toBeVisible();
});

test('all page templates preserve rich text and personal templates restore paper geometry', async ({page}) => {
  await page.goto('/books');
  await prose(page).fill('Never erase this styled text');
  await prose(page).press('Control+a');
  await page.getByRole('button', {name: 'Bold', exact: true}).click();
  await openTool(page, 'Format');
  const storedContent = () => page.evaluate(() => JSON.parse(localStorage.getItem('bibliarch-books-v1')!).books[0].chapters[1].scenes[0].content);
  const original = await storedContent();
  expect(JSON.stringify(original)).toContain('Never erase this styled text');
  for (const template of ['book-front', 'chapter-title', 'prose', 'color-art', 'bnw-art', 'characters', 'afterword', 'back-cover']) {
    await page.locator('.template-grid').getByRole('button', {name: template.replaceAll('-', ' '), exact: true}).click();
    await expect(page.locator('.paper').nth(1)).toHaveClass(new RegExp(`template-${template}`));
    await expect.poll(storedContent).toEqual(original);
    if (template === 'color-art' || template === 'bnw-art') {
      await expect(page.locator('.paper').nth(1).getByRole('textbox', {name: 'Manuscript', includeHidden: true})).toHaveCount(0);
      await expect(page.locator('.paper').nth(1)).not.toContainText('Never erase this styled text');
    } else {
      await expect(prose(page).locator('strong')).toHaveText('Never erase this styled text');
    }
  }
  for (const [preset, width] of [['A4', 793.8], ['A5', 559.44], ['B6', 128 * 3.78], ['Letter', 816.102]] as const) {
    await page.getByLabel('Page preset').selectOption(preset);
    expect(await page.locator('.paper').nth(1).evaluate(e => parseFloat((e as HTMLElement).style.width))).toBeCloseTo(width, 1);
  }
  await page.getByLabel('Page preset').selectOption('Custom');
  await page.getByLabel('Width (mm)', {exact: true}).fill('160');
  await page.getByLabel('Height (mm)', {exact: true}).fill('230');
  await page.getByLabel('Header', {exact: true}).fill('Archive — {title}');
  await page.getByLabel('Mirrored print margins').check();
  await promptClick(page, 'Save personal template', ['Archive layout']);
  await page.getByLabel('Page preset').selectOption('A4');
  await page.locator('.template-grid button').filter({hasText: 'prose'}).click();
  await page.reload();
  await prose(page).click();
  await openTool(page, 'Format');
  await page.getByRole('button', {name: 'Apply Archive layout', exact: true}).click();
  await expect(page.getByLabel('Page preset')).toHaveValue('Custom');
  await expect(page.getByLabel('Width (mm)', {exact: true})).toHaveValue('160');
  await expect(page.getByLabel('Height (mm)', {exact: true})).toHaveValue('230');
  await expect(page.getByLabel('Mirrored print margins')).toBeChecked();
  await expect(page.locator('.paper').nth(1)).toHaveClass(/template-back-cover/);
  await expect(prose(page).locator('strong')).toHaveText('Never erase this styled text');
});

for (const kind of ['EPUB', 'PDF'] as const) test(`uploaded image and formatted manuscript export to real ${kind}`, async ({page}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  await page.goto('/books');
  await prose(page).fill('Exported manuscript sentinel');
  await prose(page).press('Control+a');
  await page.getByRole('button', {name: 'Bold', exact: true}).click();
  await openTool(page, 'Format');
  await page.getByRole('button', {name: 'Import / edit page image'}).click();
  await page.getByLabel('Import page image').setInputFiles({name: 'pixel.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64')});
  await expect(page.locator('.paper img')).toHaveAttribute('alt', 'pixel.png');
  await page.getByLabel('caption', {exact: true}).fill('Export image caption');
  await closeTool(page);
  const saved = JSON.parse((await backup(page)).toString());
  expect(saved.books[0].chapters[1].scenes[0].image.src).toMatch(/^data:image\/png;base64,/);
  await page.reload();
  await expect(page.locator('.paper img')).toHaveAttribute('alt', 'pixel.png');
  await openFile(page);
  const pending = page.waitForEvent('download', {timeout: 60000});
  await page.getByRole('button', {name: `Download ${kind}`, exact: true}).click();
  await expect(page.locator('.error[role="alert"]')).toHaveCount(0);
  const downloaded = await pending;
  if (kind === 'EPUB') {
  const epub = downloaded;
  expect(epub.suggestedFilename()).toBe('book.epub');
  const zip = await JSZip.loadAsync(await readFile((await epub.path())!));
  expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip');
  const html = (await Promise.all(Object.values(zip.files).filter(f => /\.xhtml$/.test(f.name)).map(f => f.async('string')))).join('\n');
  expect(html).toContain('Exported manuscript sentinel');
  expect(html).toContain('<strong>');
  expect(html).toContain('Export image caption');
  expect(Object.keys(zip.files).some(name => /\.(png|jpg|webp)$/.test(name))).toBe(true);
  } else {
  const pdf = downloaded;
  expect(pdf.suggestedFilename()).toBe('book.pdf');
  const bytes = await readFile((await pdf.path())!);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(1000);
  expect(bytes.toString('latin1')).toMatch(/\/Type\s*\/Page\b/);
  }
});

test('long document scroll stays inside canvas with fixed toolbar and usable mobile layout', async ({page}) => {
  await page.goto('/books');
  await prose(page).fill(Array.from({length: 160}, (_, i) => `Paragraph ${i}: The manuscript continues beyond the viewport.`).join('\n'));
  const toolbar = page.locator('.format-row');
  const before = await toolbar.boundingBox();
  const canvas = page.getByLabel('Document pages', {exact: true});
  await canvas.evaluate(e => { e.scrollTop = e.scrollHeight; });
  expect(await canvas.evaluate(e => e.scrollTop)).toBeGreaterThan(1000);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect((await toolbar.boundingBox())!.y).toBe(before!.y);
  await expect(page.getByRole('button', {name: 'Bold', exact: true})).toBeInViewport();
  await prose(page).press('Control+End');
  await page.keyboard.type(' LAST WORDS');
  await page.reload();
  await expect(prose(page)).toContainText('LAST WORDS');
  await page.setViewportSize({width: 390, height: 844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
