import {expect, type Page} from '@playwright/test';
/** Answer the in-app confirm dialog (src/AskDialog.tsx) that replaced window.confirm. */
export async function answerAsk(page: Page, accept = true, expectText?: string) {
  const dialog = page.locator('dialog.ask-dialog[open]');
  await expect(dialog).toBeVisible();
  if (expectText) await expect(dialog).toContainText(expectText);
  await dialog.locator(accept ? '.ask-ok,.ask-danger' : '.ask-cancel').click();
  await expect(dialog).toBeHidden();
}
