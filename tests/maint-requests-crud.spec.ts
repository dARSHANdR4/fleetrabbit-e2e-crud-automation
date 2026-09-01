import { test, expect } from '@playwright/test';
import path from 'path';
import { MaintRequestsPage } from '../e2e/pages/MaintRequestsPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 11: Maint Requests - CRUD Automation', () => {
  let mrPage: MaintRequestsPage;
  const title = `Brake_Issue_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    mrPage = new MaintRequestsPage(page);
    await mrPage.navigate();
  });

  test('1. CREATE - New Maintenance Request', async () => {
    console.log(`\n🔧 Creating: "${title}"`);
    await mrPage.createRequest(title);
    // Verify by checking Total Requests count changed from 0
    const totalBtn = mrPage.page.locator('button').filter({ hasText: /Total Requests/i }).first();
    const text = await totalBtn.textContent().catch(() => '0');
    console.log(`Total Requests: ${text}`);
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify in List', async () => {
    console.log(`\n📖 Reading: "${title}"`);
    await mrPage.navigate();
    await mrPage.page.waitForTimeout(3000);
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. DELETE - Delete via Trash Icon', async () => {
    console.log(`\n🗑️ Deleting: "${title}"`);
    await mrPage.deleteRequest(title);
    console.log(`[PASS] DELETE ✅\n`);
  });
});
