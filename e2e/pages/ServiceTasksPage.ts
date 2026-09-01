import { Page, expect } from '@playwright/test';

const BASE_URL = 'https://stg.fleetrabbit.com/en/maintenance/service-programs?tab=tasks';
const CREATE_URL = 'https://stg.fleetrabbit.com/en/maintenance/service-tasks/create';
const LOGIN_URL = 'https://stg.fleetrabbit.com/en/login/admin';

export class ServiceTasksPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login...');
      await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('testaccountt123@gmail.com');
      await this.page.locator('input[type="password"]').fill('Admin@123');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Block on a toast notification. Toasts carry the `animate-slide-in` class and
   * their message text. Used after create/save/delete so we confirm the
   * POST/PATCH/DELETE actually completed instead of racing ahead.
   */
  private async waitForToast(text: string, timeout = 15000) {
    console.log(`⏳ Waiting for toast: "${text}"`);
    const toast = this.page
      .locator('[class*="animate-slide-in"]')
      .filter({ hasText: text })
      .first();
    await expect(toast).toBeVisible({ timeout });
    console.log(`✅ Toast confirmed: "${text}"`);
  }

  /** Isolate the target task row using the tasks-list search box. */
  private async searchTask(name: string) {
    const search = this.page.locator('input[placeholder*="Search tasks"]').first();
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill(name);
    await this.page.waitForTimeout(1000);
  }

  async createTask(name: string) {
    await this.page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    // Step 1: pick "Build manually" on the mode-chooser splash. The card is a
    // button; wait for it explicitly instead of a fixed sleep.
    const manualCard = this.page.getByRole('button', { name: /Build manually/i }).first();
    await expect(manualCard).toBeVisible({ timeout: 15000 });
    await manualCard.click();

    // The manual form renders once mode flips to 'manual'.
    const nameInput = this.page.locator('input[placeholder*="Oil Change"]');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    console.log('✅ Build manually form opened');

    await nameInput.fill(name);
    await this.page.locator('input[placeholder*="e.g. Engine"]').fill('Engine');
    await this.page.locator('input[placeholder*="e.g. Lubrication"]').fill('Lubrication');
    await this.page.locator('textarea').first().fill('Automated test task description.');
    await this.page.locator('input[placeholder="0.75"]').fill('0.5');
    await this.page.locator('input[placeholder="45"]').fill('30');
    await this.page.locator('input[placeholder="85"]').fill('60');

    await this.page.waitForTimeout(500);

    // Submit — block on the success toast so the POST completes before returning.
    const createBtn = this.page.locator('button').filter({ hasText: /Create Task/i }).first();
    await expect(createBtn).toBeEnabled({ timeout: 5000 });
    await createBtn.click();
    await this.waitForToast('Service task created');
    console.log(`[CREATE] Task "${name}" created!`);
  }

  async updateTask(name: string) {
    await this.navigate();
    await this.searchTask(name);

    // Open the task detail page by clicking the (now-isolated) row.
    const row = this.page.getByText(name, { exact: false }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();

    // Wait for the detail page to render its Save button before editing.
    const saveBtn = this.page.locator('button').filter({ hasText: /Save Changes/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 15000 });

    // Modify the description (the only textarea on the detail page).
    const descTA = this.page.locator('textarea').first();
    await descTA.fill('Updated: Modified task description.');
    console.log('✅ Description updated');

    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.waitForToast('Saved');
    console.log(`[UPDATE] Task "${name}" updated!`);
  }

  async deleteTask(name: string) {
    await this.navigate();
    await this.searchTask(name);

    // Open the task detail page.
    const row = this.page.getByText(name, { exact: false }).first();
    await expect(row).toBeVisible({ timeout: 10000 });
    await row.click();

    // Deactivate uses a native confirm() dialog (not a Radix dialog), so accept
    // it before clicking, otherwise Playwright auto-dismisses → cancel.
    const deactivateBtn = this.page.locator('button').filter({ hasText: /Deactivate/i }).first();
    await expect(deactivateBtn).toBeVisible({ timeout: 15000 });

    this.page.once('dialog', (dialog) => dialog.accept());
    await deactivateBtn.click();

    await this.waitForToast('Task deactivated');
    console.log(`[DELETE] Task "${name}" deactivated!`);
  }

  async entryExists(name: string): Promise<boolean> {
    await this.navigate();
    await this.searchTask(name);
    return this.page.getByText(name, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }
}
