import { Page, expect } from '@playwright/test';

const BASE_URL = 'https://stg.fleetrabbit.com/en/maintenance/service-programs';

export class ServiceProgramsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Block on a toast notification (both success and error toasts carry the
   * `animate-slide-in` class). Used after create/save/delete so we actually
   * confirm the POST/PATCH/DELETE completed rather than racing ahead.
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

  /** Isolate the target program card using the list page search box. */
  private async searchProgram(name: string) {
    const search = this.page.locator('input[placeholder*="Search"]').first();
    await expect(search).toBeVisible({ timeout: 10000 });
    await search.fill(name);
    await this.page.waitForTimeout(1000);
  }

  async createProgram(name: string) {
    // Go to create page
    await this.page.goto(`${BASE_URL}/create`, { waitUntil: 'domcontentloaded' });

    // Step 1: template cards are populated async from /api/service-programs/templates.
    // The "Start from Scratch" card only renders once that fetch resolves, so wait
    // for it explicitly instead of a fixed sleep (the previous fixed 3s sleep left
    // the click racing against the loader → "Start from Scratch" never appeared).
    const scratch = this.page.locator('text=Start from Scratch').first();
    await expect(scratch).toBeVisible({ timeout: 30000 });
    await scratch.click();

    const nextBtn = this.page.locator('button').filter({ hasText: 'Next' }).first();
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });
    await nextBtn.click();

    // Step 2: fill program name + description
    const nameInput = this.page.locator('input[placeholder*="East Coast"]');
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill(name);
    await this.page.locator('textarea').first().fill('Automated test service program.');
    await this.page.locator('button').filter({ hasText: 'Next' }).first().click();

    // Step 3: Create Program — block on the success toast so the POST completes
    const createBtn = this.page.locator('button').filter({ hasText: /Create Program/i }).first();
    await expect(createBtn).toBeEnabled({ timeout: 10000 });
    await createBtn.click();
    await this.waitForToast('Program created successfully');
    console.log(`[CREATE] Program "${name}" created!`);
  }

  async updateProgram(name: string) {
    await this.navigate();
    await this.searchProgram(name);

    // Click "View details" on the (now-isolated) program card
    const viewLink = this.page.locator('text=View details').first();
    await expect(viewLink).toBeVisible({ timeout: 10000 });
    await viewLink.click();

    // Wait for the detail page to render its Save button before editing
    const saveBtn = this.page.locator('button').filter({ hasText: /^Save$/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 15000 });

    // Modify the program name (first text input = Program Name)
    const nameInput = this.page.locator('input[type="text"]').first();
    await nameInput.fill(`${name} - Updated`);
    console.log(`✅ Name modified: "${name} - Updated"`);

    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.waitForToast('Program saved');
    console.log(`[UPDATE] Program "${name}" updated!`);
  }

  async deactivateProgram(name: string) {
    await this.navigate();
    await this.searchProgram(name);

    // Click "View details" on the (now-isolated) program card
    const viewLink = this.page.locator('text=View details').first();
    await expect(viewLink).toBeVisible({ timeout: 10000 });
    await viewLink.click();

    // Click Deactivate
    const deactivateBtn = this.page.locator('button').filter({ hasText: /Deactivate/i }).first();
    await expect(deactivateBtn).toBeVisible({ timeout: 10000 });
    await deactivateBtn.click();
    console.log('Clicked Deactivate');

    // Confirm in the alert dialog (Radix AlertDialog → role="alertdialog")
    const dialog = this.page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Deactivate' }).click();
    console.log('Confirmed deactivation');

    await this.waitForToast('Program deactivated');
    console.log(`[DELETE] Program "${name}" deactivated!`);
  }

  async entryExists(name: string): Promise<boolean> {
    await this.navigate();
    await this.searchProgram(name);
    return this.page.getByText(name, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }
}
