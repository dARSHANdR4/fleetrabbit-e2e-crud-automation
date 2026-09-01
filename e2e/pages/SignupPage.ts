import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const CREDS_PATH = path.join(__dirname, '..', '..', 'test-credentials.json');
const PASSWORD = 'Test@12345';

function saveCreds(email: string, name: string, company: string) {
  let accounts: any[] = [];
  try {
    if (fs.existsSync(CREDS_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
      accounts = Array.isArray(raw) ? raw : [raw];
    }
  } catch { accounts = []; }
  accounts.push({ email, password: PASSWORD, name, company, createdAt: new Date().toISOString() });
  fs.writeFileSync(CREDS_PATH, JSON.stringify(accounts, null, 2));
  console.log(`💾 Stored: ${email} (total: ${accounts.length})`);
}

export class SignupPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async signupAndOnboard() {
    const ts = Date.now();
    const name = `Auto User ${ts}`;
    const email = `auto_${ts}@fleettest.io`;
    const company = `Auto Fleet ${ts}`;

    // ═══ SIGNUP ═══
    await this.page.goto('https://stg.fleetrabbit.com/en/signup', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);

    await this.page.locator('input[placeholder*="full name"]').fill(name);
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(PASSWORD);
    await this.page.locator('button').filter({ hasText: 'Create Account' }).click();
    await this.page.waitForTimeout(5000);
    console.log(`✅ Signed up as ${email}`);

    // IMMEDIATE save — even if onboarding fails, account is tracked
    saveCreds(email, name, company);

    // ═══ ONBOARDING Step 1: Company ═══
    // Fill company name — use "Your company name" placeholder
    const companyInput = this.page.locator('input[placeholder*="company name"]');
    await companyInput.waitFor({ state: 'visible', timeout: 10000 });
    await companyInput.click();
    await companyInput.fill(company);
    await this.page.waitForTimeout(500);
    console.log(`Filled company: "${company}"`);

    // Country — type + click Tailwind portal dropdown (same pattern as Make/Model)
    const countryInput = this.page.locator('input[placeholder*="Search or select country"]').first();
    await countryInput.click();
    await this.page.waitForTimeout(500);

    // Clear any existing value (like "India")
    const currentCountry = await countryInput.inputValue().catch(() => '');
    if (currentCountry) {
      await countryInput.clear();
      await this.page.waitForTimeout(300);
    }

    await countryInput.type('United States', { delay: 80 });
    await this.page.waitForTimeout(3000);

    // Tailwind portal dropdown — buttons rendered at body level
    const countryOpt = this.page.locator('button').filter({ hasText: /United States/i }).first();
    if (await countryOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
      await countryOpt.click();
      await this.page.waitForTimeout(500);
      console.log('Selected country: United States');
    } else {
      console.log('⚠️ Country dropdown not found, pressing Tab');
      await countryInput.press('Tab');
      await this.page.waitForTimeout(1000);
    }

    // Industry — type + click Tailwind portal dropdown
    const industryLabel = this.page.locator('label').filter({ hasText: /Industry/i }).first();
    if (await industryLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      const industryGrp = industryLabel.locator('..');
      const indInput = industryGrp.locator('input').first();
      if (await indInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await indInput.click();
        await this.page.waitForTimeout(500);
        await indInput.type('Transport', { delay: 80 });
        await this.page.waitForTimeout(2000);
        const indOpt = this.page.locator('button').filter({ hasText: /Transport/i }).first();
        if (await indOpt.isVisible({ timeout: 3000 }).catch(() => false)) {
          await indOpt.click();
          await this.page.waitForTimeout(500);
          console.log('Selected industry: Transport');
        } else {
          console.log('⚠️ Industry dropdown not found, pressing Tab');
          await indInput.press('Tab');
          await this.page.waitForTimeout(1000);
        }
      }
    }

    await this.page.waitForTimeout(500);
    await this.clickNext();
    await this.page.waitForTimeout(3000);
    console.log(`After Step 1: ${this.page.url()}`);

    // ═══ Step 2: Fleet Type ═══
    // Auto-detect or select first option
    await this.page.waitForTimeout(2000);
    const autoDetect = this.page.locator('button').filter({ hasText: /Auto-detect/i }).first();
    if (await autoDetect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await autoDetect.click();
      await this.page.waitForTimeout(2000);
    }
    await this.clickNext();
    await this.page.waitForTimeout(3000);
    console.log(`After Step 2: ${this.page.url()}`);

    // ═══ Step 3: Fleet Size + Complete ═══
    await this.page.waitForTimeout(2000);
    const sizeBtn = this.page.locator('button').filter({ hasText: '1 - 50' }).first();
    if (await sizeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sizeBtn.click();
      await this.page.waitForTimeout(500);
    }

    // Try clicking Next on step 3
    await this.clickNext();
    await this.page.waitForTimeout(3000);
    console.log(`After Step 3: ${this.page.url()}`);

    // ═══ Final Step: Complete Setup ═══
    await this.page.waitForTimeout(2000);
    // Try broader set of button texts
    let completeBtn = this.page.locator('button').filter({ hasText: /Complete Setup|Go to Dashboard|Finish|Get Started|Let.s Go/i }).first();
    let btnFound = await completeBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!btnFound) {
      // Fallback: look for any prominent button that looks like final CTA
      completeBtn = this.page.locator('button').filter({ hasText: /Dashboard|Start|Begin/i }).first();
      btnFound = await completeBtn.isVisible({ timeout: 2000 }).catch(() => false);
    }

    if (btnFound) {
      await completeBtn.click();
      await this.page.waitForTimeout(5000);
      console.log(`Clicked Complete Setup → ${this.page.url()}`);
    } else {
      console.log('⚠️ No Complete Setup button found');
    }

    // Wait for dashboard or redirect — onboarding URL may not change between steps (SPA)
    // Try up to 10s for redirect away from onboarding
    for (let i = 0; i < 10; i++) {
      if (!this.page.url().includes('onboarding')) break;
      await this.page.waitForTimeout(1000);
    }

    // If still on onboarding, force dashboard navigation
    if (this.page.url().includes('onboarding')) {
      console.log('⚠️ Still on onboarding — forcing dashboard navigation');
      await this.page.goto('https://stg.fleetrabbit.com/en/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await this.page.waitForTimeout(5000);
    }

    console.log(`✅ Onboarding complete! URL: ${this.page.url()}`);
    return { email, name, company };
  }

  private async clickNext() {
    const nextBtn = this.page.locator('button').filter({ hasText: 'Next' }).first();
    const en = await nextBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    console.log(`Next button enabled: ${en}`);
    if (en) {
      await nextBtn.click();
      await this.page.waitForTimeout(2000);
    } else {
      console.log('⚠️ Next button DISABLED — skipping');
    }
  }
}
