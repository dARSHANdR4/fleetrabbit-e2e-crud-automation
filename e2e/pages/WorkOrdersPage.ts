import { Page, expect } from '@playwright/test';

const BASE_URL = 'https://stg.fleetrabbit.com/en/maintenance';
const CREATE_URL = 'https://stg.fleetrabbit.com/en/maintenance/create';
const LOGIN_URL = 'https://stg.fleetrabbit.com/en/login/admin';

export class WorkOrdersPage {
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
   * their message text. Used after create/save/delete so we actually confirm the
   * POST/PATCH/DELETE completed instead of racing ahead with a bare timeout.
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

  /** Isolate a work order in the list using the header search box. */
  private async searchWorkOrder(title: string) {
    const search = this.page.locator('input[placeholder*="work orders"]').first();
    await expect(search).toBeVisible({ timeout: 15000 });
    await search.fill(title);
    // Search is debounced 1s + 3-char minimum, then triggers a server fetch.
    await this.page.waitForTimeout(1500);
  }

  async createWorkOrder(title: string) {
    await this.page.goto(CREATE_URL, { waitUntil: 'domcontentloaded' });

    const nextBtn = this.page.getByRole('button', { name: 'Next' }).first();

    // Step 1: Basic Info — vehicle <select> is populated async from /api/vehicles.
    // Interacting with an empty select is a silent no-op, so wait for options.
    const vehicleSelect = this.page.locator('select:not([id="language-select"])').first();
    await expect(vehicleSelect).toBeVisible({ timeout: 15000 });
    await expect
      .poll(async () => vehicleSelect.locator('option').count(), { timeout: 20000 })
      .toBeGreaterThan(1);
    console.log(`✅ Vehicle dropdown populated (${await vehicleSelect.locator('option').count()} options)`);
    await vehicleSelect.selectOption({ index: 1 });

    // Priority defaults to "medium" and service type to "corrective"; reportedBy
    // auto-populates from the current user once /api/auth/init-user resolves.
    // Wait for the header Next to become enabled before proceeding.
    await expect(nextBtn).toBeEnabled({ timeout: 15000 });
    await nextBtn.click();

    // Step 2: Tasks & Duration — add one manual task (required for this step).
    const taskNameInput = this.page.locator('input[placeholder*="Type to search"]').first();
    await expect(taskNameInput).toBeVisible({ timeout: 15000 });
    await taskNameInput.fill(title);
    const addBtn = this.page.getByRole('button', { name: 'Add', exact: true });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await expect(nextBtn).toBeEnabled({ timeout: 15000 });
    await nextBtn.click();

    // Step 3: Additional Requirements (all optional) → Next.
    await expect(nextBtn).toBeEnabled({ timeout: 15000 });
    await nextBtn.click();

    // Step 4: Cost & Budget (all optional) → Next.
    await expect(nextBtn).toBeEnabled({ timeout: 15000 });
    await nextBtn.click();

    // Step 5: Remarks & Notes — issue description + due date are required here.
    const descTA = this.page.locator('textarea').first();
    await expect(descTA).toBeVisible({ timeout: 15000 });
    await descTA.fill('Automated work order from CRUD test.');
    const dueDate = this.page.locator('input[type="date"]').first();
    await expect(dueDate).toBeVisible({ timeout: 10000 });
    await dueDate.fill(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    await expect(nextBtn).toBeEnabled({ timeout: 15000 });
    await nextBtn.click();

    // Step 6: Review — submit via the header "Create Work Order" button.
    const createBtn = this.page.getByRole('button', { name: 'Create Work Order' });
    await expect(createBtn).toBeEnabled({ timeout: 15000 });
    await createBtn.click();
    await this.waitForToast('Work order created successfully');
    console.log(`[CREATE] Work Order "${title}" created!`);
  }

  async updateWorkOrder() {
    await this.navigate();

    // Open the most recent work order (list is sorted newest-first).
    const viewBtn = this.page.getByRole('button', { name: 'View' }).first();
    await expect(viewBtn).toBeVisible({ timeout: 15000 });
    await viewBtn.click();

    // Detail page → "Edit Work Order" button.
    const editBtn = this.page.getByRole('button', { name: 'Edit Work Order' }).first();
    await expect(editBtn).toBeVisible({ timeout: 15000 });
    await editBtn.click();

    // Edit page → "Update Work Order" submit button.
    const updateBtn = this.page.getByRole('button', { name: 'Update Work Order' }).first();
    await expect(updateBtn).toBeEnabled({ timeout: 15000 });
    await updateBtn.click();
    await this.waitForToast('Work order updated successfully!');
    console.log(`[UPDATE] Work Order updated!`);
  }

  async deleteWorkOrder(title: string) {
    await this.navigate();

    // Isolate the target row so the Delete button is unambiguous.
    await this.searchWorkOrder(title);

    const deleteBtn = this.page.getByRole('button', { name: 'Delete' }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    console.log('[DELETE] Clicked Delete');

    // The confirm is a Radix AlertDialog (role="alertdialog"), title
    // "Delete Work Order", confirm button "Delete", cancel "Cancel".
    const dialog = this.page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('button', { name: 'Delete' }).click();
    console.log('[DELETE] Confirmed in dialog');

    // There is no success toast on delete — block on the row disappearing.
    await expect(this.page.getByText(title, { exact: false }).first()).toBeHidden({ timeout: 15000 });
    console.log(`[DELETE] Work Order "${title}" deleted!`);
  }

  async entryExists(title: string): Promise<boolean> {
    await this.navigate();
    await this.searchWorkOrder(title);
    return this.page.getByText(title, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }
}
