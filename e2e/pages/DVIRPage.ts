import { Page, expect } from '@playwright/test';

export class DVIRPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/dvir', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/dvir', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  async createDVIR(location: string) {
    await this.page.goto('https://stg.fleetrabbit.com/en/dvir/new', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(4000);

    const selects = this.page.locator('select:not([id="language-select"])');

    // Driver * — try drivers in order until one has a fleet assigned
    // (some drivers on staging have zero vehicles assigned, which leaves
    // the Fleet dropdown permanently empty with no error shown)
    const driverCount = await selects.nth(0).locator('option').count();
    let fleetPopulated = false;
    for (let i = 1; i < driverCount && !fleetPopulated; i++) {
      await selects.nth(0).selectOption({ index: i });
      await this.page.waitForTimeout(500);

      const fleetOptionCount = await selects.nth(1).locator('option').count();
      if (fleetOptionCount > 1) {
        fleetPopulated = true;
      } else {
        console.log(`⚠️ Driver at index ${i} has no fleet assigned, trying next driver...`);
      }
    }
    if (!fleetPopulated) {
      throw new Error('No driver with an assigned fleet found — cannot proceed with DVIR creation');
    }

    // Fleet * (now populated after driver selection)
    await selects.nth(1).selectOption({ index: 1 });
    await this.page.waitForTimeout(300);

    // Inspection Type *
    await selects.nth(2).selectOption({ index: 0 });

    // Date & Time
    const dtInput = this.page.locator('input[type="datetime-local"]').first();
    if (await dtInput.count() > 0) {
      const now = new Date();
      const formatted = now.toISOString().slice(0, 16);
      await dtInput.fill(formatted);
    }

    // Odometer
    await this.page.locator('input[placeholder*="Current mileage"]').fill(`${50000 + Date.now() % 10000}`);

    // Location — fill and select from autocomplete
    const cityInput = this.page.locator('input[placeholder*="City (e.g."]');
    await cityInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    await cityInput.click();
    await cityInput.fill('Miami');
    await this.page.waitForTimeout(2000); // Wait for autocomplete
    // Press ArrowDown + Enter to select first suggestion if dropdown appears
    const autocomplete = this.page.locator('[class*="pac-container"], [class*="autocomplete"], [class*="suggestions"]').first();
    if (await autocomplete.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cityInput.press('ArrowDown');
      await this.page.waitForTimeout(300);
      await cityInput.press('Enter');
      console.log('✅ Autocomplete selected');
    }

    const stateInput = this.page.locator('input[placeholder*="State/Region"]');
    await stateInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    await stateInput.fill('TX');

    // Click "Pass All" if available
    const passAll = this.page.locator('button').filter({ hasText: /Pass All/i }).first();
    if (await passAll.isVisible({ timeout: 2000 }).catch(() => false)) {
      await passAll.click();
      await this.page.waitForTimeout(500);
    }

    // Driver Signature
    await this.page.locator('input[placeholder*="signature"]').fill('EV Driver');

    await this.page.waitForTimeout(500);

    // Submit — scroll to button and force click
    const submitBtn = this.page.locator('button').filter({ hasText: /Submit DVIR/i }).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    console.log(`Submitting...`);
    await submitBtn.click({ force: true });
    await this.page.waitForTimeout(5000);
    console.log(`URL after submit: ${this.page.url()}`);
    console.log(`[CREATE] DVIR created!`);
  }

  async deleteDVIR() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    const deleteBtn = this.page.locator('button').filter({ hasText: 'Delete' }).first();
    if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteBtn.click();
      await this.page.waitForTimeout(2000);
      console.log('[DELETE] Clicked Delete');
      const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes/i });
      if (await confirmBtns.count() > 1) { await confirmBtns.last().click(); await this.page.waitForTimeout(3000); }
    }
    console.log(`[DELETE] DVIR deleted!`);
  }
}
