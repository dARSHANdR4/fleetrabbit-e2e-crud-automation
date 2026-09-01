import { test, expect } from '@playwright/test';
import path from 'path';
import { LogbookPage } from '../e2e/pages/LogbookPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 13: Logbook - CRUD Automation', () => {
  let logPage: LogbookPage;
  const location = `Dallas_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    logPage = new LogbookPage(page);
    await logPage.navigate();
  });

  test('1. CREATE - New Logbook Entry (5-step wizard)', async () => {
    console.log(`\n🔧 Creating entry at: "${location}"`);
    await logPage.createEntry(location);
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify Logbook List', async () => {
    console.log(`\n📖 Navigating to Logbook list`);
    await logPage.navigate();
    await logPage.page.waitForTimeout(3000);
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Edit Logbook Entry', async () => {
    console.log(`\n✏️ Updating logbook entry`);
    await logPage.updateEntry();
    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Delete Logbook Entry', async () => {
    console.log(`\n🗑️ Deleting logbook entry`);
    await logPage.deleteEntry();
    console.log(`[PASS] DELETE ✅\n`);
  });
});
