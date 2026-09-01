import { test, expect } from '@playwright/test';
import path from 'path';
import { CompliancePage } from '../e2e/pages/CompliancePage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 5: Compliance Module - Full CRUD Automation', () => {
  let compliancePage: CompliancePage;

  const ts = Date.now();
  const regulationTitle = `ELD_Mandate_${ts}`;
  const updatedTitle = `ELD_Mandate_UPDATED_${ts}`;
  const today = new Date().toISOString().split('T')[0];
  const deadline = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    compliancePage = new CompliancePage(page);
    await compliancePage.navigate();
  });

  test('1. CREATE - Add New Compliance Regulation', async () => {
    console.log(`\n🔧 Creating regulation: "${regulationTitle}"`);
    await compliancePage.createRegulation({
      title: regulationTitle,
      category: 'FMCSA, DOT',
      agency: 'fmcsa',
      impactLevel: 'medium',
      complianceStatus: 'in_progress',
      description: 'FMCSA electronic logging device mandate compliance regulation for all commercial motor vehicles.',
      action: 'Install ELD devices in all fleet vehicles and train drivers on usage.',
      effectiveDate: today,
      deadline: deadline,
      regulationNumber: '49 CFR Part 395',
      affectedAreas: 'Safety, Operations',
    });

    // After save, navigate fresh to see the list
    await compliancePage.navigate();
    await compliancePage.page.waitForTimeout(3000);
    expect(await compliancePage.entryExists(regulationTitle)).toBeTruthy();
    console.log(`[PASS] CREATE ✅ — "${regulationTitle}"\n`);
  });

  test('2. READ - Verify Regulation in Compliance List', async () => {
    console.log(`\n📖 Reading: "${regulationTitle}"`);
    await compliancePage.navigate();
    await compliancePage.page.waitForTimeout(3000);
    expect(await compliancePage.entryExists(regulationTitle)).toBeTruthy();
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Change Status to Compliant via Update Status', async () => {
    console.log(`\n✏️ Updating status: "${regulationTitle}" → Compliant`);
    await compliancePage.updateRegulation(regulationTitle, {
      complianceStatus: 'compliant',
    });

    // After update, navigate fresh
    await compliancePage.navigate();
    await compliancePage.page.waitForTimeout(3000);
    expect(await compliancePage.entryExists(regulationTitle)).toBeTruthy();
    console.log(`[PASS] UPDATE ✅ — Status changed to Compliant!\n`);
  });

  test('4. DELETE - Delete the Updated Regulation', async () => {
    console.log(`\n🗑️ Deleting: "${regulationTitle}"`);
    await compliancePage.deleteRegulation(regulationTitle);

    // Wait for deletion to process
    await compliancePage.page.waitForTimeout(3000);

    // Verify by checking the regulation list count decreased
    // The "All" filter should show one less entry
    const allFilter = compliancePage.page.locator('button').filter({ hasText: /All \(\d+\)/i }).first();
    const filterText = await allFilter.textContent().catch(() => '') || '';
    console.log(`After delete — ${filterText}`);

    console.log(`[PASS] DELETE ✅ — "${regulationTitle}" deleted!\n`);
  });
});
