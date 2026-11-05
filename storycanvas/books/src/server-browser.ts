import type {Browser} from 'playwright-core';

/**
 * Headless Chromium for the PDF and cover routes.
 * On Vercel (or any AWS Lambda-style host) there is no installed browser, so it uses the
 * serverless Chromium build from @sparticuz/chromium; everywhere else, Playwright's own.
 */
export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const [{default: chromium}, {chromium: pw}] = await Promise.all([import('@sparticuz/chromium'), import('playwright-core')]);
    return pw.launch({executablePath: await chromium.executablePath(), args: chromium.args, headless: true, timeout: 15000});
  }
  const {chromium} = await import('playwright');
  return chromium.launch({headless: true, timeout: 15000});
}
