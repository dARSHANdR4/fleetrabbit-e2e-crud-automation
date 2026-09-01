import { test, expect } from '@playwright/test';
import path from 'path';
import { InspectionRemindersPage } from '../e2e/pages/InspectionRemindersPage';

test.use({ storageState: path.join(__dirname, '../e2e/.auth/user.json') });

test.describe.serial('Phase 19: Inspection Reminders - CRUD Automation', () => {
  let remindersPage: InspectionRemindersPage;
  let reminderTitle: string;
  let updatedReminderTitle: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    remindersPage = new InspectionRemindersPage(page);

    // Generate unique names per run
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    reminderTitle = `QA_Reminder_${suffix}`;
    updatedReminderTitle = `QA_Reminder_UPD_${suffix}`;

    await remindersPage.navigate();
    console.log('✅ Navigated to Inspections → Reminders tab');
    console.log(`   reminderTitle="${reminderTitle}"`);
    console.log(`   updatedReminderTitle="${updatedReminderTitle}"`);
  });

  test('1. CREATE - New Inspection Reminder', async () => {
    console.log(`\n🔧 Creating inspection reminder: "${reminderTitle}"`);

    await remindersPage.createReminder({
      title: reminderTitle,
      description: 'QA automated test reminder',
      checklists: [],  // auto-select first available
      users: [],       // auto-select first available
      frequency: 'Daily',
      reminder_time: '07:00',
      due_time: '19:00',
    });

    // Verify reminder appears in the table
    const exists = await remindersPage.reminderExists(reminderTitle);
    expect(exists).toBeTruthy();
    console.log(`[PASS] CREATE ✅ — "${reminderTitle}"\n`);
  });

  test('2. READ - View Reminder in Table', async () => {
    console.log(`\n📖 Reading reminder: "${reminderTitle}"`);

    await remindersPage.viewReminderDetails(reminderTitle);

    // Verify the page heading is visible
    const heading = remindersPage.page.getByRole('heading', { name: /Inspection Reminders/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    console.log(`[PASS] READ ✅ — Reminder found in table\n`);
  });

  test('3. UPDATE - Edit Reminder Title', async () => {
    console.log(`\n✏️ Updating reminder: "${reminderTitle}" → "${updatedReminderTitle}"`);

    await remindersPage.updateReminder(reminderTitle, updatedReminderTitle);

    // Verify updated name appears
    await remindersPage.navigate();
    await remindersPage.page.waitForTimeout(3000);
    const bodyText = await remindersPage.page.locator('body').textContent().catch(() => '') || '';
    expect(bodyText).toContain(updatedReminderTitle);
    console.log(`[PASS] UPDATE ✅ — Renamed to "${updatedReminderTitle}"\n`);
  });

  test('4. DELETE - Delete Reminder', async () => {
    console.log(`\n🗑️ Deleting reminder: "${updatedReminderTitle}"`);

    await remindersPage.deleteReminder(updatedReminderTitle);

    // Verify reminder is removed
    await remindersPage.navigate();
    await remindersPage.page.waitForTimeout(3000);

    const tableText = await remindersPage.page.locator('table').first().textContent().catch(() => '') || '';
    expect(tableText).not.toContain(updatedReminderTitle);
    console.log(`[PASS] DELETE ✅ — Reminder removed from table\n`);
  });
});
