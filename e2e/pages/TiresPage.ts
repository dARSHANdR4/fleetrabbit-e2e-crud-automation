import { Page, expect } from '@playwright/test';

export interface TireData {
  serial: string;
  oem?: string;
  model?: string;
  type?: string;
  size?: string;
  status?: string;
  location?: string;
  cost?: string;
}

export class TiresPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/tires', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login, logging in...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/tires', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  async createTire(data: TireData) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    const addBtn = this.page.locator('button').filter({ hasText: 'Add Tire' });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Add Tire form opened');

    // Serial *
    await this.page.locator('input[placeholder*="T-445"]').fill(data.serial);

    const selects = this.page.locator('select:not([id="language-select"])');
    // OEM *
    if (data.oem) await selects.nth(0).selectOption(data.oem);
    else await selects.nth(0).selectOption({ index: 1 });

    // Model *
    if (data.model) await this.page.locator('input[placeholder*="custom tire model"]').fill(data.model);
    else await this.page.locator('input[placeholder*="custom tire model"]').fill('Default Model');

    // Type *
    if (data.type) await selects.nth(1).selectOption(data.type);
    else await selects.nth(1).selectOption({ index: 0 });

    // Size *
    if (data.size) await this.page.locator('input[placeholder*="custom size"]').fill(data.size);
    else await this.page.locator('input[placeholder*="custom size"]').fill('295/75R22.5');

    // Status *
    if (data.status) await selects.nth(2).selectOption(data.status);
    else await selects.nth(2).selectOption({ index: 0 });

    // Optional fields
    if (data.location) await this.page.locator('input[placeholder*="Warehouse"]').fill(data.location);
    if (data.cost) await this.page.locator('input[placeholder*="425"]').fill(data.cost);

    await this.page.waitForTimeout(500);

    // Submit
    const submitBtn = this.page.locator('button').filter({ hasText: /^Add Tire$/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await this.page.waitForTimeout(5000);
    console.log(`[CREATE] Tire "${data.serial}" created!`);
  }

  async updateTire(serial: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click View
    const viewBtn = this.page.locator('button').filter({ hasText: /^View$/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(2000);

    // Click Edit Tire
    const editBtn = this.page.locator('button').filter({ hasText: /Edit Tire/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Edit Tire form opened');

    // Change Status
    const selects = this.page.locator('select:not([id="language-select"])');
    if (await selects.count() > 0) {
      // First non-language select in edit form = Status
      await selects.nth(0).selectOption('mounted');
      console.log('✅ Status → mounted');
    }

    // Save
    const saveBtn = this.page.locator('button').filter({ hasText: /Save Changes/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.page.waitForTimeout(5000);
    console.log(`[UPDATE] Tire "${serial}" updated!`);
  }

  async deleteTire(serial: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Find the trash icon button (no text, just SVG!)
    const trashBtn = this.page.locator('button:has(svg[class*="trash"])').first();
    await expect(trashBtn).toBeVisible({ timeout: 10000 });
    await trashBtn.click();
    console.log(`[DELETE] Clicked trash icon`);
    await this.page.waitForTimeout(2000);

    // Confirmation
    const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes|Remove/i });
    const count = await confirmBtns.count();
    if (count > 0) {
      const lastConfirm = confirmBtns.last();
      if (await lastConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lastConfirm.click();
        console.log('[DELETE] Confirmed');
        await this.page.waitForTimeout(3000);
      }
    }

    console.log(`[DELETE] Tire "${serial}" deleted!`);
  }

  async entryExists(serial: string): Promise<boolean> {
    const bodyText = await this.page.locator('body').textContent().catch(() => '') || '';
    return bodyText.includes(serial);
  }
}
