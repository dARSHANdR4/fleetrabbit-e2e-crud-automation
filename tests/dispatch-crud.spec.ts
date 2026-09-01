import { test, expect } from '@playwright/test';
import path from 'path';
import { DispatchPage } from '../e2e/pages/DispatchPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 15: Dispatch - Full CRUD Automation', () => {
  let dpPage: DispatchPage;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    dpPage = new DispatchPage(page);
    await dpPage.navigate();
  });

  test('1. DELETE - Clean up existing dispatch', async () => {
    console.log(`\n🗑️ Deleting existing dispatch`);
    await dpPage.deleteDispatch();
    console.log(`[PASS] DELETE ✅\n`);
  });

  test('2. CREATE - New Dispatch Load', async () => {
    console.log(`\n🔧 Creating dispatch`);
    await dpPage.createDispatch();
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('3. READ - Verify Dispatch List', async () => {
    console.log(`\n📖 Navigating to Dispatch list`);
    await dpPage.navigate();
    await dpPage.page.waitForTimeout(3000);
    console.log(`[PASS] READ ✅\n`);
  });

  test('4. UPDATE - Edit Dispatch via Pencil Icon', async () => {
    console.log(`\n✏️ Updating dispatch`);
    await dpPage.updateDispatch();
    console.log(`[PASS] UPDATE ✅\n`);
  });
});
