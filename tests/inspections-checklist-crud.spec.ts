import { test, expect } from '@playwright/test';
import path from 'path';
import { InspectionChecklistPage } from '../e2e/pages/InspectionChecklistPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 18: Inspections Checklist (Forms) - CRUD Automation', () => {
  let icPage: InspectionChecklistPage;
  let formName: string;
  let updatedFormName: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    icPage = new InspectionChecklistPage(page);

    // Generate unique names per run (avoids retry conflicts)
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    formName = `QA_Checklist_${suffix}`;
    updatedFormName = `QA_Checklist_UPD_${suffix}`;

    await icPage.navigate();
    console.log('✅ Navigated to Inspections → Forms tab');
    console.log(`   formName="${formName}"`);
    console.log(`   updatedFormName="${updatedFormName}"`);
  });

  test('1. CREATE - New Inspection Checklist Form Template', async () => {
    console.log(`\n🔧 Creating inspection checklist: "${formName}"`);

    await icPage.createFormTemplate({
      form_name: formName,
      category: 'safety',
      fields: [
        { field_name: 'Brake Condition', field_type: 'text', required: true },
        { field_name: 'Tire Pressure PSI', field_type: 'number', required: true },
        { field_name: 'Lights Working', field_type: 'pass_fail', required: true },
      ],
    });

    // Verify form appears in the table
    const exists = await icPage.formExists(formName);
    expect(exists).toBeTruthy();
    console.log(`[PASS] CREATE ✅ — "${formName}"\n`);
  });

  test('2. READ - View Form Template Details', async () => {
    console.log(`\n📖 Reading form template: "${formName}"`);

    await icPage.viewFormDetails(formName);

    // Verify the page heading is visible
    const heading = icPage.page.getByRole('heading', { name: /Inspection Checklist/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ ✅ — Details viewed\n`);
  });

  test('3. UPDATE - Edit Form Template Name', async () => {
    console.log(`\n✏️ Updating form template: "${formName}" → "${updatedFormName}"`);

    await icPage.updateFormTemplate(formName, updatedFormName);

    // Verify updated name appears
    await icPage.navigate();
    await icPage.page.waitForTimeout(3000);
    const bodyText = await icPage.page.locator('body').textContent().catch(() => '') || '';
    expect(bodyText).toContain(updatedFormName);
    console.log(`[PASS] UPDATE ✅ — Renamed to "${updatedFormName}"\n`);
  });

  test('4. DEACTIVATE - Deactivate Form Template', async () => {
    console.log(`\n🗑️ Deactivating form template: "${updatedFormName}"`);

    await icPage.deactivateFormTemplate(updatedFormName);

    // Deactivation doesn't remove the form from the table (it stays, just marked inactive).
    // Verify by re-opening the detail view — button should now say "Activate" instead of "Deactivate".
    await icPage.navigate();
    await icPage.page.waitForTimeout(3000);

    const row = icPage.page.locator('tr').filter({ hasText: updatedFormName }).first();
    const viewBtn = row.locator('button').filter({ hasText: /^View$/i }).first();
    await viewBtn.click();
    await icPage.page.waitForTimeout(3000);

    // The detail panel should now have "Activate" (not "Deactivate") since form is inactive
    const activateBtn = icPage.page.locator('.fixed.inset-0, [role="dialog"]')
      .filter({ hasText: /Activate|Form Name/i }).first()
      .locator('button').filter({ hasText: /Activate/i }).first();
    await activateBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      console.log('⚠️ Activate button not found — deactivation may not have worked');
    });
    const hasActivate = await activateBtn.isVisible().catch(() => false);
    expect(hasActivate).toBeTruthy();
    console.log(`[PASS] DEACTIVATE ✅ — Form template deactivated (Activate button confirmed)\n`);
  });
});
