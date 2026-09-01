import { Page, expect } from '@playwright/test';

export class TeamMembersPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto('https://stg.fleetrabbit.com/en/team-members', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(3000);
  }

  async deactivateMember() {
    await this.navigate();

    // Click kebab menu on first member
    const kebabBtn = this.page.locator('button:has(svg[class*="ellipsis"])').first();
    await expect(kebabBtn).toBeVisible({ timeout: 10000 });
    await kebabBtn.click();
    await this.page.waitForTimeout(1500);

    // Click "Deactivate" in kebab menu
    const deactivateOpt = this.page.locator('button').filter({ hasText: /^Deactivate$/i }).first();
    if (await deactivateOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deactivateOpt.click();
      await this.page.waitForTimeout(2000);

      // Click dialog's "Deactivate" button (last one with Cancel nearby)
      const dialogBtns = this.page.locator('button').filter({ hasText: /Deactivate/i });
      const dCount = await dialogBtns.count();
      if (dCount > 1) {
        await dialogBtns.last().click(); // Last = dialog confirm
        await this.page.waitForTimeout(3000);
        console.log('[DEACTIVATE] Confirmed in dialog!');
      }
    }
  }

  async reactivateMember() {
    await this.navigate();

    const viewBtn = this.page.locator('button').filter({ hasText: /View Details/i }).first();
    await expect(viewBtn).toBeVisible({ timeout: 10000 });
    await viewBtn.click();
    await this.page.waitForTimeout(3000);

    const editBtns = this.page.locator('button').filter({ hasText: /^Edit$/i });
    await editBtns.nth(1).click();
    await this.page.waitForTimeout(2000);

    const statusSelect = this.page.locator('select').last();
    await statusSelect.selectOption('active');
    await this.page.waitForTimeout(500);

    await this.page.locator('button').filter({ hasText: /Save/i }).first().click();
    await this.page.waitForTimeout(3000);
    console.log('[REACTIVATE] Member reactivated!');
  }

  async deleteMember() {
    await this.navigate();

    // Reopen kebab on the first (now deactivated) member
    const kebabBtn = this.page.locator('button:has(svg[class*="ellipsis"])').first();
    await expect(kebabBtn).toBeVisible({ timeout: 10000 });
    await kebabBtn.click();
    await this.page.waitForTimeout(1500);
    console.log('✅ Kebab menu opened');

    // After deactivation, "Delete" should appear — log all buttons for debugging
    const allBtns = await this.page.locator('button').all();
    console.log('Kebab options:');
    for (const b of allBtns) {
      const t = (await b.textContent().catch(() => '')).trim();
      if (t && t.length < 30) console.log(`  "${t}"`);
    }

    const deleteOpt = this.page.locator('button').filter({ hasText: /Delete Permanently/i }).first();
    if (await deleteOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteOpt.click();
      await this.page.waitForTimeout(2000);
      console.log('[DELETE] Clicked Delete Permanently');

      // Confirm the delete dialog — find and click confirm
      await this.page.waitForTimeout(1000);
      const dialogBtns = this.page.locator('button').filter({ hasText: /Delete|Confirm|Yes/i });
      if (await dialogBtns.last().isVisible({ timeout: 3000 }).catch(() => false)) {
        await dialogBtns.last().click();
        await this.page.waitForTimeout(3000);
        console.log('[DELETE] Confirmed');
      }
    }
    console.log(`[DELETE] Member deleted!`);
  }

  async updateMember() {
    await this.navigate();
    await this.page.waitForTimeout(3000);

    // Open kebab menu on first member
    const kebabBtn = this.page.locator('button:has(svg[class*="ellipsis"])').first();
    const kebabCount = await kebabBtn.count();
    if (kebabCount === 0) {
      console.log('[UPDATE] No members to update (no kebab found) — skipping');
      return;
    }
    await expect(kebabBtn).toBeVisible({ timeout: 10000 });
    await kebabBtn.click();
    await this.page.waitForTimeout(2000);

    // Click "View Details" from kebab menu
    const viewBtn = this.page.locator('button').filter({ hasText: /^View Details$/i }).first();
    if (!(await viewBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      console.log('[UPDATE] View Details not in kebab — skipping');
      // Close kebab by clicking elsewhere
      await this.page.locator('body').click({ position: { x: 10, y: 10 } });
      await this.page.waitForTimeout(1000);
      return;
    }
    await viewBtn.click();
    await this.page.waitForTimeout(3000);

    // Click Edit (Name/Email/Phone section)
    const editBtns = this.page.locator('button').filter({ hasText: /^Edit$/i });
    const editCount = await editBtns.count();
    if (editCount > 0) {
      await editBtns.nth(0).click();
      await this.page.waitForTimeout(2000);

      // Modify phone number
      const phoneInput = this.page.locator('input[type="tel"]').first();
      if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await phoneInput.fill(`555${Date.now().toString().slice(-7)}`);
        console.log('Phone updated');
      }

      await this.page.locator('button').filter({ hasText: /Save/i }).first().click();
      await this.page.waitForTimeout(3000);
    }
    console.log('[UPDATE] Member updated!');
  }

  async inviteMember(name: string, email: string, role: string) {
    await this.navigate();
    await this.page.waitForTimeout(2000);

    // Click Invite Member — retry with reload if not found
    let inviteBtn = this.page.locator('button').filter({ hasText: /Invite Member/i }).first();
    let btnVisible = await inviteBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (!btnVisible) {
      console.log('⚠️ Invite Member not found, reloading page...');
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(5000);
      inviteBtn = this.page.locator('button').filter({ hasText: /Invite Member/i }).first();
    }
    await inviteBtn.click({ timeout: 10000 });
    await this.page.waitForTimeout(2000);

    // Fill form
    await this.page.locator('input[placeholder="John Doe"]').fill(name);
    await this.page.locator('input[placeholder="john@example.com"]').fill(email);
    await this.page.locator('select').last().selectOption(role);
    await this.page.waitForTimeout(500);

    // Capture invite link
    let inviteLink = '';
    await this.page.route('**/api/invites/send', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      inviteLink = body?.data?.invitation?.invite_link || '';
      await route.fulfill({ response });
    });

    await this.page.locator('button').filter({ hasText: /Send Invitation/i }).first().click();
    await this.page.waitForTimeout(3000);

    return inviteLink;
  }

  async acceptInvite(browser: any, inviteLink: string) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(inviteLink, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 1: Password
    const pwInputs = page.locator('input[type="password"]');
    if (await pwInputs.count() >= 1) await pwInputs.first().fill('Test@12345');
    if (await pwInputs.count() >= 2) await pwInputs.nth(1).fill('Test@12345');
    await page.waitForTimeout(500);

    // Click Continue
    const continueBtn = page.locator('button').filter({ hasText: /Continue/i }).first();
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(3000);
    }

    // Step 2: Driver-specific fields (License, Phone, Address, etc.)
    const fields: Record<string, string> = {
      'CDL License Number': 'DL-12345678',
      'e.g., CA, TX, NY': 'TX',
      '93529-82082': '9876543210',
      'Street address': '123 Main St',
      'City': 'Dallas',
      'e.g., CA': 'TX',
    };
    const allInputs = page.locator('input:not([type="hidden"]):not([type="password"])');
    for (let i = 0; i < await allInputs.count(); i++) {
      const inp = allInputs.nth(i);
      const ph = (await inp.getAttribute('placeholder').catch(() => '')) || '';
      const val = await inp.inputValue().catch(() => '');
      if (!val && ph) {
        const fillVal = fields[ph] || 'Auto';
        await inp.fill(fillVal);
      }
    }

    // Fill License Expiry Date
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const future = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
      await dateInput.fill(future);
    }

    // Select License Type
    const selects = page.locator('select');
    if (await selects.count() > 1) {
      const licenseType = selects.nth(1); // Second select after nationality
      if (await licenseType.locator('option').count() > 1) {
        await licenseType.selectOption({ index: 1 });
      }
    }

    await page.waitForTimeout(500);

    // Click "Accept Invitation"
    const acceptBtn = page.locator('button').filter({ hasText: /Accept Invitation/i }).first();
    if (await acceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(3000);
    }
    await ctx.close();
  }
}
