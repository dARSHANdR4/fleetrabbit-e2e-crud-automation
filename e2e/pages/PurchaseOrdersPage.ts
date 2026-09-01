import { Page, Locator, expect } from '@playwright/test';

export class PurchaseOrdersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to Purchase Orders page (ensures English locale)
   */
  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/parts/purchase-orders', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Session expired, logging in...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL(/(parts|purchase-orders|dashboard)/i, { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/parts/purchase-orders', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * CREATE: Add a new Purchase Order with supplier + inline part + line item
   */
  async createPO(data: {
    orderDate?: string;
    deliveryDate?: string;
  }) {
    // 1. Click "Create PO" button
    const createBtn = this.page.locator('button, a').filter({ hasText: /Create PO|SAS Oluştur/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();
    await this.page.waitForTimeout(2000);

    // 2. Select Supplier — native <select> populated async from /api/suppliers?all=true.
    // Wait for options to populate BEFORE selecting; pressing keys on an empty select
    // (the old 'a' + Enter approach) is a silent no-op that left the PO with no supplier.
    const supplierSelect = this.page.locator('label').filter({ hasText: /Supplier/i }).locator('..').locator('select');
    await expect(supplierSelect).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => supplierSelect.locator('option').count(), { timeout: 20000 })
      .toBeGreaterThan(1);
    const supplierCount = await supplierSelect.locator('option').count();
    console.log(`✅ Supplier dropdown populated (${supplierCount} options)`);
    await supplierSelect.selectOption({ index: 1 });
    await this.page.waitForTimeout(500);
    console.log('✅ Supplier selected');

    // 3. Fill Order Date & Expected Delivery Date
    const dateInputs = this.page.locator('input[type="date"]');
    if (await dateInputs.nth(0).isVisible().catch(() => false)) {
      if (data.orderDate) await dateInputs.nth(0).fill(data.orderDate);
    }
    if (await dateInputs.nth(1).isVisible().catch(() => false)) {
      if (data.deliveryDate) await dateInputs.nth(1).fill(data.deliveryDate);
    }

    // 4. Add Line Item — click "Add Item" button
    const addItemBtn = this.page.locator('button').filter({ hasText: /Add Item|Öğe Ekle/i }).first();
    if (await addItemBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addItemBtn.click();
      await this.page.waitForTimeout(1500);

      // 4a. Select "+ Add new part..." from the part dropdown (4th select on page)
      const partSelect = this.page.locator('select').filter({ has: this.page.locator('option') }).last();
      if (await partSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await partSelect.selectOption('__add_new__');
        await this.page.waitForTimeout(1500);

        // 4b. Fill inline part creation form
        const partNameInput = this.page.locator('input[placeholder*="Engine Filter"]').first();
        if (await partNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          const dynamicPartName = `Auto_PO_Part_${Date.now()}`;
          await partNameInput.fill(dynamicPartName);
          console.log(`  [Inline Part] Name: ${dynamicPartName}`);

          // Part Number
          const partNumInput = this.page.locator('input[placeholder*="EF-1234"]').first();
          if (await partNumInput.isVisible().catch(() => false)) {
            await partNumInput.fill(`PN-${Date.now()}`);
          }

          // Category
          const categoryInput = this.page.locator('input[placeholder*="Engine, Tires"]').first();
          if (await categoryInput.isVisible().catch(() => false)) {
            await categoryInput.fill('General');
          }

          // Unit Cost (NGN) — required, must be > 0
          const unitCostInput = this.page.locator('label').filter({ hasText: /Unit Cost/i }).locator('..').locator('input[type="number"]');
          if (await unitCostInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await unitCostInput.fill('50');
          }

          // Current Stock
          const stockInput = this.page.locator('label').filter({ hasText: /Current Stock/i }).locator('..').locator('input[type="number"]');
          if (await stockInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await stockInput.fill('10');
          }

          // Click "Add" button to confirm inline part creation (use exact match to avoid "Add Item")
          const addPartBtn = this.page.getByRole('button', { name: 'Add', exact: true });
          if (await addPartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await addPartBtn.click();
            // handleAddNewPart POSTs to /api/parts asynchronously; block until the
            // "Part added successfully!" toast fires so the line item's part_id is
            // actually set before we submit (otherwise submit fails "Add at least one part").
            const partToast = this.page
              .locator('[class*="animate-slide-in"]')
              .filter({ hasText: 'Part added successfully' })
              .first();
            await expect(partToast).toBeVisible({ timeout: 15000 });
            console.log('  [Inline Part] Part added successfully!');
          } else {
            console.log('  [Inline Part] WARNING: "Add" button not found!');
          }
        }
      }

      // 4c. Fill Qty
      const qtyInput = this.page.locator('input[placeholder="Qty"]').first();
      if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qtyInput.fill('1');
      }

      // 4d. Fill Cost
      const costInput = this.page.locator('input[placeholder="Cost"]').first();
      if (await costInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await costInput.fill('100');
      }
    }

    // 5. Click "Create PO" submit (the modal's own submit, not the top "open modal" button).
    // Wait for it to be enabled, then block on the "Purchase order created!" toast.
    const submitBtn = this.page.locator('button').filter({ hasText: /Create PO|SAS Oluştur/i }).last();
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    console.log(`Clicking submit: "${(await submitBtn.textContent().catch(() => '')).trim()}"`);
    await submitBtn.click();
    const createdToast = this.page
      .locator('[class*="animate-slide-in"]')
      .filter({ hasText: 'Purchase order created' })
      .first();
    await expect(createdToast).toBeVisible({ timeout: 15000 });
    console.log('[CREATE] Purchase order created (toast confirmed)');
    await this.page.waitForTimeout(1000);

    // 6. Ensure clean return to the PO list view
    await this.navigate();
  }

  /**
   * DELETE: Click the trash icon (lucide-trash2) for the given PO and confirm
   */
  async deletePO(poNumber: string) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // The PO list is paginated (20/page) and filterable, so locating a specific
    // card by scanning the whole DOM is unreliable. Use the search box to isolate
    // our PO (same pattern as the compliance module), then the delete button is unique.
    const searchInput = this.page.getByPlaceholder(/Search by PO number or supplier/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(poNumber);
    await this.page.waitForTimeout(3000); // let the 1s debounce + refetch settle (buffer)

    // Delete button: grid view = trash icon (lucide Trash2), list view = "Delete" text.
    const trashBtn = this.page.locator('button:has(svg[class*="trash"])').first();
    const deleteTextBtn = this.page.locator('button').filter({ hasText: /^Delete$/i }).first();

    let deleteBtn;
    if (await trashBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      deleteBtn = trashBtn;
    } else if (await deleteTextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      deleteBtn = deleteTextBtn;
    } else {
      throw new Error(`No delete button found for ${poNumber}`);
    }

    await deleteBtn.click();
    await this.page.waitForTimeout(1500); // buffer: let the confirm modal mount

    // Confirm deletion modal if present
    const confirmBtn = this.page.locator('button').filter({ hasText: /Confirm|Delete|Yes|Remove/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
      await this.page.waitForTimeout(3000); // buffer: let the delete process before re-navigating
    }

    console.log(`[DELETE] ${poNumber} deleted!`);
  }
}
