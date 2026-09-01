import { Page, Locator, expect } from '@playwright/test';

export class PartsInventoryPage {
  readonly page: Page;
  readonly addPartButton: Locator;
  readonly searchInput: Locator;

  // Form Inputs inside Add/Edit Part Dialog
  readonly partNameInput: Locator;
  readonly partNumberInput: Locator;
  readonly quantityInput: Locator;
  readonly itemCostInput: Locator;
  readonly manufacturerInput: Locator;
  readonly locationInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addPartButton = page.locator('button').filter({ hasText: /Add Part/i }).first();
    this.searchInput = page.locator('input[placeholder*="Search parts"]').first();

    // Modal inputs
    this.partNameInput = page.locator('input[placeholder*="Enter Part Name"]').first();
    this.partNumberInput = page.locator('input[placeholder*="Enter Part Number"]').first();
    this.quantityInput = page.locator('input[placeholder*="Qty"]').first();
    this.itemCostInput = page.locator('input[placeholder*="Enter Item Cost"]').first();
    this.manufacturerInput = page.locator('input[placeholder*="Enter Manufacturer Name"]').first();
    this.locationInput = page.locator('input[placeholder*="Enter Stored Location"]').first();

    // Modal submit button
    this.submitButton = page.locator('div[role="dialog"] button, .modal button, form button')
      .filter({ hasText: /^Add Part$|^Save$|^Update$/i })
      .last();
  }

  /**
   * Navigate to Parts Inventory page with auto-login fallback
   */
  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/parts', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Session expired, logging in...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL(/(parts|dashboard)/i, { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/parts', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * CREATE: Add new part item
   */
  async createPart(data: { name: string; number?: string; quantity?: number; cost?: number; manufacturer?: string }) {
    await expect(this.addPartButton).toBeVisible({ timeout: 15000 });
    await this.addPartButton.click();
    await this.page.waitForTimeout(1500);

    await this.partNameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.partNameInput.fill(data.name);

    if (data.number && await this.partNumberInput.isVisible().catch(() => false)) {
      await this.partNumberInput.fill(data.number);
    }

    if (data.quantity !== undefined && await this.quantityInput.isVisible().catch(() => false)) {
      await this.quantityInput.fill(data.quantity.toString());
    }

    if (data.cost !== undefined && await this.itemCostInput.isVisible().catch(() => false)) {
      await this.itemCostInput.fill(data.cost.toString());
    }

    if (data.manufacturer && await this.manufacturerInput.isVisible().catch(() => false)) {
      await this.manufacturerInput.fill(data.manufacturer);
    }

    const saveBtn = this.page.locator('button').filter({ hasText: /^Add Part$|^Save$/i }).last();
    await saveBtn.click({ force: true });
    await this.page.waitForTimeout(2500);
  }

  /**
   * READ: Search for part by name
   */
  async searchPart(name: string) {
    const search = this.page.locator('input[placeholder*="Search"]').first();
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill('');
    await search.fill(name);
    await this.page.waitForTimeout(1500);
  }

  /**
   * Locate part row or card in grid/table
   */
  getPartRow(name: string): Locator {
    return this.page.locator('tr, div.grid > div, div.card, tbody tr').filter({ hasText: name });
  }

  /**
   * UPDATE: Edit part details
   */
  async updatePart(currentName: string, newName: string) {
    await this.searchPart(currentName);
    const row = this.getPartRow(currentName);
    await expect(row).toBeVisible({ timeout: 10000 });

    const editBtn = row.locator('button, a').filter({ hasText: /Edit/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
    } else {
      const actionMenu = row.locator('button[aria-haspopup="menu"], button:has(svg)').last();
      await actionMenu.click();
      await this.page.locator('button, div[role="menuitem"]').filter({ hasText: /Edit/i }).first().click();
    }

    await this.page.waitForTimeout(1500);
    await this.partNameInput.fill(newName);

    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Update|Add Part/i }).last();
    await saveBtn.click({ force: true });
    await this.page.waitForTimeout(2500);
  }

  /**
   * DELETE: Delete part item
   */
  async deletePart(name: string) {
    await this.searchPart(name);
    const row = this.getPartRow(name);
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
    const confirmBtn = this.page.locator('button').filter({ hasText: /Confirm|Delete|Yes/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await this.page.waitForTimeout(2000);
  }
}
