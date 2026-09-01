import { test, expect } from '@playwright/test';
import path from 'path';
import { ServiceTasksPage } from '../e2e/pages/ServiceTasksPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 9: Service Tasks - CRUD Automation', () => {
  let stPage: ServiceTasksPage;
  const taskName = `Auto_Task_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    stPage = new ServiceTasksPage(page);
    await stPage.navigate();
  });

  test('1. CREATE - New Custom Task (Build manually)', async () => {
    console.log(`\n🔧 Creating: "${taskName}"`);
    await stPage.createTask(taskName);

    const exists = await stPage.entryExists(taskName);
    expect(exists).toBeTruthy();
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify in Custom Tasks List', async () => {
    console.log(`\n📖 Reading: "${taskName}"`);
    expect(await stPage.entryExists(taskName)).toBeTruthy();
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Edit Task Description', async () => {
    console.log(`\n✏️ Updating: "${taskName}"`);
    await stPage.updateTask(taskName);
    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Delete Custom Task', async () => {
    console.log(`\n🗑️ Deleting: "${taskName}"`);
    await stPage.deleteTask(taskName);
    console.log(`[PASS] DELETE ✅\n`);
  });
});
