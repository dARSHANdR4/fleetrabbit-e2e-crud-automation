import { Page, expect } from '@playwright/test';

const BASE_URL = 'https://stg.fleetrabbit.com/en/maintenance/requests';
const CREATE_URL = 'https://stg.fleetrabbit.com/en/maintenance/requests/create';
const LOGIN_URL = 'https://stg.fleetrabbit.com/en/login/admin';

export class MaintRequestsPage {
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
   * their message text. Used after create/delete so we confirm the request
   * actually completed instead of racing ahead with a bare timeout.
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

  /** Isolate a request in the list using the header search box. */
  private async searchRequest(title: string) {
    const search = this.page.locator('input[placeholder*="Search requests"]').first();
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill(title);
    // Search is debounced 1s + 3-char minimum, then triggers a server fetch.
    await this.page.waitForTimeout(1500);
  }

  async createRequest(title: string) {
    await this.page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    // Vehicle <select> is populated async from /api/vehicles, sometimes in
    // batches (e.g. 4 options, then more arrive later). Selecting mid-load
    // is a race: when React re-renders the option list, it can silently
    // reset the selected value, so the form submits without a vehicle and
    // the success toast never fires. Wait for the option count to stop
    // growing (stable across two checks) before selecting.
    const vehicleSelect = this.page.locator('select:not([id="language-select"])').first();
    await expect(vehicleSelect).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => vehicleSelect.locator('option').count(), { timeout: 20000 })
      .toBeGreaterThan(1);
    let lastCount = -1;
    let stableCount = await vehicleSelect.locator('option').count();
    while (stableCount !== lastCount) {
      lastCount = stableCount;
      await this.page.waitForTimeout(500);
      stableCount = await vehicleSelect.locator('option').count();
    }
    console.log(`✅ Vehicle dropdown populated (${stableCount} options)`);
    await vehicleSelect.selectOption({ index: 1 });

    // Issue Title * (required)
    const titleInput = this.page.locator('input[placeholder*="Brief description"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(title);

    // Description * (required)
    const descTA = this.page.locator('textarea').first();
    await expect(descTA).toBeVisible({ timeout: 10000 });
    await descTA.fill('Automated maintenance request for testing.');

    // Submit — block on the success toast so the POST completes before returning.
    const submitBtn = this.page.locator('button').filter({ hasText: /Submit Request/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await this.waitForToast('Maintenance request submitted successfully');
    console.log(`[CREATE] Request "${title}" created!`);
  }

  async deleteRequest(title: string) {
    await this.navigate();

    // Isolate the target card so the Delete button is unambiguous.
    await this.searchRequest(title);

    // Two-click delete: first click arms (warning toast), second click within
    // 5s commits the DELETE. The button is a Trash2 icon with title="Delete".
    const deleteBtn = this.page.locator('button[title="Delete"]').first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    console.log('[DELETE] First click — armed (warning toast)');
    await deleteBtn.click();
    console.log('[DELETE] Second click — committing');

    // Block on the success toast returned by the DELETE endpoint.
    await this.waitForToast('Maintenance request deleted');
    console.log(`[DELETE] Request "${title}" deleted!`);
  }

  async entryExists(title: string): Promise<boolean> {
    await this.navigate();
    await this.searchRequest(title);
    return this.page.getByText(title, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }
}
