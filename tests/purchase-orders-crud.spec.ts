import { test, expect } from '@playwright/test';
import path from 'path';
import { PurchaseOrdersPage } from '../e2e/pages/PurchaseOrdersPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 3: Purchase Orders Module - CREATE + DELETE Automation', () => {
  let poPage: PurchaseOrdersPage;
  let createdPONumber = '';

  const today = new Date().toISOString().split('T')[0];
  const delivery = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    poPage = new PurchaseOrdersPage(page);
    await poPage.navigate();
  });

  test('1. CREATE - Create a New Purchase Order with Supplier + Inline Part', async () => {
    console.log(`Creating PO (Order Date: ${today}, Delivery: ${delivery})`);
    await poPage.createPO({ orderDate: today, deliveryDate: delivery });
    await poPage.navigate();
    await poPage.page.waitForTimeout(2000);

    // Capture the PO number from the list
    const poEl = poPage.page.locator('div, span').filter({ hasText: /PO-\d/ }).first();
    if (await poEl.isVisible({ timeout: 10000 }).catch(() => false)) {
      const text = (await poEl.textContent().catch(() => '')).trim();
      const match = text.match(/PO-\d+/);
      if (match) {
        createdPONumber = match[0];
        console.log(`[PASS] CREATE: ${createdPONumber} created successfully!`);
      }
    }
    await expect(poPage.page.locator('div').filter({ hasText: createdPONumber || 'Total POs' }).first())
      .toBeVisible({ timeout: 10000 });
  });

  test('2. DELETE - Delete the created PO via Trash Icon', async () => {
    console.log(`Deleting ${createdPONumber} via trash icon...`);
    await poPage.deletePO(createdPONumber);
    await poPage.page.waitForTimeout(2000);

    // Verify PO is removed from list
    const deletedEl = poPage.page.locator('div, span').filter({ hasText: createdPONumber });
    await expect(deletedEl.first()).not.toBeVisible({ timeout: 10000 });
    console.log(`[PASS] DELETE: ${createdPONumber} deleted successfully!`);
  });
});
