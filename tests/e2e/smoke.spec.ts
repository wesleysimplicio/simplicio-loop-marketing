/*
 * Generic smoke test kept around as a template for consumer projects.
 * - When `BASE_URL` is set, exercises the real frontend.
 * - When `BASE_URL` is unset, becomes a no-op (skipped) so the starter's own CI
 *   does not require a running web server. The real product coverage lives in
 *   `cli.spec.ts`.
 */

import { expect, test } from '@playwright/test';

const baseUrl = process.env.BASE_URL;

test.describe('downstream smoke (skipped without BASE_URL)', () => {
  test.skip(!baseUrl, 'BASE_URL not set — skipping browser smoke');

  test('base url loads and captures evidence', async ({ page }, testInfo) => {
    await page.goto(baseUrl as string);
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    await page.screenshot({
      path: testInfo.outputPath('smoke-page.png'),
      fullPage: true,
    });
  });
});
