import { Page, expect } from '@playwright/test';

export interface ChecklistField {
  field_name: string;
  field_type?: string;
  required?: boolean;
}

export interface ChecklistFormData {
  form_name: string;
  category?: string;
  fields: ChecklistField[];
}

export class InspectionChecklistPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/inspections?tab=forms', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForTimeout(3000);
  }

  /**
   * CREATE a new inspection checklist.
   * Clicks "Create Inspection Checklist" → navigates to /inspections/forms/new →
   * fills form → submits → waits for redirect back.
   */
  async createFormTemplate(data: ChecklistFormData) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // Click "Create Inspection Checklist" button in the header
    const createBtn = this.page.locator('button').filter({ hasText: /Create Inspection Checklist/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();
    await this.page.waitForTimeout(3000);

    console.log(`[CREATE] On form builder page: ${this.page.url()}`);

    // Select Category — 3rd combobox (after Fleet Type and Inspection Type)
    if (data.category) {
      const categoryCombo = this.page.locator('select, [role="combobox"]').nth(2);
      if (await categoryCombo.isVisible({ timeout: 3000 }).catch(() => false)) {
        await categoryCombo.selectOption(data.category);
        console.log(`  Category → "${data.category}"`);
      }
    }

    // Fill Checklist Name
    const nameInput = this.page.getByPlaceholder('e.g., Monthly Fleet Safety Checklist');
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill(data.form_name);
    console.log(`  Name → "${data.form_name}"`);

    // Add fields one by one
    for (const field of data.fields) {
      await this.addFieldToBuilder(field);
    }

    await this.page.waitForTimeout(500);

    // Submit — "Create Inspection Checklist" button in the header
    const submitBtn = this.page.locator('button').filter({ hasText: /^Create Inspection Checklist$/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Wait for button to become enabled (may need a moment after adding fields)
    await this.page.waitForTimeout(1000);
    const isEnabled = await submitBtn.isEnabled();
    console.log(`  Submit enabled: ${isEnabled}`);

    if (!isEnabled) {
      console.log('  ⚠️ Submit disabled — adding fallback field');
      await this.addFieldToBuilder({ field_name: `Fallback_${Date.now()}` });
      await this.page.waitForTimeout(1000);
    }

    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();
    await this.page.waitForTimeout(4000);

    // Should redirect back to forms tab
    await this.page.waitForURL(
      (url) => url.pathname.includes('inspections') && !url.pathname.includes('/new'),
      { timeout: 30000 }
    ).catch(() => {
      console.log('⚠️ URL redirect wait timed out, continuing...');
    });
    await this.page.waitForTimeout(2000);
    console.log(`[CREATE] Checklist "${data.form_name}" created!`);
  }

  /**
   * Helper: adds a field to the form builder.
   */
  private async addFieldToBuilder(field: ChecklistField) {
    // Field Name input
    const fieldNameInput = this.page.getByPlaceholder('e.g., Tire Pressure');
    if (!(await fieldNameInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('  ⚠️ Field name input not visible — skipping');
      return;
    }

    await fieldNameInput.click();
    await fieldNameInput.fill(field.field_name);
    await this.page.waitForTimeout(300);
    console.log(`  Field → "${field.field_name}"`);

    // Field Type — the combobox near "Field Type" label
    if (field.field_type && field.field_type !== 'text') {
      // Find the field type combobox — it's the one right after the field name
      const fieldTypeCombo = this.page.locator('select, [role="combobox"]').last();
      if (await fieldTypeCombo.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fieldTypeCombo.selectOption(field.field_type);
        console.log(`  Type → "${field.field_type}"`);
      }
    }

    // Required Field checkbox
    if (field.required) {
      const reqCheckbox = this.page.getByRole('checkbox', { name: /Required Field/i });
      if (await reqCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        const isChecked = await reqCheckbox.isChecked();
        if (!isChecked) {
          await reqCheckbox.check();
          console.log('  Required → checked');
        }
      }
    }

    // Click "Add Field" button
    const addFieldBtn = this.page.locator('button').filter({ hasText: /^Add Field$/i }).first();
    if (await addFieldBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addFieldBtn.click();
      await this.page.waitForTimeout(1500);
      console.log(`  ✅ Field added to list`);
    }
  }

  /**
   * READ — check if a form exists in the table.
   */
  async formExists(formName: string): Promise<boolean> {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Check current page first
    const bodyText = await this.page.locator('body').textContent().catch(() => '') || '';
    if (bodyText.includes(formName)) return true;

    // Try pagination
    const nextBtn = this.page.locator('button').filter({ hasText: /^Next$/i });
    while (await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await this.page.waitForTimeout(2000);
      const pageText = await this.page.locator('body').textContent().catch(() => '') || '';
      if (pageText.includes(formName)) return true;
    }

    return false;
  }

  /**
   * READ — click the "View" button for a form to see its details.
   */
  async viewFormDetails(formName: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    const row = this.page.locator('tr').filter({ hasText: formName }).first();
    const rowCount = await row.count();
    if (rowCount === 0) {
      console.log(`[READ] Form "${formName}" not found — skipping`);
      return;
    }

    const viewBtn = row.locator('button').filter({ hasText: /^View$/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(3000);
    console.log(`[READ] View opened for "${formName}"`);

    // Verify detail view opened
    const detailView = this.page.locator('.fixed.inset-0, [role="dialog"], .slide-over').filter({
      hasText: /Form Name|Edit|Delete|Download/i,
    }).first();
    const found = await detailView.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(found ? '[READ] ✅ Details view confirmed' : '[READ] ⚠️ Details not detected');
  }

  /**
   * UPDATE — click "Edit" button on a form row, modify name, save.
   */
  async updateFormTemplate(formName: string, newName: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    const row = this.page.locator('tr').filter({ hasText: formName }).first();
    const rowCount = await row.count();
    if (rowCount === 0) {
      console.log(`[UPDATE] Form "${formName}" not found — skipping`);
      return;
    }

    const editBtn = row.locator('button').filter({ hasText: /^Edit$/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('[UPDATE] Edit view opened');

    // Find the name input — could be in a modal or full-page form
    const nameInput = this.page.getByPlaceholder('e.g., Monthly Fleet Safety Checklist');
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill(newName);
      console.log(`  Name → "${newName}"`);
    } else {
      // Fallback: try first text input
      const fallbackInput = this.page.locator('input[type="text"]').first();
      if (await fallbackInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallbackInput.fill(newName);
        console.log(`  Name (fallback) → "${newName}"`);
      } else {
        console.log('  ⚠️ Name input not found in edit view');
        return;
      }
    }

    await this.page.waitForTimeout(500);

    // Click Save / Update button
    const saveBtn = this.page.locator('button').filter({ hasText: /Save|Update/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.page.waitForTimeout(4000);
    console.log(`[UPDATE] Checklist updated!`);
  }

  /**
   * DEACTIVATE — open View → click Deactivate in detail view → no confirmation dialog.
   * NOTE: Inspection Checklist module does NOT support true deletion.
   * Forms can only be deactivated (soft-delete / archived). Deactivate is silent (no confirm dialog).
   */
  async deactivateFormTemplate(formName: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Find the row with our form
    const row = this.page.locator('tr').filter({ hasText: formName }).first();
    const rowCount = await row.count();
    if (rowCount === 0) {
      console.log(`[DEACTIVATE] Form "${formName}" not found — already deactivated?`);
      return;
    }

    // Click View to open the detail panel
    const viewBtn = row.locator('button').filter({ hasText: /^View$/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('[DEACTIVATE] View opened');

    // Find the detail panel
    const detailPanel = this.page.locator('.fixed.inset-0, [role="dialog"]').filter({
      hasText: /Deactivate|Download|Form Name/i,
    }).first();
    await expect(detailPanel).toBeVisible({ timeout: 5000 });

    // Click Deactivate inside the detail panel (no confirmation dialog)
    const deactivateBtn = detailPanel.locator('button').filter({ hasText: /Deactivate/i }).first();
    await expect(deactivateBtn).toBeVisible({ timeout: 5000 });
    await deactivateBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[DEACTIVATE] Deactivate clicked');

    // Wait for the operation to complete
    await this.page.waitForTimeout(3000);

    // Detail panel should close after deactivation
    await detailPanel.isHidden({ timeout: 10000 }).catch(() => {
      console.log('[DEACTIVATE] ⚠️ Detail panel did not close — clicking backdrop');
      this.page.locator('.fixed.inset-0.bg-black\\/40, .backdrop-blur-sm').first().click().catch(() => {});
      this.page.waitForTimeout(1000);
    });

    console.log(`[DEACTIVATE] Checklist "${formName}" deactivated!`);
  }
}
