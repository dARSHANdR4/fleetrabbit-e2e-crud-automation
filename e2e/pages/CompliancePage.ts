import { Page, Locator, expect } from '@playwright/test';

export interface ComplianceData {
  title: string;
  category?: string;
  agency?: string;
  impactLevel?: string;
  complianceStatus?: string;
  description: string;
  action: string;
  effectiveDate?: string;
  deadline?: string;
  regulationNumber?: string;
  affectedAreas?: string;
}

export class CompliancePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/compliance', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login, logging in...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/compliance', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Fill common form fields (shared between CREATE and UPDATE)
   */
  private async fillForm(data: ComplianceData) {
    // Title *
    const titleInput = this.page.locator('input[placeholder*="ELD Mandate"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(data.title);
    await this.page.waitForTimeout(100);

    // Regulation Number (optional)
    if (data.regulationNumber) {
      const regInput = this.page.locator('input[placeholder*="49 CFR"]').first();
      if (await regInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await regInput.fill(data.regulationNumber);
      }
    }

    // Category * - text input "e.g., FMCSA, EPA"
    if (data.category) {
      const catInput = this.page.locator('input[placeholder*="FMCSA, EPA"]').first();
      if (await catInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await catInput.fill(data.category);
      } else {
        // May have different placeholder
        await this.page.locator('input[placeholder*="FMCSA"]').first().fill(data.category);
      }
    }

    // Description * - first textarea
    const textareas = this.page.locator('textarea');
    await textareas.nth(0).fill(data.description);
    await this.page.waitForTimeout(100);

    // Issuing Agency * - first non-language select
    const selects = this.page.locator('select:not([id="language-select"])');
    if (data.agency) {
      await selects.nth(0).selectOption(data.agency);
    } else {
      await selects.nth(0).selectOption({ index: 1 });
    }
    await this.page.waitForTimeout(200);

    // Impact Level * - second non-language select
    if (data.impactLevel) {
      await selects.nth(1).selectOption(data.impactLevel);
    } else {
      await selects.nth(1).selectOption({ index: 1 });
    }
    await this.page.waitForTimeout(200);

    // Compliance Status * - third non-language select
    if (data.complianceStatus) {
      await selects.nth(2).selectOption(data.complianceStatus);
    } else {
      await selects.nth(2).selectOption({ index: 1 });
    }
    await this.page.waitForTimeout(200);

    // Affected Areas (optional)
    if (data.affectedAreas) {
      const areasInput = this.page.locator('input[placeholder*="Safety, Operations"]').first();
      if (await areasInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await areasInput.fill(data.affectedAreas);
      }
    }

    // Effective Date *
    const dateInputs = this.page.locator('input[type="date"]');
    if (data.effectiveDate) {
      await dateInputs.nth(0).fill(data.effectiveDate);
    } else {
      await dateInputs.nth(0).fill(new Date().toISOString().split('T')[0]);
    }

    // Compliance Deadline *
    if (data.deadline) {
      await dateInputs.nth(1).fill(data.deadline);
    } else {
      const d = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
      await dateInputs.nth(1).fill(d);
    }

    // Action Required * - textarea with specific placeholder
    const actionTA = this.page.locator('textarea[placeholder*="Describe what actions"]');
    if (await actionTA.count() > 0) {
      await actionTA.fill(data.action);
    } else {
      // Fallback: 3rd textarea (0=Description, 1=Summary, 2=Action)
      if (await textareas.count() >= 3) {
        await textareas.nth(2).fill(data.action);
      }
    }

    await this.page.waitForTimeout(200);
  }

  /**
   * CREATE a new regulation
   */
  async createRegulation(data: ComplianceData) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Click "Add Regulation"
    const addBtn = this.page.locator('button').filter({ hasText: 'Add Regulation' });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    await this.page.waitForTimeout(3000);

    // Verify form actually opened
    const titleInput = this.page.locator('input[placeholder*="ELD Mandate"], input[placeholder*="Title"]').first();
    const formOpen = await titleInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!formOpen) {
      console.log('[WARN] Form did not open, retrying...');
      await addBtn.click({ force: true });
      await this.page.waitForTimeout(3000);
    }
    console.log('✅ Add Regulation form opened');

    await this.fillForm(data);
    await this.saveForm();
    console.log(`[CREATE] "${data.title}" created!`);
  }

  /**
   * Check if a regulation with given title exists on page.
   * Uses the search box instead of pagination — the list is sorted newest-first,
   * so new entries land on page 1, not the last page.
   */
  async entryExists(title: string): Promise<boolean> {
    await this.navigate();
    await this.page.waitForTimeout(2000);
    await this.searchRegulation(title);
    return this.page.getByText(title, { exact: false }).first().isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Type into the search box and wait for the list to filter.
   */
  private async searchRegulation(title: string) {
    const searchInput = this.page.getByPlaceholder(/Search by title/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill(title);
    // Let the filter/debounce apply before reading results
    await this.page.waitForTimeout(2000);
  }

  /**
   * UPDATE a regulation - navigates to last page, finds our card, clicks Update Status
   */
  async updateRegulation(title: string, data: Partial<ComplianceData>) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Find our card's Update Status button on the last page
    const updateBtn = await this.findButtonInCard(title, /Update Status/i);
    if (!updateBtn) throw new Error(`No "Update Status" button found for "${title}"`);
    await updateBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('✅ Update Status form opened');

    // Change Compliance Status
    if (data.complianceStatus) {
      const selects = this.page.locator('select:not([id="language-select"])');
      await selects.nth(6).selectOption(data.complianceStatus);
      await this.page.waitForTimeout(300);
    }

    await this.saveForm();
    console.log(`[UPDATE] "${title}" updated!`);
  }

  /**
   * Click save button - different text for create vs update forms
   */
  private async saveForm() {
    // Try "Save Regulation" first (create form), then "Save Changes" (update form)
    let saveBtn = this.page.locator('button').filter({ hasText: /Save Regulation/i }).first();
    let found = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!found) {
      saveBtn = this.page.locator('button').filter({ hasText: /Save Changes/i }).first();
      found = await saveBtn.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (found) {
      await expect(saveBtn).toBeEnabled({ timeout: 5000 });
      await saveBtn.click();
      await this.page.waitForTimeout(4000);
      console.log('✅ Saved');
    } else {
      console.log('❌ No save button found!');
    }
  }

  /**
   * DELETE a regulation by title - navigates to last page, finds our card, clicks Delete
   */
  async deleteRegulation(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Close any open modal first
    const cancelBtn = this.page.locator('button').filter({ hasText: 'Cancel' }).first();
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await this.page.waitForTimeout(1500);
    }

    // Find our card's Delete button on the last page
    const deleteBtn = await this.findButtonInCard(title, /^Delete$/i);
    if (!deleteBtn) throw new Error(`No "Delete" button found for "${title}"`);
    await deleteBtn.click({ force: true });
    console.log(`[DELETE] Clicked Delete for "${title}"`);
    await this.page.waitForTimeout(2000);

    // Confirmation dialog - click the confirm/delete button in the dialog
    const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes|Remove/i });
    const count = await confirmBtns.count();
    if (count > 0) {
      const lastConfirm = confirmBtns.last();
      if (await lastConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lastConfirm.click({ force: true });
        console.log('[DELETE] Confirmed');
        await this.page.waitForTimeout(5000); // Wait longer for deletion to process
      }
    }

    console.log(`[DELETE] "${title}" deleted!`);
  }

  /**
   * Navigate to the last page of regulations (newest entries)
   */
  async goToLastPage() {
    // Click page numbers to go to last page
    const pageNums = this.page.locator('button').filter({ hasText: /^\d+$/ });
    const count = await pageNums.count();
    if (count > 0) {
      const lastPage = pageNums.last();
      await lastPage.click();
      await this.page.waitForTimeout(2000);
      console.log(`Navigated to last page`);
    }
  }

  /**
   * Find a regulation card by title and return the button inside it.
   * Searches by title first (list is newest-first, so pagination would land on the wrong page).
   */
  private async findButtonInCard(title: string, btnText: RegExp): Promise<Locator | null> {
    await this.searchRegulation(title);

    const allBtns = this.page.locator('button').filter({ hasText: btnText });
    const count = await allBtns.count();
    console.log(`Found ${count} "${btnText}" buttons on current page`);

    for (let i = 0; i < count; i++) {
      const btn = allBtns.nth(i);
      // Check if any ancestor up to 4 levels contains our title
      const matches = await btn.evaluate((el, searchTitle) => {
        let parent = el.parentElement;
        for (let level = 0; level < 4; level++) {
          if (parent && parent.textContent && parent.textContent.includes(searchTitle)) {
            return true;
          }
          parent = parent?.parentElement || null;
        }
        return false;
      }, title);

      if (matches) {
        console.log(`Found matching button at index ${i}`);
        return btn;
      }
    }
    return null;
  }
}
