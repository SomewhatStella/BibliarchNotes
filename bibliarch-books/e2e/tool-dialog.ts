import type {Page} from '@playwright/test';

export async function openTool(page: Page, menuName: 'Review' | 'Format') {
  const menu = page.locator('details.menu').filter({has: page.locator('summary', {hasText: new RegExp(`^${menuName}$`)})});
  if (!(await menu.evaluate(e => (e as HTMLDetailsElement).open))) await menu.locator('summary').click();
  await page.getByRole('button', {name: menuName === 'Review' ? 'Comments, changes and snapshots' : 'Page styles and typography', exact: true}).click();
}
export async function closeTool(page: Page) {
  await page.getByRole('button', {name: /^Close (dialog|settings)$/}).click();
}
