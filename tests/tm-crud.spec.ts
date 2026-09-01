import { test, expect } from '@playwright/test';
import { SignupPage } from '../e2e/pages/SignupPage';
import { TeamMembersPage } from '../e2e/pages/TeamMembersPage';
import * as fs from 'fs';
import * as path from 'path';

const PASSWORD = 'Test@12345';
const driverEmail = `driver_${Date.now()}@fleettest.io`;
const techEmail = `tech_${Date.now()}@fleettest.io`;

test.describe.serial('Team Members - Full CRUD (Fresh Account)', () => {
  let tmPage: TeamMembersPage;

  test('1. Create fresh account', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const signup = new SignupPage(page);
    const result = await signup.signupAndOnboard();
    await page.context().storageState({ path: 'e2e/.auth/user.json' });

    const credsPath = path.join(__dirname, '..', 'test-credentials.json');
    let accounts: any[] = [];
    if (fs.existsSync(credsPath)) { try { const raw = JSON.parse(fs.readFileSync(credsPath, 'utf-8')); accounts = Array.isArray(raw) ? raw : [raw]; } catch { accounts = []; } }
    accounts.push({ email: result.email, password: PASSWORD, name: result.name, company: result.company, createdAt: new Date().toISOString() });
    fs.writeFileSync(credsPath, JSON.stringify(accounts, null, 2));
    console.log(`✅ Fresh account: ${result.email}`);
    await ctx.close();
  });

  test('2. INVITE - Driver', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    tmPage = new TeamMembersPage(page);
    const link = await tmPage.inviteMember('Auto Driver', driverEmail, 'driver');
    expect(link).toBeTruthy();
    await tmPage.acceptInvite(browser, link);
    console.log(`[PASS] Driver invited ✅`);
    await ctx.close();
  });

  test('3. INVITE - Technician', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    tmPage = new TeamMembersPage(page);
    const link = await tmPage.inviteMember('Auto Technician', techEmail, 'technician');
    expect(link).toBeTruthy();
    await tmPage.acceptInvite(browser, link);
    console.log(`[PASS] Technician invited ✅`);
    await ctx.close();
  });

  test('4. UPDATE - Edit a member', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    tmPage = new TeamMembersPage(page);
    await tmPage.updateMember();
    console.log(`[PASS] UPDATE ✅`);
    await ctx.close();
  });

  test('5. DELETE x2 - Deactivate + Delete', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const page = await ctx.newPage();
    tmPage = new TeamMembersPage(page);
    for (let i = 1; i <= 2; i++) {
      await tmPage.deactivateMember();
      await tmPage.deleteMember();
      console.log(`[PASS] Delete #${i} ✅`);
    }
    await ctx.close();
  });
});
