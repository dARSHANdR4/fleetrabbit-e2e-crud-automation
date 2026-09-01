import { Page, expect } from '@playwright/test';

export class InspectionReportsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/inspections?tab=reports', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await this.page.waitForTimeout(3000);
  }

  // ─── CREATE (3-step inspection wizard) ───────────────────────────

  async createReport(): Promise<string> {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // Click "Start new inspection" (admin) / "Submit Inspection" (driver)
    const startBtn = this.page.locator('button').filter({ hasText: /Start new inspection|Submit Inspection/i }).first();
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click();
    } else {
      await this.page.goto('https://stg.fleetrabbit.com/en/inspections/new', {
        waitUntil: 'domcontentloaded', timeout: 60000,
      });
    }
    await this.page.waitForTimeout(5000);

    const form = this.page.locator('#inspection-report-form');
    await expect(form).toBeVisible({ timeout: 15000 });
    console.log('[CREATE] On inspection form (Step 1)');

    // ── Step 1: Vehicle, Inspector, Type, Date ──
    // Vehicle: text input (placeholder "Select <Vehicle>") → type → click <li>
    const vehicleInput = form.locator('input[type="text"][placeholder*="Select"]').first();
    await vehicleInput.waitFor({ state: 'visible', timeout: 10000 });
    await vehicleInput.click();
    await this.page.waitForTimeout(500);
    // Type a partial unit number to filter (fallback: type nothing to list all)
    await vehicleInput.fill('');
    await vehicleInput.pressSequentially('ND', { delay: 30 });
    await this.page.waitForTimeout(1500);

    // Click first vehicle <li> in dropdown
    const vehicleOption = form.locator('ul.absolute li').first();
    await expect(vehicleOption).toBeVisible({ timeout: 5000 });
    const vehicleText = (await vehicleOption.textContent() || '').trim();
    await vehicleOption.click();
    await this.page.waitForTimeout(1500);
    console.log(`  Vehicle → "${vehicleText}"`);

    // Inspector is auto-selected to current user (skip)
    // Inspection Type default 'general', Date auto-filled (skip)

    // Click "Next: Select Checklist"
    await this.clickButton(/Next: Select Checklist/i);
    await this.page.waitForTimeout(2000);
    console.log('[CREATE] Step 2: Select Checklist');

    // ── Step 2: Select first checklist card ──
    const checklistCard = form.locator('div.cursor-pointer.border.rounded-lg').first();
    await expect(checklistCard).toBeVisible({ timeout: 15000 });
    await checklistCard.click();
    await this.page.waitForTimeout(1500);

    // Click "Next: Do Inspection"
    await this.clickButton(/Next: Do Inspection/i);
    await this.page.waitForTimeout(2000);
    console.log('[CREATE] Step 3: Do Inspection');

    // ── Step 3: Pass All (admin) + Signature + Submit ──
    // "Pass All" button — admin only
    const passAllBtn = this.page.locator('button').filter({ hasText: /Pass All/i }).first();
    if (await passAllBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await passAllBtn.click();
      await this.page.waitForTimeout(1000);
      console.log('  Pass All → clicked');
    } else {
      console.log('  ⚠️ Pass All not available — inspecting items individually');
    }

    // Signature — REQUIRED before submit (canvas mouse-draw)
    await this.drawSignature();

    // Monitor POST response for report_number.
    // A 409 DUPLICATE_INSPECTION means this vehicle+type+day already has a
    // report (48hr window) — reuse its number so READ/UPDATE/DELETE still work.
    let reportNumber = '';
    const respPromise = this.page.waitForResponse(
      r => r.url().includes('/api/inspections/reports') && r.request().method() === 'POST',
      { timeout: 60000 }
    ).then(async r => {
      const body = await r.json().catch(() => ({}));
      if (r.status() === 409 || body?.code === 'DUPLICATE_INSPECTION') {
        reportNumber = body?.existing_report_number || body?.existing_report_id || '';
        console.log(`[CREATE] API: 409 DUPLICATE → existing ${reportNumber}`);
      } else {
        reportNumber = body?.data?.report_number || body?.data?._id || '';
        console.log(`[CREATE] API: ${r.status()} → ${reportNumber}`);
      }
      return r;
    }).catch(() => null);

    // Submit — "Submit Inspection" button
    const submitBtn = this.page.locator('button[form="inspection-report-form"][type="submit"]');
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();
    console.log('[CREATE] Submit Inspection clicked');
    await respPromise;

    // Wait for redirect to list
    await this.page.waitForTimeout(3000);
    await this.page.waitForURL(
      u => u.pathname.includes('inspections') && !u.pathname.includes('/new'),
      { timeout: 15000 }
    ).catch(() => {});

    console.log(`[CREATE] Done → ${reportNumber}`);
    return reportNumber;
  }

  // ─── READ (kebab → View details) ─────────────────────────────────

  async openDetailsViaKebab(reportNumber: string) {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Narrow the list to this report via the search box (filters across all
    // pages), then open that card's kebab menu.
    const searchInput = this.page.getByPlaceholder(/Search by ID, vehicle, inspector/i).first();
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(reportNumber);
      await this.page.waitForTimeout(2000);
    }

    // Cards view is the default: each card shows report_number in its <h3>.
    const card = this.page
      .locator('div.rounded-xl.border.border-gray-200')
      .filter({ hasText: reportNumber })
      .first();
    await expect(card).toBeVisible({ timeout: 15000 });

    const kebab = card.locator('button[aria-label="Actions"]').first();
    await expect(kebab).toBeVisible({ timeout: 15000 });
    await kebab.click();
    await this.page.waitForTimeout(1500);

    // Menu item "View details" (rendered in a portal on document.body)
    const viewBtn = this.page.locator('button').filter({ hasText: /^View details$/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 5000 });
    await viewBtn.click();
    await this.page.waitForTimeout(3000);
    console.log(`[READ] Opened detail modal for: ${reportNumber}`);
  }

  // ─── UPDATE (Amend) ──────────────────────────────────────────────

  async amendReport() {
    // Click "Edit Report" in the detail modal
    const editBtn = this.page.locator('button').filter({ hasText: /Edit Report/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[UPDATE] "Amend Inspection Report" modal opened');

    // Fill required "Reason for Amendment" textarea
    // (Find by label "Reason for Amendment" → parent → textarea)
    const reasonLabel = this.page.locator('label').filter({ hasText: /Reason for Amendment/i }).first();
    const reasonTA = reasonLabel.locator('..').locator('textarea').first();
    if (await reasonTA.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reasonTA.fill(`QA amendment ${Date.now()}`);
      console.log('  Reason for Amendment → filled');
    } else {
      // Fallback: last textarea in modal
      await this.page.locator('textarea').last().fill(`QA amendment ${Date.now()}`);
    }

    // Click "Save Amendments"
    const saveBtn = this.page.locator('button').filter({ hasText: /Save Amendments/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('[UPDATE] Save Amendments clicked');
  }

  // ─── DELETE ──────────────────────────────────────────────────────

  async deleteReport() {
    // Click "Delete" in the detail modal
    const deleteBtn = this.page.locator('button').filter({ hasText: /^Delete$/i }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await this.page.waitForTimeout(2000);
    console.log('[DELETE] Delete clicked');

    // Radix AlertDialog "Delete Inspection Report"
    const confirmDialog = this.page.locator('[role="alertdialog"]').filter({
      hasText: /Delete Inspection Report/i,
    }).first();
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    const confirmBtn = confirmDialog.locator('button').filter({ hasText: /^Delete$/i }).first();
    await confirmBtn.click();
    await this.page.waitForTimeout(3000);
    console.log('[DELETE] Done!');
  }

  // ─── HELPERS ─────────────────────────────────────────────────────

  private async clickButton(text: RegExp) {
    const btn = this.page.locator('button').filter({ hasText: text }).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
  }

  /**
   * Draw a signature on the inspection form's <canvas> using mouse events.
   * The form requires `signatureData` (set on mouseup) before submit.
   */
  private async drawSignature() {
    const canvas = this.page.locator('canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);

    const box = await canvas.boundingBox();
    if (!box) {
      console.log('[SIGNATURE] ⚠️ Canvas not found');
      return;
    }

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Draw a signature-like squiggle (mousedown → moves → mouseup)
    await this.page.mouse.move(box.x + 30, cy);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + 80, cy - 35, { steps: 8 });
    await this.page.mouse.move(box.x + 150, cy + 35, { steps: 8 });
    await this.page.mouse.move(box.x + 220, cy - 25, { steps: 8 });
    await this.page.mouse.move(box.x + 300, cy + 20, { steps: 8 });
    await this.page.mouse.move(box.x + 380, cy, { steps: 8 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);
    console.log('[SIGNATURE] Drawn on canvas');
  }
}
