import { test, expect } from '@playwright/test';
import path from 'path';
import { InspectionReportsPage } from '../e2e/pages/InspectionReportsPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 21: Inspection Reports - CRUD Automation', () => {
  let reportsPage: InspectionReportsPage;
  let reportNumber: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    reportsPage = new InspectionReportsPage(page);
    await reportsPage.navigate();
    console.log('✅ Navigated to Inspections → Reports tab');
  });

  test('1. CREATE - Complete Inspection', async () => {
    console.log('\n🔧 Creating inspection report...');

    reportNumber = await reportsPage.createReport();

    expect(reportNumber).toBeTruthy();
    console.log(`[PASS] CREATE ✅ → ${reportNumber}\n`);
  });

  test('2. READ - View Details via Kebab', async () => {
    console.log(`\n📖 Opening detail modal for: ${reportNumber}`);

    await reportsPage.openDetailsViaKebab(reportNumber);

    const heading = reportsPage.page.locator('h2, h3').filter({ hasText: /Inspection #/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Amend Inspection Report', async () => {
    console.log(`\n✏️ Amending: ${reportNumber}`);

    await reportsPage.amendReport();

    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Delete Inspection Report', async () => {
    console.log(`\n🗑️ Deleting: ${reportNumber}`);

    // Re-open modal (amendment may have closed it)
    await reportsPage.openDetailsViaKebab(reportNumber);

    await reportsPage.deleteReport();

    console.log(`[PASS] DELETE ✅\n`);
  });
});
