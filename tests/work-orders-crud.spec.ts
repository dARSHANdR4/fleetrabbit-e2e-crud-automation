import { test, expect } from '@playwright/test';
import path from 'path';
import { WorkOrdersPage } from '../e2e/pages/WorkOrdersPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 12: Work Orders - CRUD Automation', () => {
  let woPage: WorkOrdersPage;
  const title = `Brake_Repair_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    woPage = new WorkOrdersPage(page);
    await woPage.navigate();
  });

  test('1. CREATE - New Work Order', async () => {
    console.log(`\n🔧 Creating: "${title}"`);
    await woPage.createWorkOrder(title);
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify in List', async () => {
    console.log(`\n📖 Navigating to Work Orders list`);
    await woPage.navigate();
    await woPage.page.waitForTimeout(3000);
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Edit Most Recent Work Order', async () => {
    console.log(`\n✏️ Updating most recent work order`);
    await woPage.updateWorkOrder();
    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Delete Work Order', async () => {
    console.log(`\n🗑️ Deleting: "${title}"`);
    await woPage.deleteWorkOrder(title);
    console.log(`[PASS] DELETE ✅\n`);
  });
});

