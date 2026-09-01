import { test, expect } from '@playwright/test';
import { FleetPage } from '../e2e/pages/FleetPage';
import * as fs from 'fs';
import * as path from 'path';

const CREDS_PATH = path.join(__dirname, '..', 'test-credentials.json');
const unit1 = `TRK-${Date.now().toString().slice(-6)}`;
const unit2 = `VAN-${Date.now().toString().slice(-6)}`;

function getAccount() {
  if (!fs.existsSync(CREDS_PATH)) return null;
  const accounts = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
  const arr = Array.isArray(accounts) ? accounts : [accounts];
  return arr.length > 0 ? arr[0] : null;
}

test.describe.serial('Phase 18: Fleet - Full CRUD (Stored Account)', () => {
  let fleetPage: FleetPage;

  test('0. Login with stored account', async ({ browser }) => {
    const creds = getAccount();
    if (!creds) throw new Error('No stored credentials!');

    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto('https://stg.fleetrabbit.com/en/login/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.locator('input[type="email"]').fill(creds.email);
    await page.locator('input[type="password"]').fill('Test@12345');
    await page.getByRole('button', { name: /Sign In|Login/i }).first().click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log(`Logged in: ${page.url()}`);

    if (page.url().includes('onboarding')) {
      throw new Error(`Onboarding incomplete for ${creds.email}!`);
    }

    await page.goto('https://stg.fleetrabbit.com/en/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
    console.log(`✅ Auth saved: ${creds.email}`);
    await ctx.close();
  });

  // ═══ CHECK FLEET COUNT + MAKE ROOM ═══
  test('1. Ensure room for 2 fleets', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    fleetPage = new FleetPage(page);
    await fleetPage.ensureRoom(2);
    console.log(`[PASS] Room ensured ✅`);
    await ctx.close();
  });

  // ═══ CREATE 2 new fleets ═══
  test('2. CREATE - Fleet #1', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    fleetPage = new FleetPage(page);
    await fleetPage.createFleet(unit1);
    console.log(`[PASS] CREATE #1 ✅`);
    await ctx.close();
  });

  test('3. CREATE - Fleet #2', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    fleetPage = new FleetPage(page);
    await fleetPage.createFleet(unit2);
    console.log(`[PASS] CREATE #2 ✅`);
    await ctx.close();
  });

  // ═══ UPDATE ═══
  test('4. UPDATE - Fleet detail + Edit', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    fleetPage = new FleetPage(page);
    await fleetPage.updateFleet();
    console.log(`[PASS] UPDATE ✅`);
    await ctx.close();
  });

  // ═══ DELETE the 2 fleets we just created ═══
  test('5. DELETE - Fleet #1', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    fleetPage = new FleetPage(page);
    await fleetPage.deleteFleet();
    console.log(`[PASS] DELETE #1 ✅`);
    await ctx.close();
  });

  test('6. DELETE - Fleet #2', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    fleetPage = new FleetPage(page);
    await fleetPage.deleteFleet();
    console.log(`[PASS] DELETE #2 ✅`);
    await ctx.close();
  });
});
