import { Page, expect } from '@playwright/test';

export interface FuelData {
  date?: string;
  driver?: string;
  fuelType?: string;
  paymentMethod?: string;
  location: string;
  gallons: string;
  pricePerGallon: string;
  currentOdometer: string;
  unit?: string;
  receiptNumber?: string;
  notes?: string;
}

export class FuelPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/fuel', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login, logging in...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/fuel', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * CREATE a new fuel entry
   */
  async createFuelEntry(data: FuelData) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // Click Add Fuel Entry
    const addBtn = this.page.locator('button').filter({ hasText: 'Add Fuel Entry' });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Add Fuel Entry form opened');

    // Date
    if (data.date) {
      await this.page.locator('input[type="date"]').first().fill(data.date);
    } else {
      await this.page.locator('input[type="date"]').first().fill(new Date().toISOString().split('T')[0]);
    }

    // Driver * — the driver options are fetched asynchronously from /api/drivers.
    // Wait for the dropdown to populate with multiple entries BEFORE selecting;
    // interacting with an empty select is a silent no-op (that's the bug that
    // previously left the fuel entry with no driver and no vehicle).
    const selects = this.page.locator('select:not([id="language-select"])');
    const driverSelect = selects.nth(0);
    await expect(driverSelect).toBeVisible({ timeout: 15000 });

    await expect
      .poll(async () => driverSelect.locator('option').count(), { timeout: 20000 })
      .toBeGreaterThan(1);
    const driverCount = await driverSelect.locator('option').count();
    console.log(`✅ Driver dropdown populated (${driverCount} options)`);

    // Some drivers have no assigned vehicle, which leaves the vehicle dropdown
    // disabled/empty. Walk the drivers until we find one whose vehicle dropdown
    // actually populates, so the E2E create covers both driver and vehicle.
    let fleetReady = false;
    for (let i = 1; i < driverCount && !fleetReady; i++) {
      await driverSelect.selectOption({ index: i });
      await this.page.waitForTimeout(1200); // let the vehicle dropdown re-filter

      const fs = selects.nth(1);
      const disabled = await fs.isDisabled().catch(() => true);
      const optCount = await fs.locator('option').count();
      console.log(`Driver #${i}: fleet disabled=${disabled}, options=${optCount}`);
      fleetReady = !disabled && optCount > 1;
    }

    if (!fleetReady) {
      console.log('⚠️ No driver with an assigned vehicle found — keeping first driver');
      await driverSelect.selectOption({ index: 1 });
    } else {
      console.log('✅ Driver selected');
    }

    // Vehicle/Fleet — select first available if the chosen driver has one.
    const fleetSelect = selects.nth(1);
    const fleetDisabled = await fleetSelect.isDisabled().catch(() => true);
    const fleetOptionCount = await fleetSelect.locator('option').count();
    if (!fleetDisabled && fleetOptionCount > 1) {
      await fleetSelect.selectOption({ index: 1 });
      await this.page.waitForTimeout(500);
      console.log('✅ Fleet selected');
    } else {
      console.log('⚠️ Fleet disabled/empty — proceeding without fleet');
    }

    // Fuel Type
    if (data.fuelType) {
      await selects.nth(2).selectOption(data.fuelType);
    }
    await this.page.waitForTimeout(200);

    // Payment Method
    if (data.paymentMethod) {
      await selects.nth(3).selectOption(data.paymentMethod);
    }

    // Fuel Station Location
    await this.page.locator('input[placeholder*="Houston"]').fill(data.location);

    // Gallons
    await this.page.locator('input[placeholder="125.50"]').fill(data.gallons);

    // Price per Gallon
    await this.page.locator('input[placeholder="3.30"]').fill(data.pricePerGallon);

    // Current Odometer — must be > Previous Odometer (auto-filled). The previous
    // reading arrives from an async fetch (fetchLatestOdometer) that fires on BOTH
    // driver and vehicle selection, and its completion handler RESETS the current
    // odometer to '' (when vehicle-current <= latest fuel log). Filling the current
    // field before that fetch settles is a race that leaves it empty at submit →
    // "Please enter valid odometer". So: buffer for the fetch to settle, fill, then
    // verify the value survived and re-fill once if a late fetch cleared it.
    const prevOdometerInput = this.page.locator('input[placeholder="Last reading"]');
    const currentInput = this.page.locator('input[placeholder="Current reading"]');

    await this.page.waitForTimeout(2500); // let fetchLatestOdometer settle (two may be in flight)

    const prevVal = await prevOdometerInput.inputValue().catch(() => '0');
    const prevOdometer = parseInt(prevVal) || 0;
    const currentOdometer = String(Math.max(parseInt(data.currentOdometer) || 0, prevOdometer + 1000));

    await currentInput.fill(currentOdometer);
    await this.page.waitForTimeout(1000);
    if ((await currentInput.inputValue().catch(() => '')) !== currentOdometer) {
      console.log('⚠️ Current odometer reset by async fetch — re-filling');
      await currentInput.fill(currentOdometer);
      await this.page.waitForTimeout(1000);
    }
    console.log(`Odometer: ${currentOdometer} (prev was ${prevOdometer})`);

    // Unit
    if (data.unit) {
      await selects.nth(4).selectOption(data.unit);
    }

    // Receipt Number
    if (data.receiptNumber) {
      await this.page.locator('input[placeholder*="receipt number"]').fill(data.receiptNumber);
    }

    // Notes
    if (data.notes) {
      await this.page.locator('textarea').first().fill(data.notes);
    }

    await this.page.waitForTimeout(500);

    // Submit — block on the success toast so we actually confirm creation (previously
    // a failed validation still logged "[CREATE] created" without any entry being made).
    const submitBtn = this.page.locator('button').filter({ hasText: /Add Fuel Transaction|Save/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    const createdToast = this.page
      .locator('[class*="animate-slide-in"]')
      .filter({ hasText: 'Fuel entry added successfully' })
      .first();
    await expect(createdToast).toBeVisible({ timeout: 15000 });
    console.log(`[CREATE] Fuel entry at "${data.location}" created!`);
  }

  /**
   * UPDATE a fuel entry via View Details → Edit → Save
   */
  async updateEntry(newLocation: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click View Details
    const viewBtn = this.page.locator('button').filter({ hasText: /View Details/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ View Details opened');

    // Click Edit
    const editBtn = this.page.locator('button').filter({ hasText: /^Edit$/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('✅ Edit mode activated');

    // Change Fuel Station Location
    const locationInput = this.page.locator('input[placeholder*="Houston"]').first();
    if (await locationInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locationInput.fill(newLocation);
      console.log(`✅ Location updated to "${newLocation}"`);
    }

    // Click Save
    const saveBtn = this.page.locator('button').filter({ hasText: /^Save$/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.page.waitForTimeout(3000);
    console.log(`[UPDATE] Entry updated!`);
  }

  /**
   * DELETE a fuel entry (clicks first Delete button on the list)
   */
  async deleteEntry(location: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click first Delete button on the page
    const deleteBtn = this.page.locator('button').filter({ hasText: 'Delete' }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await this.page.waitForTimeout(2000);
    console.log(`[DELETE] Clicked Delete`);

    // Confirmation - click the confirm Delete
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

    console.log(`[DELETE] Entry deleted!`);
  }

  /**
   * Check if a fuel entry with given location exists on page
   */
  async entryExists(location: string): Promise<boolean> {
    const bodyText = await this.page.locator('body').textContent().catch(() => '') || '';
    return bodyText.includes(location);
  }
}
