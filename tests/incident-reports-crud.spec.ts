import { test, expect } from '@playwright/test';
import path from 'path';
import { IncidentReportsPage } from '../e2e/pages/IncidentReportsPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 20: Incident Reports - CRUD Automation', () => {
  let incPage: IncidentReportsPage;
  let incidentNumber: string;  // INC-XXXXX captured from API response

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    incPage = new IncidentReportsPage(page);
    await incPage.navigate();
    console.log('✅ Navigated to Inspections → Incidents tab');
  });

  test('1. CREATE - Report New Incident', async () => {
    const suffix = `${Date.now()}`;
    const desc = `QA_Incident_${suffix}`;
    console.log(`\n🔧 Creating: "${desc}"`);

    incidentNumber = await incPage.createIncident({
      incident_type: 'accident',
      severity: 'medium',
      description: desc,
    });

    expect(incidentNumber).toBeTruthy();
    console.log(`[PASS] CREATE ✅ → ${incidentNumber}\n`);
  });

  test('2. READ - View Incident Details', async () => {
    console.log(`\n📖 Opening detail modal for: ${incidentNumber}`);

    await incPage.searchAndOpen(incidentNumber);

    const heading = incPage.page.locator('h2').filter({ hasText: /Incident #/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Edit Severity to High', async () => {
    console.log(`\n✏️ Editing: ${incidentNumber}`);

    // Still in the detail modal (serial mode — same page)
    await incPage.editIncidentInModal('high');

    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Delete Incident Report', async () => {
    console.log(`\n🗑️ Deleting: ${incidentNumber}`);

    // Re-open modal (may have closed after UPDATE)
    await incPage.searchAndOpen(incidentNumber);

    await incPage.deleteIncidentFromModal();

    console.log(`[PASS] DELETE ✅\n`);
  });
});
