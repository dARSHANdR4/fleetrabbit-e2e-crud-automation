import { test, expect } from '@playwright/test';
import path from 'path';
import { TiresPage } from '../e2e/pages/TiresPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 7: Tires Module - CRUD Automation', () => {
  let tiresPage: TiresPage;
  const serial = `T-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    tiresPage = new TiresPage(page);
    await tiresPage.navigate();
  });

  test('1. CREATE - Add New Tire', async () => {
    console.log(`\n🔧 Creating tire: "${serial}"`);
    await tiresPage.createTire({
      serial,
      oem: 'Michelin',
      model: 'XZE-2',
      type: 'steer',
      size: '295/75R22.5',
      status: 'stock',
      location: 'Warehouse A',
      cost: '400',
    });

    const exists = await tiresPage.entryExists(serial);
    expect(exists).toBeTruthy();
    console.log(`[PASS] CREATE ✅ — "${serial}"\n`);
  });

  test('2. READ - Verify Tire in List', async () => {
    console.log(`\n📖 Reading tire: "${serial}"`);
    await tiresPage.navigate();
    await tiresPage.page.waitForTimeout(3000);
    expect(await tiresPage.entryExists(serial)).toBeTruthy();
    console.log(`[PASS] READ ✅\n`);
  });

  test('3. UPDATE - Edit Tire Status via View modal', async () => {
    console.log(`\n✏️ Updating tire: "${serial}"`);
    await tiresPage.updateTire(serial);
    console.log(`[PASS] UPDATE ✅ — Status changed to mounted\n`);
  });

  test('4. DELETE - Delete Tire via Trash Icon', async () => {
    console.log(`\n🗑️ Deleting tire: "${serial}"`);
    await tiresPage.deleteTire(serial);

    await tiresPage.navigate();
    await tiresPage.page.waitForTimeout(3000);
    expect(await tiresPage.entryExists(serial)).toBeFalsy();
    console.log(`[PASS] DELETE ✅\n`);
  });
});
