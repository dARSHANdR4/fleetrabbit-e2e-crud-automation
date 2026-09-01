import { test, expect } from '@playwright/test';
import path from 'path';
import { RecallsPage } from '../e2e/pages/RecallsPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 4: Recalls Module - Full CRUD Automation', () => {
  let recallsPage: RecallsPage;

  const ts = Date.now();
  const recallTitle = `Brake_Safety_Recall_${ts}`;
  const recallTitle2 = `Engine_Recall_${ts}`;
  const recallDeadline = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const regTitle = `FMCSA_HOS_Update_${ts}`;
  const regDeadline = new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0];

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    recallsPage = new RecallsPage(page);
    await recallsPage.navigate();
  });

  // ═══════════════════════════════════════════════
  //  RECALL #1 — CREATE → READ → DELETE
  //  (Delete while still in Active Recalls)
  // ═══════════════════════════════════════════════

  test('1. [RECALL] CREATE - Add New Safety Recall with Fleet', async () => {
    console.log(`\n🔧 Creating RECALL: "${recallTitle}"`);
    await recallsPage.createRecall({
      title: recallTitle,
      category: 'Safety',
      severity: 'high',
      description: 'NHTSA safety recall for brake booster system.',
      action: 'Inspect all fleet vehicles within 30 days.',
      deadline: recallDeadline,
      fleetIndex: 0,
    });

    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    expect(await recallsPage.entryExists(recallTitle)).toBeTruthy();
    console.log(`[PASS] RECALL CREATE ✅ — "${recallTitle}"\n`);
  });

  test('2. [RECALL] READ - Verify Recall in Active Recalls', async () => {
    console.log(`\n📖 Reading recall: "${recallTitle}"`);
    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    await expect(recallsPage.page.locator('h3').filter({ hasText: recallTitle }).first())
      .toBeVisible({ timeout: 10000 });
    console.log(`[PASS] RECALL READ ✅\n`);
  });

  test('3. [RECALL] DELETE - Delete the Recall', async () => {
    console.log(`\n🗑️ Deleting recall: "${recallTitle}"`);
    await recallsPage.deleteEntry(recallTitle);

    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    expect(await recallsPage.entryExists(recallTitle)).toBeFalsy();
    console.log(`[PASS] RECALL DELETE ✅\n`);
  });

  // ═══════════════════════════════════════════════
  //  RECALL #2 — CREATE → READ → MARK COMPLETE
  //  (Mark Complete moves it out of Active Recalls)
  // ═══════════════════════════════════════════════

  test('4. [RECALL] CREATE #2 - Add Another Recall for Update test', async () => {
    console.log(`\n🔧 Creating RECALL #2: "${recallTitle2}"`);
    await recallsPage.createRecall({
      title: recallTitle2,
      category: 'Safety',
      severity: 'high',
      description: 'Engine component recall for inspection.',
      action: 'Inspect engine components within 30 days.',
      deadline: recallDeadline,
      fleetIndex: 0,
    });

    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    expect(await recallsPage.entryExists(recallTitle2)).toBeTruthy();
    console.log(`[PASS] RECALL CREATE #2 ✅ — "${recallTitle2}"\n`);
  });

  test('5. [RECALL] UPDATE - Mark Recall as Complete (form + submit)', async () => {
    console.log(`\n✏️ Marking complete: "${recallTitle2}"`);
    await recallsPage.markComplete(recallTitle2);

    // After marking complete, the recall should disappear from Active Recalls
    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    expect(await recallsPage.entryExists(recallTitle2)).toBeFalsy();
    console.log(`[PASS] RECALL UPDATE ✅ — "${recallTitle2}" completed & removed from Active!\n`);
  });

  // ═══════════════════════════════════════════════════════
  //  REGULATORY UPDATE — CREATE → READ → COMPLETE CHECKLIST
  //  (No DELETE — regulatory updates cannot be deleted)
  // ═══════════════════════════════════════════════════════

  test('6. [REGULATION] CREATE - Add New Regulatory Update', async () => {
    console.log(`\n🔧 Creating REGULATORY UPDATE: "${regTitle}"`);
    await recallsPage.createRegulatoryUpdate({
      title: regTitle,
      category: 'FMCSA',
      severity: 'medium',
      description: 'FMCSA updated Hours of Service regulations.',
      action: 'Update all ELD devices and train drivers.',
      deadline: regDeadline,
    });

    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    expect(await recallsPage.entryExists(regTitle)).toBeTruthy();
    console.log(`[PASS] REGULATION CREATE ✅\n`);
  });

  test('7. [REGULATION] READ - Verify Regulatory Update in List', async () => {
    console.log(`\n📖 Reading regulation: "${regTitle}"`);
    await recallsPage.navigate();
    await recallsPage.page.waitForTimeout(2000);
    await expect(recallsPage.page.locator('h3').filter({ hasText: regTitle }).first())
      .toBeVisible({ timeout: 10000 });
    console.log(`[PASS] REGULATION READ ✅\n`);
  });

  test('8. [REGULATION] UPDATE - Complete Checklist via View Details modal', async () => {
    console.log(`\n✏️ Completing checklist: "${regTitle}"`);
    await recallsPage.completeChecklist(regTitle);
    console.log(`[PASS] REGULATION UPDATE ✅ — checklist completed!\n`);
  });
});
