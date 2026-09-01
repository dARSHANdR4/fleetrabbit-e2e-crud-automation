import { test, expect } from '@playwright/test';
import path from 'path';
import { SupplierPage } from '../e2e/pages/SupplierPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 3: Parts & Inventory Module - Complete 4-Stage Supplier CRUD Automation', () => {
  let supplierPage: SupplierPage;
  
  // Dynamic unique test data generation per run
  const timestamp = Date.now();
  const initialSupplierName = `Auto_Supplier_${timestamp}`;
  const updatedSupplierName = `Auto_Supplier_UPDATED_${timestamp}`;
  const uniqueEmail = `supplier_${timestamp}@fleetrabbit.com`;
  // Generate EXACT 10-digit phone number (555 + 7 random digits) to satisfy US phone validation format
  const uniquePhone = `555${Math.floor(1000000 + Math.random() * 9000000)}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    supplierPage = new SupplierPage(page);
    await supplierPage.navigate();
  });

  test('1. CREATE - Add New Supplier with Dynamic 10-Digit Credentials', async () => {
    console.log(`Creating initial supplier: ${initialSupplierName} (Phone: ${uniquePhone})`);
    await supplierPage.createSupplier({
      name: initialSupplierName,
      email: uniqueEmail,
      phone: uniquePhone,
    });

    // Verification: Search & Assert Supplier exists in table
    await supplierPage.searchSupplier(initialSupplierName);
    const supplierRow = supplierPage.getSupplierRow(initialSupplierName);
    await expect(supplierRow).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] CREATE: Supplier "${initialSupplierName}" created successfully!`);
  });

  test('2. READ - Search & View Created Supplier Details', async () => {
    console.log(`Searching for supplier: ${initialSupplierName}`);
    await supplierPage.searchSupplier(initialSupplierName);
    const supplierRow = supplierPage.getSupplierRow(initialSupplierName);
    await expect(supplierRow).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ: Supplier "${initialSupplierName}" details retrieved successfully!`);
  });

  test('3. UPDATE - Modify Supplier Name & Details', async () => {
    console.log(`Updating supplier from "${initialSupplierName}" to "${updatedSupplierName}"`);
    await supplierPage.updateSupplier(initialSupplierName, updatedSupplierName);

    // Verification: Search updated name & assert row displays updated name
    await supplierPage.searchSupplier(updatedSupplierName);
    const updatedRow = supplierPage.getSupplierRow(updatedSupplierName);
    await expect(updatedRow).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] UPDATE: Supplier successfully updated to "${updatedSupplierName}"!`);
  });

  test('4. DELETE - Delete Updated Supplier & Verify Removal', async () => {
    console.log(`Deleting supplier: ${updatedSupplierName}`);
    await supplierPage.deleteSupplier(updatedSupplierName);

    // Verification: Search deleted name & assert row is no longer visible
    await supplierPage.searchSupplier(updatedSupplierName);
    const deletedRow = supplierPage.getSupplierRow(updatedSupplierName);
    await expect(deletedRow).not.toBeVisible({ timeout: 10000 });
    console.log(`[PASS] DELETE: Supplier "${updatedSupplierName}" deleted successfully!`);
  });
});
