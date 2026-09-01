import { Page, expect } from '@playwright/test';

export interface IncidentFormData {
  incident_type?: string;
  severity?: string;
  description?: string;
}

export class IncidentReportsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/inspections?tab=incidents', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForTimeout(3000);
  }

  // ─── CREATE ──────────────────────────────────────────────────────

  async createIncident(data: IncidentFormData): Promise<string> {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // Click "Report Incident"
    const reportBtn = this.page.locator('button').filter({ hasText: /Report Incident/i }).first();
    if (await reportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reportBtn.click();
    } else {
      await this.page.goto('https://stg.fleetrabbit.com/en/inspections/incidents/new', {
        waitUntil: 'domcontentloaded', timeout: 60000,
      });
    }
    await this.page.waitForTimeout(5000);
    const form = this.page.locator('#incident-report-form');
    await expect(form).toBeVisible({ timeout: 15000 });

    // Wait for React context
    const reportedBy = form.locator('input[readonly]').first();
    await reportedBy.waitFor({ state: 'visible', timeout: 10000 });
    for (let i = 0; i < 20; i++) {
      const v = await reportedBy.inputValue().catch(() => '');
      if (v && v !== 'Loading...') break;
      await this.page.waitForTimeout(500);
    }

    // Fill form
    await form.locator('select').first().scrollIntoViewIfNeeded();
    await form.locator('select').first().selectOption(data.incident_type || 'accident');
    await form.locator('input[type="date"]').first().fill(new Date().toISOString().split('T')[0]);
    await form.locator('input[type="time"]').first().fill('10:30');
    await form.locator('select').nth(1).selectOption(data.severity || 'medium');

    // Location
    const locInput = form.locator('input[placeholder*="Main St"]').first();
    await locInput.scrollIntoViewIfNeeded();
    await locInput.click();
    await this.page.waitForTimeout(300);
    await locInput.fill('');
    await locInput.pressSequentially('Miami', { delay: 50 });
    await this.page.waitForTimeout(1500);
    const dropBtn = this.page.locator('.absolute.z-50 button[type="button"]').first();
    if (await dropBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await dropBtn.click();
      await this.page.waitForTimeout(500);
    } else {
      await locInput.fill('Miami, FL, USA');
    }

    // Vehicle
    const vehSelect = form.locator('select').nth(2);
    await vehSelect.scrollIntoViewIfNeeded();
    const opts = await vehSelect.locator('option').allTextContents();
    const real = opts.filter(o => !o.startsWith('Select') && !o.startsWith('--') && o.trim());
    if (real.length > 0) {
      const val = await vehSelect.locator('option').filter({ hasText: real[0] }).first().getAttribute('value');
      if (val) await vehSelect.selectOption(val);
    }

    // Description — use placeholder to target the right textarea
    const descTA = form.locator('textarea[placeholder*="detailed account"]');
    await descTA.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    const desc = data.description!;
    await descTA.fill(desc);

    // Monitor API response to capture incident number
    let incidentNumber = '';
    const respPromise = this.page.waitForResponse(
      r => r.url().includes('/api/inspections/incidents') && r.request().method() === 'POST',
      { timeout: 60000 }
    ).then(async r => {
      const body = await r.json().catch(() => ({}));
      incidentNumber = body?.data?.incident_number || body?.incident_number || '';
      // 409 duplicate: extract INC-XXXXX from error message
      if (!incidentNumber && r.status() === 409) {
        const match = (body?.error || '').match(/\(([A-Z0-9-]+)\)/);
        incidentNumber = match ? match[1] : '';
      }
      console.log(`[CREATE] API: ${r.status()} → ${incidentNumber || '(no number)'}`);
      return r;
    }).catch(() => null);

    // Submit
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);
    const submitBtn = this.page.locator('button[form="incident-report-form"][type="submit"]');
    await submitBtn.click();
    await respPromise;

    // Wait for redirect to list
    await this.page.waitForTimeout(3000);
    await this.page.waitForURL(
      u => u.pathname.includes('inspections') && !u.pathname.includes('/new'),
      { timeout: 15000 }
    ).catch(() => {});

    console.log(`[CREATE] Done → ${incidentNumber}`);
    return incidentNumber || desc;
  }

  // ─── READ ────────────────────────────────────────────────────────

  async searchAndOpen(incidentNumber: string) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    const searchInput = this.page.getByPlaceholder('Search incidents...');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(incidentNumber);
      await this.page.waitForTimeout(2000);
    }

    const viewBtn = this.page.locator('button').filter({ hasText: /View Details/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(3000);
    console.log(`[READ] Opened detail modal for: ${incidentNumber}`);
  }

  // ─── UPDATE ──────────────────────────────────────────────────────

  async editIncidentInModal(newSeverity: string = 'high') {
    // Click Edit — reveals inline panel inside the modal
    const editBtn = this.page.locator('button').filter({ hasText: /^Edit$/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[UPDATE] Edit clicked — inline panel revealed');

    // Inline edit panel: bg-primary-50/40 border-b border-primary-200
    const editPanel = this.page.locator('.bg-primary-50\\/40').first();
    await expect(editPanel).toBeVisible({ timeout: 5000 });

    // Change severity (first select in the edit panel)
    await editPanel.locator('select').first().selectOption(newSeverity);
    console.log(`[UPDATE] Severity → ${newSeverity}`);

    // Save
    const saveBtn = editPanel.locator('button').filter({ hasText: /Save Changes/i }).first();
    await saveBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('[UPDATE] Saved!');
  }

  // ─── DELETE ──────────────────────────────────────────────────────

  async deleteIncidentFromModal() {
    // Click Delete inside the detail modal
    const deleteBtn = this.page.locator('button').filter({ hasText: /^Delete$/i }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[DELETE] Delete clicked');

    // useConfirm() Radix AlertDialog
    const confirmDialog = this.page.locator('[role="alertdialog"]').filter({
      hasText: /Delete Incident Report/i,
    }).first();

    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    const confirmBtn = confirmDialog.locator('button').filter({ hasText: /^Delete$/i }).first();
    await confirmBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('[DELETE] Done!');
  }
}
