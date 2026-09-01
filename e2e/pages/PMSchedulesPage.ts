import { Page, expect } from '@playwright/test';

export class PMSchedulesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/maintenance/pm-schedules', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/maintenance/pm-schedules', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  async createSchedule(title: string) {
    await this.page.goto('https://stg.fleetrabbit.com/en/maintenance/pm-schedules/create', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(4000);

    const selects = this.page.locator('select:not([id="language-select"])');

    // Fleet * - select first option
    await selects.nth(0).selectOption({ index: 1 });
    await this.page.waitForTimeout(300);

    // Title *
    await this.page.locator('input[placeholder*="Brief title"]').fill(title);

    // Description *
    await this.page.locator('textarea').first().fill('Automated PM schedule for testing.');

    // Category *
    await selects.nth(1).selectOption('routine');

    // Priority *
    await selects.nth(2).selectOption('medium');

    // Scheduled Date *
    const dateInput = this.page.locator('input[type="date"]').first();
    const future = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    await dateInput.fill(future);

    await this.page.waitForTimeout(500);

    // Add a maintenance task - click "Custom" to add task
    const customBtn = this.page.locator('button').filter({ hasText: /^Custom$/i }).first();
    if (await customBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await customBtn.click();
      await this.page.waitForTimeout(1500);
      // Fill task form
      await this.page.locator('input[placeholder*="Oil Filter"]').fill('Oil Change - Synthetic');
      await this.page.locator('textarea[placeholder*="Describe what needs"]').fill('Change oil and filter.');
      await this.page.waitForTimeout(300);
      // Click "Add Task" button
      await this.page.locator('button').filter({ hasText: /^Add Task$/i }).first().click();
      await this.page.waitForTimeout(1000);
      console.log('✅ Custom task added');
    }

    // Submit
    const createBtn = this.page.locator('button').filter({ hasText: /Create PM Schedule/i }).first();
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await createBtn.click();
    await this.page.waitForTimeout(5000);
    console.log(`[CREATE] PM Schedule "${title}" created!`);
  }

  async updateSchedule(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Find card with our title and click its Edit button
    const allEdits = this.page.locator('button').filter({ hasText: 'Edit' });
    const count = await allEdits.count();
    for (let i = 0; i < count; i++) {
      const btn = allEdits.nth(i);
      const near = await btn.evaluate((el, t) => {
        let p = el.parentElement;
        for (let j = 0; j < 4; j++) {
          if (p?.textContent?.includes(t)) return true;
          p = p?.parentElement || null;
        }
        return false;
      }, title);
      if (near) { await btn.click(); break; }
    }
    await this.page.waitForTimeout(3000);
    console.log('✅ Edit form opened');

    // Modify description
    const descTA = this.page.locator('textarea').first();
    if (await descTA.isVisible({ timeout: 2000 }).catch(() => false)) {
      await descTA.fill('Updated: Modified PM schedule description.');
      console.log('✅ Description updated');
    }

    // Save
    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Update/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.page.waitForTimeout(5000);
    console.log(`[UPDATE] PM Schedule "${title}" updated!`);
  }

  async deleteSchedule(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Find the card with our title and click its Delete button
    const allDeletes = this.page.locator('button').filter({ hasText: 'Delete' });
    const count = await allDeletes.count();

    for (let i = 0; i < count; i++) {
      const btn = allDeletes.nth(i);
      const near = await btn.evaluate((el, t) => {
        let p = el.parentElement;
        for (let j = 0; j < 4; j++) {
          if (p?.textContent?.includes(t)) return true;
          p = p?.parentElement || null;
        }
        return false;
      }, title);
      if (near) { await btn.click(); break; }
    }

    await this.page.waitForTimeout(2000);
    // Confirm
    const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes/i });
    if (await confirmBtns.count() > 1) {
      await confirmBtns.last().click();
      await this.page.waitForTimeout(3000);
    }
    console.log(`[DELETE] PM Schedule "${title}" deleted!`);
  }

  async entryExists(title: string): Promise<boolean> {
    await this.navigate();
    await this.page.waitForTimeout(3000);
    return this.page.getByText(title, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }
}
