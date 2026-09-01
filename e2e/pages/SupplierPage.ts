import { Page, Locator, expect } from '@playwright/test';

export class SupplierPage {
  readonly page: Page;
  readonly addSupplierButton: Locator;
  readonly searchInput: Locator;

  // Form Inputs in Add/Edit Supplier Dialog
  readonly supplierNameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addSupplierButton = page.locator('button').filter({ hasText: /Add Supplier/i }).first();
    this.searchInput = page.locator('input[placeholder*="Search"]').first();
    this.supplierNameInput = page.locator('input[placeholder*="Supplier company name"]').first();
  }

  /**
   * Ensure authenticated session & Navigate to Suppliers Page
   */
  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/parts/suppliers', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    // Auto-login if unauthenticated
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login/welcome, logging in as admin...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL(/(parts|suppliers|dashboard)/i, { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/parts/suppliers', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * CREATE: Fill out and submit new Supplier with valid 10-digit phone
   */
  async createSupplier(data: { name: string; email?: string; phone?: string; categories?: string }) {
    await expect(this.addSupplierButton).toBeVisible({ timeout: 15000 });
    await this.addSupplierButton.click();
    await this.page.waitForTimeout(1500);

    await this.supplierNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.supplierNameInput.fill(data.name);

    if (data.email) {
      const emailField = this.page.locator('input[type="email"]').first();
      if (await emailField.isVisible().catch(() => false)) await emailField.fill(data.email);
    }

    if (data.phone) {
      const phoneField = this.page.locator('input[type="tel"]').first();
      if (await phoneField.isVisible().catch(() => false)) {
        await phoneField.fill('');
        await phoneField.fill(data.phone);
      }
    }

    // Submit form using precise modal button locator
    const submitBtn = this.page.locator('button').filter({ hasText: /^Add Supplier$|^Save$/i }).last();
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click({ force: true });
    await this.page.waitForTimeout(2500);
  }

  /**
   * READ: Search for supplier in data table
   */
  async searchSupplier(name: string) {
    const search = this.page.locator('input[placeholder*="Search"]').first();
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill('');
    await search.fill(name);
    await this.page.waitForTimeout(1500);
  }

  /**
   * Get table row or card by supplier name
   */
  getSupplierRow(name: string): Locator {
    return this.page.locator('tr, div.grid > div, div.card, tbody tr').filter({ hasText: name });
  }

  /**
   * UPDATE: Edit supplier details
   */
  async updateSupplier(currentName: string, newName: string) {
    await this.searchSupplier(currentName);
    const row = this.getSupplierRow(currentName);
    await expect(row).toBeVisible({ timeout: 10000 });

    // Click Edit button or action menu
    const editBtn = row.locator('button, a').filter({ hasText: /Edit/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
    } else {
      const actionMenu = row.locator('button[aria-haspopup="menu"], button:has(svg)').last();
      await actionMenu.click();
      await this.page.locator('button, div[role="menuitem"]').filter({ hasText: /Edit/i }).first().click();
    }

    await this.page.waitForTimeout(1500);
    await this.supplierNameInput.fill(newName);
    
    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Update|Add Supplier/i }).last();
    await saveBtn.click({ force: true });
    await this.page.waitForTimeout(2500);
  }

  /**
   * DELETE: Delete supplier by name
   */
  async deleteSupplier(name: string) {
    await this.searchSupplier(name);
    const row = this.getSupplierRow(name);
    await expect(row).toBeVisible({ timeout: 10000 });

    const deleteBtn = row.locator('button, a').filter({ hasText: /Delete|Remove/i }).first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
    } else {
      const actionMenu = row.locator('button[aria-haspopup="menu"], button:has(svg)').last();
      await actionMenu.click();
      await this.page.locator('button, div[role="menuitem"]').filter({ hasText: /Delete|Remove/i }).first().click();
    }

    await this.page.waitForTimeout(1000);
    // Confirm delete modal if present
    const confirmBtn = this.page.locator('button').filter({ hasText: /Confirm|Delete|Yes/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await this.page.waitForTimeout(2000);
  }
}
