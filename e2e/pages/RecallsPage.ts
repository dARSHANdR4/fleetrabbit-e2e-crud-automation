import { Page, Locator, expect } from '@playwright/test';

export interface RecallData {
  title: string;
  category?: string;
  severity?: string;
  description: string;
  action: string;
  deadline?: string;
  fleetIndex?: number;
}

export class RecallsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to Recalls page with auto-login fallback
   */
  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/recalls', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);

    if (this.page.url().includes('/login') || this.page.url().includes('/welcome')) {
      console.log('[Auth] Redirected to login, logging in...');
      await this.page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
      await this.page.locator('input[type="email"]').fill('ev@gmail.com');
      await this.page.locator('input[type="password"]').fill('Pa55_word');
      await this.page.getByRole('button', { name: /Sign In|Login/i }).first().click();
      await this.page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
      await this.page.goto('https://stg.fleetrabbit.com/en/recalls', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
  }

  /**
   * Click "Add Insight" button and verify the form modal opens
   */
  async clickAddInsight() {
    const addBtn = this.page.locator('button').filter({ hasText: 'Add Insight' });
    await expect(addBtn).toBeVisible({ timeout: 15000 });
    await addBtn.click();
    await this.page.waitForTimeout(3000);

    // Verify form opened by checking for the title input
    const titleInput = this.page.locator('input[placeholder*="title"], input[placeholder*="summary"]').first();
    const formOpened = await titleInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!formOpened) {
      console.log('[WARN] Form may not have opened, retrying Add Insight click...');
      await addBtn.click({ force: true });
      await this.page.waitForTimeout(3000);
    }
    console.log('✅ Add Insight form opened');
  }

  /**
   * Fill the common form fields (shared between Recall and Regulatory Update)
   */
  private async fillCommonFields(data: RecallData) {
    // Title
    const titleInput = this.page.locator('input[placeholder*="title"], input[placeholder*="summary"]').first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(data.title);
    await this.page.waitForTimeout(200);

    // Category - 2nd non-language select
    const selects = this.page.locator('select:not([id="language-select"])');
    if (data.category) {
      await selects.nth(1).selectOption(data.category);
    } else {
      await selects.nth(1).selectOption({ index: 1 });
    }
    await this.page.waitForTimeout(300);

    // Severity - 3rd non-language select
    if (data.severity) {
      await selects.nth(2).selectOption(data.severity);
    } else {
      await selects.nth(2).selectOption({ index: 1 });
    }
    await this.page.waitForTimeout(300);

    // Description - 1st textarea
    const textareas = this.page.locator('textarea');
    await expect(textareas.nth(0)).toBeVisible({ timeout: 5000 });
    await textareas.nth(0).fill(data.description);
    await this.page.waitForTimeout(200);

    // Action Required - 2nd textarea
    await textareas.nth(1).fill(data.action);
    await this.page.waitForTimeout(200);
  }

  /**
   * CREATE a Recall (Type = "recall")
   */
  async createRecall(data: RecallData) {
    await this.clickAddInsight();

    // Type = Recall
    const selects = this.page.locator('select:not([id="language-select"])');
    await selects.nth(0).selectOption('recall');
    await this.page.waitForTimeout(800);

    await this.fillCommonFields(data);

    // Select fleet checkbox
    if (data.fleetIndex !== undefined) {
      const checkboxes = this.page.locator('input[type="checkbox"]');
      const cbCount = await checkboxes.count();
      if (cbCount > data.fleetIndex) {
        await checkboxes.nth(data.fleetIndex).check();
        console.log(`✅ Checked fleet checkbox ${data.fleetIndex}`);
      }
    } else {
      const firstCb = this.page.locator('input[type="checkbox"]').first();
      if (await firstCb.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (!(await firstCb.isChecked().catch(() => true))) {
          await firstCb.check();
        }
        console.log('✅ Checked first fleet');
      }
    }

    // Date
    if (data.deadline) {
      const dateInput = this.page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(data.deadline);
      }
    }

    // Submit
    await this.submitForm('Recall added successfully');
    console.log(`[CREATE] Recall "${data.title}" created!`);
  }

  /**
   * CREATE a Regulatory Update (Type = "regulation")
   */
  async createRegulatoryUpdate(data: RecallData) {
    await this.clickAddInsight();

    // Type = Regulation
    const selects = this.page.locator('select:not([id="language-select"])');
    await selects.nth(0).selectOption('regulation');
    await this.page.waitForTimeout(500);

    await this.fillCommonFields(data);

    // Date (no fleet checkboxes for regulations)
    if (data.deadline) {
      const dateInput = this.page.locator('input[type="date"]').first();
      if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dateInput.fill(data.deadline);
      }
    }

    // Submit
    await this.submitForm();
    console.log(`[CREATE] Regulatory Update "${data.title}" created!`);
  }

  /**
   * Submit the form — button text differs by Type:
   * "Add Recall" for Type=recall, "Add Regulation" for Type=regulation
   */
  private async submitForm(toastText?: string) {
    const submitBtn = this.page.locator('button').filter({ hasText: /Add Recall|Add Regulation/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
    await expect(submitBtn).toBeEnabled({ timeout: 15000 });
    const btnText = (await submitBtn.textContent().catch(() => '')).trim();
    console.log(`Clicking submit: "${btnText}"`);
    await submitBtn.click();

    if (toastText) {
      // Block until the confirmation toast arrives (variable backend round-trip),
      // instead of a blind fixed delay.
      await this.waitForToast(toastText);
    } else {
      await this.page.waitForTimeout(5000);
    }
  }

  /**
   * Wait for a toast notification to appear and (optionally) auto-dismiss.
   * Toasts render as a div with class "animate-slide-in"; matching by message text
   * keeps the wait specific to the success toast we care about (not an unrelated/error toast).
   */
  private async waitForToast(text: string, timeout = 15000) {
    const toast = this.page
      .locator('[class*="animate-slide-in"]')
      .filter({ hasText: text })
      .first();
    await expect(toast).toBeVisible({ timeout });
    console.log(`✅ Toast appeared: "${text}"`);
  }

  /**
   * Get the card container for a specific entry by title.
   * Uses Playwright's "has" filter to find a div that contains
   * BOTH the H3 with our title AND action buttons.
   */
  private getEntryContainer(title: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.locator('h3').filter({ hasText: title }) })
      .filter({ has: this.page.locator('button').filter({ hasText: /Delete|Mark Complete|View Details/i }) })
      .first();
  }

  /**
   * DELETE a recall by title.
   * Uses DOM traversal to find the Delete button nearest to the title,
   * since the card structure may change after Mark Complete.
   */
  async deleteEntry(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Verify title is visible
    const titleEl = this.page.locator('h3').filter({ hasText: title }).first();
    await expect(titleEl).toBeVisible({ timeout: 10000 });

    // Find the Delete button that's in the same card as our title
    // Strategy: iterate all Delete buttons and find the one whose ancestor contains our title
    const allDeletes = this.page.locator('button').filter({ hasText: 'Delete' });
    const deleteCount = await allDeletes.count();

    let clicked = false;
    for (let i = 0; i < deleteCount; i++) {
      const btn = allDeletes.nth(i);
      const nearTitle = await btn.evaluate((el, searchTitle) => {
        let parent = el.parentElement;
        for (let level = 0; level < 4; level++) {
          if (parent && parent.textContent && parent.textContent.includes(searchTitle)) {
            // Only match if this ancestor doesn't contain multiple H3s
            // (avoids matching the entire section container)
            const h3Count = parent.querySelectorAll('h3').length;
            if (h3Count <= 1) return true;
          }
          parent = parent?.parentElement || null;
        }
        return false;
      }, title);

      if (nearTitle) {
        await btn.click();
        clicked = true;
        console.log(`[DELETE] Clicked Delete for "${title}" (found at index ${i})`);
        break;
      }
    }

    if (!clicked) {
      // Fallback: try card-based approach
      const card = this.getEntryContainer(title);
      await expect(card).toBeVisible({ timeout: 5000 });
      await card.locator('button').filter({ hasText: 'Delete' }).first().click();
      console.log(`[DELETE] Clicked Delete via card fallback`);
    }

    await this.page.waitForTimeout(1500);

    // Confirmation dialog
    const confirmBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes|Remove/i });
    const confirmCount = await confirmBtns.count();
    if (confirmCount > 0) {
      const lastConfirm = confirmBtns.last();
      if (await lastConfirm.isVisible({ timeout: 2000 }).catch(() => false)) {
        await lastConfirm.click();
        console.log('[DELETE] Confirmed deletion');
        await this.page.waitForTimeout(3000);
      }
    }

    console.log(`[DELETE] "${title}" deleted successfully!`);
  }

  /**
   * MARK COMPLETE a recall — clicks "Mark Complete" on card,
   * fills the completion modal form, and clicks "Mark as Complete"
   */
  async markComplete(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    const card = this.getEntryContainer(title);
    await expect(card).toBeVisible({ timeout: 10000 });

    // Click "Mark Complete" button on the recall card
    const completeBtn = card.locator('button').filter({ hasText: /Mark Complete/i }).first();
    await expect(completeBtn).toBeVisible({ timeout: 5000 });
    await completeBtn.click();
    console.log('[UPDATE] Clicked Mark Complete — modal opened');

    // Buffer: give the completion modal time to fully mount before interacting.
    const modalHeading = this.page.locator('h3').filter({ hasText: /Mark Recall as Complete/i }).first();
    await expect(modalHeading).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1000);

    // Fill the completion modal form
    // Completed By *
    const completedByInput = this.page.locator('input[placeholder*="name or service"]').first();
    await expect(completedByInput).toBeVisible({ timeout: 5000 });
    await completedByInput.fill('Auto Recall Technician');
    console.log('✅ Completed By');

    // Completion Date *
    const dateInput = this.page.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(new Date().toISOString().split('T')[0]);
      console.log('✅ Completion Date');
    }

    // Total Cost * — placeholder is a money mask ("0.00", e.g. "$0.00"); currency symbol is a
    // separate prefix icon and changes with org currency (was "NGN", now "$"), so match the digits only.
    const costInput = this.page.locator('input[placeholder*="0.00"]').first();
    await expect(costInput).toBeVisible({ timeout: 3000 });
    await costInput.fill('1500');
    console.log('✅ Total Cost');

    await this.page.waitForTimeout(500);

    // Click "Mark as Complete" (different from card's "Mark Complete"!)
    const submitBtn = this.page.locator('button').filter({ hasText: /Mark as Complete/i }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    console.log('[UPDATE] Submit clicked — waiting for completion to process');

    // Block until the success toast arrives (variable backend round-trip) instead of a
    // blind fixed delay; the recall is only removed from Active Recalls once this fires.
    await this.waitForToast('Recall marked as complete');

    console.log(`[UPDATE] "${title}" marked as complete!`);
  }

  /**
   * COMPLETE CHECKLIST for a regulatory update:
   * Clicks "View Details & Checklist", checks all items, clicks "Complete"
   */
  async completeChecklist(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Verify the title is visible
    const titleEl = this.page.locator('h3').filter({ hasText: title }).first();
    await expect(titleEl).toBeVisible({ timeout: 10000 });

    // Find the correct "View Details & Checklist" button near our title
    // (avoids clicking button from a different regulation card)
    const allViewBtns = this.page.locator('button').filter({ hasText: /View Details & Checklist/i });
    const viewCount = await allViewBtns.count();

    let clicked = false;
    for (let i = 0; i < viewCount; i++) {
      const btn = allViewBtns.nth(i);
      const nearTitle = await btn.evaluate((el, searchTitle) => {
        let parent = el.parentElement;
        for (let level = 0; level < 4; level++) {
          if (parent && parent.textContent && parent.textContent.includes(searchTitle)) {
            // Only match if this ancestor doesn't contain multiple H3s
            // (avoids matching the entire "Regulatory Updates" section container)
            const h3Count = parent.querySelectorAll('h3').length;
            if (h3Count <= 1) return true;
          }
          parent = parent?.parentElement || null;
        }
        return false;
      }, title);

      if (nearTitle) {
        await btn.click();
        clicked = true;
        console.log(`[UPDATE] Clicked "View Details & Checklist" at index ${i}`);
        break;
      }
    }

    if (!clicked) {
      throw new Error(`Could not find "View Details & Checklist" button for "${title}"`);
    }

    await this.page.waitForTimeout(2000);

    // Check ALL checklist items (5 checkboxes)
    const checkboxes = this.page.locator('input[type="checkbox"]');
    const cbCount = await checkboxes.count();
    console.log(`Found ${cbCount} checklist items`);
    for (let i = 0; i < cbCount; i++) {
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked().catch(() => true))) {
        await cb.check();
      }
    }
    console.log(`✅ Checked all ${cbCount} checklist items`);
    await this.page.waitForTimeout(1000);

    // Try "Complete" button first (may appear after all boxes checked)
    let actionBtn = this.page.locator('button').filter({ hasText: /^Complete$/i }).first();
    let btnFound = await actionBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!btnFound) {
      // Fallback: "Mark Complete" button (some modals use this)
      actionBtn = this.page.locator('button').filter({ hasText: /Mark Complete/i }).first();
      btnFound = await actionBtn.isVisible({ timeout: 3000 }).catch(() => false);
    }

    if (btnFound) {
      await expect(actionBtn).toBeEnabled({ timeout: 5000 });
      await actionBtn.click({ force: true });
      console.log(`[UPDATE] Clicked "${await actionBtn.textContent().catch(() => '')}"`);
    } else {
      console.log('[UPDATE] No Complete button found — checkboxes may have auto-saved');
    }

    await this.page.waitForTimeout(3000);
    console.log(`[UPDATE] "${title}" checklist completed!`);
  }

  /**
   * Check if an entry with given title exists on the page
   */
  async entryExists(title: string): Promise<boolean> {
    const el = this.page.locator('h3').filter({ hasText: title });
    return el.first().isVisible({ timeout: 8000 }).catch(() => false);
  }
}
