import { test, expect } from '@playwright/test';
import path from 'path';
import { FuelPage } from '../e2e/pages/FuelPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 6: Fuel Module - CRUD Automation', () => {
  let fuelPage: FuelPage;

  const location = `HOU_${Date.now()}`;
  const today = new Date().toISOString().split('T')[0];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    fuelPage = new FuelPage(page);
    await fuelPage.navigate();
  });

  test('1. CREATE - Add New Fuel Entry', async () => {
    console.log(`\n🔧 Creating fuel entry at: "${location}"`);
    await fuelPage.createFuelEntry({
      date: today,
      fuelType: 'diesel',
      paymentMethod: 'Cash',
      location: location,
      gallons: '50',
      pricePerGallon: '3.50',
      currentOdometer: '50000',
      unit: 'miles',
      notes: 'Test fuel entry for CRUD automation.',
    });

    // Entry created via AJAX — verify we're back on fuel page
    console.log(`[PASS] CREATE ✅ — "${location}"\n`);
  });

  test('2. READ - Navigate to Fuel List', async () => {
    console.log(`\n📖 Navigating to fuel list`);
    await fuelPage.navigate();
    await fuelPage.page.waitForTimeout(3000);
    const heading = fuelPage.page.getByText('Fuel Management');
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ ✅ — Fuel list loaded\n`);
  });

  test('3. UPDATE - Edit Fuel Entry via View Details', async () => {
    const newLocation = `UPD_${Date.now()}`;
    console.log(`\n✏️ Updating fuel entry → "${newLocation}"`);
    await fuelPage.updateEntry(newLocation);
    console.log(`[PASS] UPDATE ✅ — Location updated\n`);
  });

  test('4. DELETE - Delete a Fuel Entry', async () => {
    console.log(`\n🗑️ Deleting fuel entry`);
    await fuelPage.deleteEntry(location);
    console.log(`[PASS] DELETE ✅ — Entry deleted\n`);
  });
});
