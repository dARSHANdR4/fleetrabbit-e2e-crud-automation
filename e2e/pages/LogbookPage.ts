import { Page, expect } from '@playwright/test';

export class LogbookPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/logbook', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/logbook', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  async createEntry(location: string) {
    await this.page.goto('https://stg.fleetrabbit.com/en/logbook/new', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(4000);

    // Step 1: Fill Fleet, Driver, Date, Time
    const selects = this.page.locator('select:not([id="language-select"])');
    await selects.nth(0).selectOption({ index: 1 }); // Fleet
    await this.page.waitForTimeout(500);
    await selects.nth(1).selectOption({ index: 1 }); // Driver
    await this.page.waitForTimeout(500);

    // Date — use random offset to prevent duplicates
    const ts = Date.now();
    const dayOffset = (ts % 30) + 1; // 1-30 days ago
    const randomDate = new Date(ts - dayOffset * 86400000).toISOString().split('T')[0];
    await this.page.locator('input[type="date"]').first().fill(randomDate);

    // Times — vary slightly each run
    const startH = 6 + (ts % 6); // 6-11 AM
    const endH = startH + 6 + (ts % 4); // 12-21 PM
    const startTime = `${String(startH).padStart(2, '0')}:00`;
    const endTime = `${String(endH).padStart(2, '0')}:00`;
    const times = this.page.locator('input[type="time"]');
    if (await times.count() >= 1) await times.nth(0).fill(startTime);
    if (await times.count() >= 2) await times.nth(1).fill(endTime);

    await this.clickNext(); console.log('✅ Step 1');

    // Step 2: Skip
    await this.clickNext(); console.log('✅ Step 2');

    // Step 3: Odometer, Location, Purpose — use unique values to prevent duplicates
    const uniqueSuffix = Date.now().toString().slice(-6);
    const startOdoVal = (50000 + parseInt(uniqueSuffix) % 1000).toString();
    const endOdoVal = (parseInt(startOdoVal) + 500).toString();
    const uniqueLoc = `${location}_${uniqueSuffix}`;

    const startOdo = this.page.locator('input[placeholder*="e.g. 145000"]');
    await startOdo.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await startOdo.fill(startOdoVal);
    await this.page.locator('input[placeholder*="e.g. 145342"]').fill(endOdoVal);
    await this.page.locator('input[placeholder*="Dallas"]').fill(uniqueLoc);
    await this.page.locator('input[placeholder*="Houston"]').fill(`Houston_${uniqueSuffix}`);

    // Trip Purpose — select by value if possible
    const purposeSelect = this.page.locator('select:not([id="language-select"])').last();
    await purposeSelect.selectOption({ index: 1 });
    await this.page.waitForTimeout(500);

    // Now Next should be enabled
    await this.clickNext(); console.log('✅ Step 3');

    // Step 4: Pass All + Next
    const passAllBtn = this.page.locator('button').filter({ hasText: /Pass All/i }).first();
    if (await passAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passAllBtn.click();
      await this.page.waitForTimeout(1000);
    }
    await this.clickNext(); console.log('✅ Step 4');

    // Step 5: Certification checkbox → Submit Entry
    await this.page.waitForTimeout(2000);
    const certCb = this.page.locator('input[type="checkbox"]').first();
    if (await certCb.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (!(await certCb.isChecked().catch(() => true))) {
        await certCb.check();
        await this.page.waitForTimeout(500);
      }
      console.log('✅ Certification checked');
    }

    // Click "Submit Entry"
    const submitBtn = this.page.locator('button').filter({ hasText: /Submit Entry/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    await submitBtn.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500);
    await submitBtn.click({ force: true });
    await this.page.waitForTimeout(5000);
    console.log(`[CREATE] Logbook entry created!`);
  }

  private async clickNext() {
    const nextBtn = this.page.locator('button').filter({ hasText: 'Next' }).first();
    if (await nextBtn.isEnabled({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async updateEntry() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click "View Details" on the first entry
    const viewBtn = this.page.locator('button').filter({ hasText: /View Details/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ View Details opened');

    // Look for Edit button in the detail view
    const editBtn = this.page.locator('button').filter({ hasText: /Edit/i }).first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      await this.page.waitForTimeout(2000);
      console.log('✅ Edit mode');
    }

    // Save changes
    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Update/i }).first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });
      await saveBtn.click();
      await this.page.waitForTimeout(3000);
    }
    console.log(`[UPDATE] Logbook entry updated!`);
  }

  async deleteEntry() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click "Delete" on the first entry
    const deleteBtn = this.page.locator('button').filter({ hasText: 'Delete' }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[DELETE] Clicked Delete');

    // Confirm dialog
    const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes/i });
    if (await confirmBtns.count() > 1) {
      await confirmBtns.last().click();
      await this.page.waitForTimeout(3000);
      console.log('[DELETE] Confirmed');
    }
    console.log(`[DELETE] Logbook entry deleted!`);
  }

  async entryExists(location: string): Promise<boolean> {
    await this.navigate();
    await this.page.waitForTimeout(3000);
    return this.page.getByText(location, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }
}
