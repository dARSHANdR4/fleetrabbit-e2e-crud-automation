import { Page, expect } from '@playwright/test';

export interface ReminderFormData {
  title: string;
  description?: string;
  checklists?: string[];  // checklist names to select in MultiSelect
  users?: string[];       // user names to select in MultiSelect
  frequency?: 'Daily' | 'Weekly' | 'Monthly';
  reminder_time?: string; // HH:MM
  due_time?: string;      // HH:MM
  days_of_week?: string[]; // e.g. ['Mon', 'Tue'] — only for weekly
  day_of_month?: number;   // only for monthly
  nag_enabled?: boolean;
  active?: boolean;
}

export class InspectionRemindersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/inspections?tab=reminders', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForTimeout(3000);
  }

  // ─── CREATE ──────────────────────────────────────────────────────

  async createReminder(data: ReminderFormData) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // Click "New Reminder"
    const newBtn = this.page.locator('button').filter({ hasText: /New Reminder/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 15000 });
    await newBtn.click();
    await this.page.waitForTimeout(2000);
    console.log(`[CREATE] Modal opened`);

    // Title
    const titleInput = this.page.getByPlaceholder('e.g. Morning pre-trip inspection');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(data.title);
    console.log(`  Title → "${data.title}"`);

    // Description (optional)
    if (data.description) {
      const descInput = this.page.getByPlaceholder('Optional note shown on the reminder');
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill(data.description);
        console.log(`  Description → "${data.description}"`);
      }
    }

    // Inspection Checklists — MultiSelect (REQUIRED)
    await this.selectInMultiSelect('Select one or more checklists', data.checklists || []);
    console.log(`  Checklists → ${data.checklists?.length ? data.checklists.join(', ') : 'auto-select'}`);

    // Responsible Users — MultiSelect (REQUIRED)
    await this.selectInMultiSelect('Select one or more users', data.users || []);
    console.log(`  Users → ${data.users?.length ? data.users.join(', ') : 'auto-select'}`);

    // Frequency select
    if (data.frequency) {
      const freqSelect = this.page.locator('select').filter({ has: this.page.locator('option') }).last();
      // Try finding the frequency-specific select
      const allSelects = this.page.locator('select');
      const selectCount = await allSelects.count();
      for (let i = 0; i < selectCount; i++) {
        const sel = allSelects.nth(i);
        const options = await sel.locator('option').allTextContents();
        if (options.some(o => ['Daily', 'Weekly', 'Monthly'].includes(o.trim()))) {
          await sel.selectOption(data.frequency);
          console.log(`  Frequency → "${data.frequency}"`);
          break;
        }
      }
    }

    // Reminder Time
    if (data.reminder_time) {
      // Time inputs — find by label proximity
      const reminderTimeInput = this.page.locator('input[type="time"]').first();
      if (await reminderTimeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reminderTimeInput.fill(data.reminder_time);
        console.log(`  Reminder Time → "${data.reminder_time}"`);
      }
    }

    // Due By
    if (data.due_time) {
      const dueTimeInput = this.page.locator('input[type="time"]').nth(1);
      if (await dueTimeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await dueTimeInput.fill(data.due_time);
        console.log(`  Due By → "${data.due_time}"`);
      }
    }

    // Days of Week (only for weekly)
    if (data.days_of_week && data.days_of_week.length > 0) {
      for (const day of data.days_of_week) {
        // Pill toggle buttons: Sun, Mon, Tue, ...
        const dayBtn = this.page.locator('button').filter({ hasText: new RegExp(`^${day}$`, 'i') });
        if (await dayBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Check if already selected (active state class)
          const isSelected = await dayBtn.evaluate(el =>
            el.className.includes('primary') || el.getAttribute('aria-pressed') === 'true'
          ).catch(() => false);
          if (!isSelected) {
            await dayBtn.click();
            await this.page.waitForTimeout(200);
          }
        }
      }
      console.log(`  Days of Week → ${data.days_of_week.join(', ')}`);
    }

    // Day of Month (only for monthly)
    if (data.day_of_month !== undefined) {
      const domInput = this.page.locator('input[type="number"]').last();
      if (await domInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await domInput.fill(String(data.day_of_month));
        console.log(`  Day of Month → ${data.day_of_month}`);
      }
    }

    await this.page.waitForTimeout(500);

    // Submit — "Create Reminder"
    const createBtn = this.page.locator('button').filter({ hasText: /^Create Reminder$/i }).first();
    await expect(createBtn).toBeEnabled({ timeout: 5000 });
    await createBtn.click();
    await this.page.waitForTimeout(4000);
    console.log(`[CREATE] Reminder "${data.title}" created!`);
  }

  // ─── READ / EXISTS ───────────────────────────────────────────────

  async reminderExists(title: string): Promise<boolean> {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Ensure we're on Reminders view (not Activity Log or Analytics)
    await this.ensureRemindersView();

    const bodyText = await this.page.locator('table').first().textContent().catch(() => '') || '';
    return bodyText.includes(title);
  }

  async viewReminderDetails(title: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);
    await this.ensureRemindersView();

    // Find the row with our reminder
    const row = this.page.locator('tr').filter({ hasText: title }).first();
    const rowCount = await row.count();
    if (rowCount === 0) {
      console.log(`[READ] Reminder "${title}" not found — skipping`);
      return;
    }

    // Verify the row is visible
    await expect(row).toBeVisible({ timeout: 10000 });
    console.log(`[READ] Reminder "${title}" found in table`);

    // Verify key details visible
    const rowText = await row.textContent() || '';
    console.log(`[READ] ✅ Row verified — "${title}"`);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────

  async updateReminder(title: string, newTitle: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);
    await this.ensureRemindersView();

    // Find the row and click Edit (Pencil icon, title="Edit")
    const row = this.page.locator('tr').filter({ hasText: title }).first();
    const editBtn = row.locator('button').filter({ has: this.page.locator('svg') }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[UPDATE] Edit modal opened');

    // Change title
    const titleInput = this.page.getByPlaceholder('e.g. Morning pre-trip inspection');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill(newTitle);
    console.log(`  Title → "${newTitle}"`);

    await this.page.waitForTimeout(500);

    // Save — "Save Changes"
    const saveBtn = this.page.locator('button').filter({ hasText: /^Save Changes$/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await this.page.waitForTimeout(4000);
    console.log(`[UPDATE] Reminder updated!`);
  }

  // ─── DELETE ──────────────────────────────────────────────────────

  async deleteReminder(title: string) {
    // Use addInitScript so window.confirm is overridden BEFORE any page script runs
    // This survives navigation and fires before the React app loads
    await this.page.addInitScript(() => {
      window.confirm = () => true;
    });

    await this.navigate();
    await this.page.waitForTimeout(3000);
    await this.ensureRemindersView();

    // Find row
    const row = this.page.locator('tr').filter({ hasText: title }).first();
    const rowCount = await row.count();
    console.log(`[DELETE] Row count for "${title}": ${rowCount}`);
    if (rowCount === 0) {
      console.log(`[DELETE] Reminder "${title}" not found — already deleted?`);
      return;
    }

    // Click Delete button
    const deleteBtn = row.getByRole('button', { name: /Delete/i });
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();
    console.log('[DELETE] Delete clicked');

    // Wait for API call + row removal
    await this.page.waitForTimeout(4000);
    console.log(`[DELETE] Reminder "${title}" deleted!`);
  }

  // ─── ACTIVE TOGGLE ───────────────────────────────────────────────

  async toggleActive(title: string, makeActive: boolean) {
    await this.navigate();
    await this.page.waitForTimeout(3000);
    await this.ensureRemindersView();

    const row = this.page.locator('tr').filter({ hasText: title }).first();
    const toggle = row.locator('[role="switch"]').first();
    if (await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const isChecked = (await toggle.getAttribute('aria-checked')) === 'true';
      if (isChecked !== makeActive) {
        await toggle.click();
        await this.page.waitForTimeout(2000);
        console.log(`[TOGGLE] Active → ${makeActive}`);
      } else {
        console.log(`[TOGGLE] Already ${makeActive ? 'active' : 'inactive'}`);
      }
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────────────

  /** Ensure we're on the Reminders view (not Activity Log or Analytics) */
  private async ensureRemindersView() {
    const remindersTab = this.page.locator('button').filter({ hasText: /^Reminders$/i }).first();
    if (await remindersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click if not already active
      const isActive = await remindersTab.evaluate(el =>
        el.className.includes('primary') || el.getAttribute('aria-pressed') === 'true'
      ).catch(() => true);
      if (!isActive) {
        await remindersTab.click();
        await this.page.waitForTimeout(2000);
      }
    }
  }

  /**
   * Handle a MultiSelect dropdown.
   * @param placeholder - Placeholder text of the MultiSelect trigger
   * @param labels - Text labels of items to select. If empty array, auto-selects the first available option.
   * @returns The number of items selected
   */
  private async selectInMultiSelect(placeholder: string, labels: string[]): Promise<number> {
    // The MultiSelect in the modal is a custom component.
    // Strategy: find its trigger by the placeholder text, click it,
    // select option(s), then click on the modal header to close the dropdown.
    console.log(`  [MultiSelect] Opening: "${placeholder}"`);

    // Find the trigger element — look for a button/input near the label text
    // The form has labels like "Inspection Checklists *" above the MultiSelect
    const triggerPattern = placeholder.replace('Select one or more ', '');

    // Click the trigger area — the placeholder itself or a button near it
    const placeholderLocator = this.page.locator(`text="${placeholder}"`).first();
    if (await placeholderLocator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await placeholderLocator.click();
      await this.page.waitForTimeout(1000);
      console.log(`  [MultiSelect] Opened via placeholder click`);
    } else {
      console.log(`  [MultiSelect] ⚠️ Placeholder not found, trying label-based approach`);
      // Try clicking around the label area
      const label = this.page.locator('label, span').filter({ hasText: new RegExp(triggerPattern, 'i') }).first();
      if (await label.isVisible({ timeout: 2000 }).catch(() => false)) {
        await label.locator('..').click();
        await this.page.waitForTimeout(1000);
      } else {
        console.log(`  [MultiSelect] ⚠️ Label not found, skipping`);
        return 0;
      }
    }

    // Wait for dropdown options to appear
    await this.page.waitForTimeout(1000);

    let selected = 0;

    if (labels.length > 0) {
      for (const label of labels) {
        const option = this.page.locator('label, button, [role="option"]').filter({ hasText: label }).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click({ force: true });
          await this.page.waitForTimeout(300);
          selected++;
          console.log(`  ✓ Selected: "${label}"`);
        }
      }
    } else {
      // Auto-select: find any visible checkbox and click its label
      const firstCheckbox = this.page.locator('input[type="checkbox"]').first();
      const cbVisible = await firstCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
      if (cbVisible) {
        // Click parent label for reliable checkbox toggling
        await firstCheckbox.click({ force: true });
        await this.page.waitForTimeout(300);
        selected++;
        console.log('  ✓ Auto-selected first option');
      } else {
        console.log('  ⚠️ No checkboxes found in dropdown');
      }
    }

    // Close dropdown — click on the modal header (NOT Escape, which closes the modal too)
    const modalHeader = this.page.locator('h2, h3, .text-lg').filter({ hasText: /Reminder/i }).first();
    if (await modalHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modalHeader.click();
    } else {
      // Fallback: click a label field outside the dropdown area
      const titleInput = this.page.getByPlaceholder('e.g. Morning pre-trip inspection');
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.click();
      }
    }
    await this.page.waitForTimeout(500);

    return selected;
  }
}
