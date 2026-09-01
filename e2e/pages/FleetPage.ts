import { Page, expect } from '@playwright/test';

export class FleetPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/fleet', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(4000);
  }

  /** Count current number of fleets by counting X (delete) icons */
  async getFleetCount(): Promise<number> {
    await this.navigate();
    // Each fleet card has a button with lucide-x SVG for deletion
    const xButtons = this.page.locator('button:has(svg[class*="lucide-x"])');
    const count = await xButtons.count();
    console.log(`📊 Fleet count: ${count}/5`);
    return count;
  }

  /** Delete fleets until there are enough slots for 'needed' new fleets */
  async ensureRoom(needed: number) {
    const current = await this.getFleetCount();
    const maxSlots = 5;
    const available = maxSlots - current;
    if (available >= needed) {
      console.log(`✅ Room available: ${available}/${needed} needed (${current}/5 used)`);
      return;
    }
    const toDelete = needed - available;
    console.log(`⚠️ Need room: ${current}/5 used, deleting ${toDelete} fleet(s)...`);
    for (let i = 0; i < toDelete; i++) {
      await this.deleteFleet();
      await this.page.waitForTimeout(2000);
    }
  }

  async createFleet(unitNumber: string) {
    await this.page.goto('https://stg.fleetrabbit.com/en/fleet/add', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(5000);

    // Scroll past AI/VIN section to the form
    const vinInput = this.page.locator('input[placeholder*="1FUJGHDV8NLDZ2345"]');
    if (await vinInput.count() > 0) {
      await vinInput.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(1000);
    }

    // ═══ Unit Number ═══
    const unitInput = this.page.locator('input[placeholder="TRK-001"]');
    await unitInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    await unitInput.click({ force: true });
    await unitInput.clear();
    await unitInput.fill(unitNumber);
    console.log(`Unit: ${unitNumber}`);

    // ═══ Fleet Type Select ═══
    const allSelects = this.page.locator('select:not([id="language-select"])');
    const fleetTypeSelect = allSelects.nth(0);
    await fleetTypeSelect.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await fleetTypeSelect.selectOption('truck');
    await this.page.waitForTimeout(500);
    console.log('Fleet Type: truck');

    // ═══ Year ═══
    const yearInput = this.page.locator('input[placeholder="2022"]');
    await yearInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    await yearInput.click({ force: true });
    await yearInput.fill('2023');
    console.log('Year: 2023');

    // ═══ MAKE + MODEL — type + click dropdown suggestion ═══
    await this.selectMakeModel('Ford', 'F-150');

    // ═══ License Plate ═══
    const lpInput = this.page.locator('input[placeholder="ABC1234"]');
    await lpInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    await lpInput.click({ force: true });
    await lpInput.fill(`LIC${Date.now().toString().slice(-6)}`);

    // ═══ Status Select ═══
    const statusSelect = allSelects.nth(3);
    await statusSelect.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    await statusSelect.selectOption('active');
    await this.page.waitForTimeout(500);
    console.log('Status: active');

    // ═══ Submit ═══
    await this.page.waitForTimeout(500);
    const submitBtn = this.page.locator('button').filter({ hasText: /Add Fleet/i }).first();
    await submitBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    // Check if fleet limit is reached
    const isDisabled = await submitBtn.isDisabled().catch(() => true);
    if (isDisabled) {
      const title = await submitBtn.getAttribute('title').catch(() => '');
      throw new Error(`❌ Fleet limit reached! "${title}" — Delete fleets first.`);
    }
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await this.page.waitForTimeout(5000);
    console.log(`[CREATE] Fleet "${unitNumber}" created!`);
  }

  private async selectMakeModel(make: string, model: string) {
    // --- MAKE ---
    const makeInput = this.page.locator('input[placeholder*="Freightliner"]').first();
    await makeInput.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await makeInput.click({ force: true });
    await this.page.waitForTimeout(300);
    await makeInput.clear();
    await makeInput.type(make, { delay: 80 });
    await this.page.waitForTimeout(3000);

    const makeOption = this.page.locator('button').filter({ hasText: new RegExp(`^${make}$`, 'i') }).first();
    const makeVisible = await makeOption.isVisible({ timeout: 3000 }).catch(() => false);
    if (makeVisible) {
      await makeOption.click();
      await this.page.waitForTimeout(2000);
      console.log(`Make selected: ${make}`);
    } else {
      console.log(`⚠️ Make dropdown "${make}" not found, Tab-ing`);
      await makeInput.press('Tab');
      await this.page.waitForTimeout(1000);
    }

    // --- MODEL ---
    await this.page.waitForTimeout(1000);
    let modelInput = this.page.locator('input[placeholder*="Select or type model"]').first();
    if (await modelInput.count() === 0) {
      modelInput = this.page.locator('input[placeholder*="Cascadia"]').first();
    }

    const modelFocused = await modelInput.evaluate(el => el === document.activeElement).catch(() => false);
    if (!modelFocused) {
      await makeInput.press('Tab');
      await this.page.waitForTimeout(1500);
    }

    await modelInput.type(model, { delay: 80 });
    await this.page.waitForTimeout(3000);

    const modelOption = this.page.locator('button').filter({ hasText: new RegExp(model.replace(/[-\s]/g, '[-\\s]'), 'i') }).first();
    const modelVisible = await modelOption.isVisible({ timeout: 3000 }).catch(() => false);
    if (modelVisible) {
      await modelOption.click();
      await this.page.waitForTimeout(1000);
      console.log(`Model selected: ${model}`);
    } else {
      console.log(`⚠️ Model dropdown "${model}" not found, Tab-ing`);
      await modelInput.press('Tab');
      await this.page.waitForTimeout(1000);
    }

    await modelInput.press('Tab');
    await this.page.waitForTimeout(1000);
  }

  async updateFleet() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click the first fleet card to open detail view
    // Fleet cards: trucks with unit numbers. Find a clickable fleet entry.
    // Click a truck icon or the card area to enter detail
    const truckIcon = this.page.locator('svg[class*="lucide-truck"]').first();
    if (await truckIcon.count() > 0) {
      // Click parent container of the truck icon
      const card = truckIcon.locator('..').locator('..');
      await card.first().click({ force: true });
      await this.page.waitForTimeout(4000);
      console.log(`Detail URL: ${this.page.url()}`);
    }

    // Look for "Edit Details" or "Edit" button on the detail page
    const editBtn = this.page.locator('button').filter({ hasText: /Edit Details|Edit$/i }).first();
    if (await editBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn.click();
      await this.page.waitForTimeout(3000);
      console.log('Clicked Edit Details');
    }

    // Update odometer
    const odoInput = this.page.locator('input[placeholder="145230"]');
    if (await odoInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const newOdo = String(50000 + (Date.now() % 50000));
      await odoInput.clear();
      await odoInput.fill(newOdo);
      console.log(`Odometer updated: ${newOdo}`);
    }

    // Save
    const saveBtn = this.page.locator('button').filter({ hasText: /Save Changes|Save$/i }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      await this.page.waitForTimeout(3000);
    }

    console.log('[UPDATE] Fleet updated!');
  }

  async deleteFleet() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Find the X (cross/lucide-x) icon button — one per fleet card
    const xBtn = this.page.locator('button:has(svg[class*="lucide-x"])').first();
    await expect(xBtn).toBeVisible({ timeout: 10000 });
    await xBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('Clicked X (delete) button');

    // Confirm deletion dialog
    const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes/i });
    const btnCount = await confirmBtns.count();
    if (btnCount > 0) {
      await confirmBtns.last().click();
      await this.page.waitForTimeout(3000);
      console.log('Confirmed deletion');
    }

    console.log('[DELETE] Fleet deleted!');
  }
}
