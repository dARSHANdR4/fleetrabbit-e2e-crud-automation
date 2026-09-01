import { test, expect } from '@playwright/test';
import path from 'path';
import { ServiceProgramsPage } from '../e2e/pages/ServiceProgramsPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 8: Service Programs - CRUD Automation', () => {
  let spPage: ServiceProgramsPage;
  const programName = `Auto_SP_${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    spPage = new ServiceProgramsPage(page);
    await spPage.navigate();
  });

  test('1. CREATE - New Service Program (3-step wizard)', async () => {
    console.log(`\n🔧 Creating: "${programName}"`);
    await spPage.createProgram(programName);

    const exists = await spPage.entryExists(programName);
    expect(exists).toBeTruthy();
    console.log(`[PASS] CREATE ✅\n`);
  });

  test('2. READ - Verify in Programs List', async () => {
    console.log(`\n📖 Reading: "${programName}"`);
    expect(await spPage.entryExists(programName)).toBeTruthy();
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Open detail page and Save', async () => {
    console.log(`\n✏️ Updating: "${programName}"`);
    await spPage.updateProgram(programName);
    console.log(`[PASS] UPDATE ✅\n`);
  });

  test('4. DELETE - Deactivate Program', async () => {
    console.log(`\n🗑️ Deactivating: "${programName}"`);
    await spPage.deactivateProgram(programName);
    console.log(`[PASS] DELETE ✅ — Program deactivated\n`);
  });
});
