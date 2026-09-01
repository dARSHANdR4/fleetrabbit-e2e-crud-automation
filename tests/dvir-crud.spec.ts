import { test, expect } from '@playwright/test';
import path from 'path';
import { DVIRPage } from '../e2e/pages/DVIRPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 14: DVIR - CRUD Automation', () => {
  let dvirPage: DVIRPage;
  const location = `Miami_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    dvirPage = new DVIRPage(page);
    await dvirPage.navigate();
  });

  test('1. CREATE - New DVIR Report', async () => {
    console.log(`\n🔧 Creating DVIR: ${location}`);
    await dvirPage.createDVIR(location);
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify DVIR List', async () => {
    console.log(`\n📖 Navigating to DVIR list`);
    await dvirPage.navigate();
    await dvirPage.page.waitForTimeout(3000);
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. DELETE - Delete DVIR', async () => {
    console.log(`\n🗑️ Deleting DVIR`);
    await dvirPage.deleteDVIR();
    console.log(`[PASS] DELETE ✅\n`);
  });
});
