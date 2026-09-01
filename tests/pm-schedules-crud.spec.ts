import { test, expect } from '@playwright/test';
import path from 'path';
import { PMSchedulesPage } from '../e2e/pages/PMSchedulesPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 10: PM Schedules - CRUD Automation', () => {
  let pmPage: PMSchedulesPage;
  const title = `Auto_PM_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    pmPage = new PMSchedulesPage(page);
    await pmPage.navigate();
  });

  test('1. CREATE - New PM Schedule', async () => {
    console.log(`\n🔧 Creating: "${title}"`);
    await pmPage.createSchedule(title);
    expect(await pmPage.entryExists(title)).toBeTruthy();
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify in List', async () => {
    console.log(`\n📖 Reading: "${title}"`);
    expect(await pmPage.entryExists(title)).toBeTruthy();
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Edit PM Schedule', async () => {
    console.log(`\n✏️ Updating: "${title}"`);
    await pmPage.updateSchedule(title);
    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Delete PM Schedule', async () => {
    console.log(`\n🗑️ Deleting: "${title}"`);
    await pmPage.deleteSchedule(title);
    console.log(`[PASS] DELETE ✅\n`);
  });
});
