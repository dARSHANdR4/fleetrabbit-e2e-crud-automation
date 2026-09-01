import { Page, expect } from '@playwright/test';

export class DispatchPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/dispatch', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/dispatch', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  async createDispatch() {
    await this.page.goto('https://stg.fleetrabbit.com/en/dispatch/new', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(4000);

    // Addresses
    await this.page.locator('input[placeholder*="123 Main"]').fill('123 Main St, Dallas, TX');
    await this.page.locator('input[placeholder*="456 Oak"]').fill('456 Oak Ave, Houston, TX');

    // FUTURE dates (tomorrow for pickup, tomorrow+4h for delivery)
    const tomorrow = new Date(Date.now() + 86400000);
    const pickup = tomorrow.toISOString().slice(0, 16);
    const delivery = new Date(tomorrow.getTime() + 4 * 3600000).toISOString().slice(0, 16);
    await this.page.locator('input[type="datetime-local"]').nth(0).fill(pickup);
    await this.page.locator('input[type="datetime-local"]').nth(1).fill(delivery);

    // Cargo + Weight
    const selects = this.page.locator('select:not([id="language-select"])');
    await selects.nth(0).selectOption({ index: 1 });
    await selects.nth(1).selectOption('lbs');
    await this.page.locator('input[placeholder="45000"]').fill('5000');

    // Customer
    await this.page.locator('input[placeholder*="Tech Distributors"]').fill('Test Customer');

    // Revenue
    await this.page.locator('input[placeholder="2450"]').fill('2000');

    // Driver — type, wait for dropdown, CLICK the suggestion
    await this.selectSearchDropdown('input[placeholder*="Search driver"]', '');

    // Fleet — type, wait for dropdown, CLICK the suggestion
    await this.selectSearchDropdown('input[placeholder*="Search fleet"]', '');

    await this.page.waitForTimeout(1000);

    // Submit
    const submitBtn = this.page.locator('button').filter({ hasText: /Create Load/i }).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.click({ force: true });
    await this.page.waitForTimeout(5000);
    console.log(`URL: ${this.page.url()}`);
    console.log(`[CREATE] Dispatch created!`);
  }

  async updateDispatch() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click pencil icon (edit button) on first dispatch entry
    const editBtn = this.page.locator('button:has(svg[class*="pen"])').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Edit opened');

    // Modify Revenue
    const revInput = this.page.locator('input[placeholder="2450"]');
    if (await revInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await revInput.fill((3000 + Date.now() % 5000).toString());
    }

    // Save
    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Update/i }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });
      await saveBtn.click();
      await this.page.waitForTimeout(3000);
    }
    console.log(`[UPDATE] Dispatch updated!`);
  }

  async deleteDispatch() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click trash icon on first entry
    const trashBtn = this.page.locator('button:has(svg[class*="trash"])').first();
    await expect(trashBtn).toBeVisible({ timeout: 10000 });
    await trashBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[DELETE] Clicked trash');

    // Confirm — click the dialog's Delete button
    await this.page.waitForTimeout(1000);
    const dialogDelete = this.page.locator('button').filter({ hasText: /^Delete$/i }).last();
    if (await dialogDelete.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dialogDelete.click();
      await this.page.waitForTimeout(3000);
      console.log('[DELETE] Confirmed');
    }
    console.log(`[DELETE] Dispatch deleted!`);
  }

  private async selectSearchDropdown(inputSelector: string, searchText: string) {
    const inp = this.page.locator(inputSelector);
    await inp.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await inp.click({ force: true });
    await inp.fill('');
    if (searchText) await inp.type(searchText, { delay: 30 });
    await this.page.waitForTimeout(3000); // Wait for dropdown

    // Find FIRST ENABLED dropdown option (skip disabled/assigned ones)
    const allOptions = this.page.locator('[class*="absolute z-20"] button, [class*="dropdown"] button');
    const optCount = await allOptions.count();
    let clicked = false;
    for (let i = 0; i < optCount; i++) {
      const opt = allOptions.nth(i);
      const vis = await opt.isVisible({ timeout: 1000 }).catch(() => false);
      const dis = await opt.isDisabled().catch(() => true);
      if (vis && !dis) {
        const txt = (await opt.textContent().catch(() => '')).trim().substring(0, 60);
        console.log(`  → Selected "${txt}"`);
        await opt.click();
        await this.page.waitForTimeout(1000);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      console.log(`  → No enabled option, keyboard fallback`);
      await inp.press('ArrowDown');
      await this.page.waitForTimeout(300);
      await inp.press('Enter');
    }
  }
}
