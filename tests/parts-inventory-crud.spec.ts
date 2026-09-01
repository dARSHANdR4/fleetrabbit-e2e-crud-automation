import { test, expect } from '@playwright/test';
import path from 'path';
import { PartsInventoryPage } from '../e2e/pages/PartsInventoryPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 3: Parts & Inventory Module - Complete 4-Stage CRUD Automation', () => {
  let partsPage: PartsInventoryPage;
  
  const timestamp = Date.now();
  const initialPartName = `Auto_Part_${timestamp}`;
  const updatedPartName = `Auto_Part_UPDATED_${timestamp}`;
  const partNumber = `PN-${timestamp}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    partsPage = new PartsInventoryPage(page);
    await partsPage.navigate();
  });

  test('1. CREATE - Add New Part Item', async () => {
    console.log(`Creating initial part: ${initialPartName} (Part #: ${partNumber})`);
    await partsPage.createPart({
      name: initialPartName,
      number: partNumber,
      quantity: 50,
      cost: 25.50,
      manufacturer: 'Bosch',
    });

    // Verification: Search & Assert Part exists in table/grid
    await partsPage.searchPart(initialPartName);
    const partRow = partsPage.getPartRow(initialPartName);
    await expect(partRow).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] CREATE: Part "${initialPartName}" created successfully!`);
  });

  test('2. READ - Search & View Created Part Details', async () => {
    console.log(`Searching for part: ${initialPartName}`);
    await partsPage.searchPart(initialPartName);
    const partRow = partsPage.getPartRow(initialPartName);
    await expect(partRow).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ: Part "${initialPartName}" details retrieved successfully!`);
  });

  test('3. UPDATE - Modify Part Name & Details', async () => {
    console.log(`Updating part from "${initialPartName}" to "${updatedPartName}"`);
    await partsPage.updatePart(initialPartName, updatedPartName);

    // Verification: Search updated name & assert row displays updated name
    await partsPage.searchPart(updatedPartName);
    const updatedRow = partsPage.getPartRow(updatedPartName);
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] UPDATE: Part successfully updated to "${updatedPartName}"!`);
  });

  test('4. DELETE - Delete Updated Part & Verify Removal', async () => {
    console.log(`Deleting part: ${updatedPartName}`);
    await partsPage.deletePart(updatedPartName);

    // Verification: Search deleted name & assert row is no longer visible
    await partsPage.searchPart(updatedPartName);
    const deletedRow = partsPage.getPartRow(updatedPartName);
    await expect(deletedRow).not.toBeVisible({ timeout: 10000 });
    console.log(`[PASS] DELETE: Part "${updatedPartName}" deleted successfully!`);
  });
});
