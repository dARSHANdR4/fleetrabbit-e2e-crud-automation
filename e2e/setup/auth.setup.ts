import { test as setup } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

/**
 * Auth Setup — runs once before all module tests, logs in via the admin
 * login route and saves the authenticated storage state so every module
 * test reuses the same session instead of logging in repeatedly.
 *
 * Credentials are read from environment variables — copy .env.example to
 * .env and fill in a staging test account before running the suite.
 */
setup('authenticate as admin', async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('Set TEST_EMAIL and TEST_PASSWORD (see .env.example) before running the suite.');
  }

  console.log('🚀 [AUTH] Direct login via /en/login/admin...');
  await page.goto('/en/login/admin', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  await page.getByRole('button', { name: /Sign In|Login/i }).first().click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log(`✅ [AUTH] Logged in! URL: ${page.url()}`);

  await page.context().storageState({ path: authFile });
  console.log(`💾 [AUTH] Session saved to ${authFile}`);
});
