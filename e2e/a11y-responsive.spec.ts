import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { addDays, browserToday, fresh, noHorizontalOverflow, seed, stored } from './helpers';

const SCREENS = ['dashboard', 'setup/profile', 'setup/availability', 'setup/commitments', 'setup/subjects', 'timetable', 'progress', 'mock-test', 'settings'];

async function loadDemo(page: Page) {
  await fresh(page);
  await page.getByRole('button', { name: 'Load demo data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load demo data' }).click();
  await expect(page.getByRole('note')).toBeVisible();
}

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)).toEqual([]);
}

test.describe('accessibility (axe)', () => {
  test('welcome screen', async ({ page }) => {
    await fresh(page);
    await axe(page);
  });

  test('every main screen with demo data', async ({ page }) => {
    await loadDemo(page);
    for (const s of SCREENS) {
      await page.goto(`./#/${s}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await axe(page);
    }
    for (const view of ['Day', 'Week']) {
      await page.goto('./#/timetable');
      await page.getByRole('button', { name: view, exact: true }).click();
      await axe(page);
    }
  });

  test('empty states and dialogs', async ({ page }) => {
    const today = await browserToday(page);
    await seed(page, { today, subjects: [], topics: [] });
    for (const s of ['dashboard', 'timetable', 'progress', 'mock-test', 'setup/subjects']) {
      await page.goto(`./#/${s}`);
      await axe(page);
    }
    await page.goto('./#/settings');
    await page.getByRole('button', { name: 'Reset all data…' }).click();
    await axe(page);
  });

  test('recovery screen', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => localStorage.setItem('studysync:data', 'garbage'));
    await page.reload();
    await axe(page);
  });

  test('keyboard: skip link, navigation and dialogs work without a mouse', async ({ page }) => {
    await loadDemo(page);
    await page.goto('./#/dashboard');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
    await page.getByRole('link', { name: 'Timetable' }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: 'Timetable' })).toBeFocused();
    await page.getByRole('button', { name: /^Delete:/ }).first().focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Delete this session?' });
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('responsive layout', () => {
  for (const width of [360, 390, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px on every screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await loadDemo(page);
      for (const s of SCREENS) {
        await page.goto(`./#/${s}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await noHorizontalOverflow(page);
      }
      for (const view of ['Day', 'Week', 'List']) {
        await page.goto('./#/timetable');
        await page.getByRole('button', { name: view, exact: true }).click();
        await noHorizontalOverflow(page);
      }
    });
  }

  test('360px: navigation, forms and timetable are usable', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await fresh(page);
    await noHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Create my plan' }).click();
    await page.getByLabel('Display name (optional)').fill('Kim');
    await page.getByRole('button', { name: 'Create profile and continue' }).click();
    await expect(page.getByRole('heading', { name: 'When can you study?' })).toBeVisible();
    await noHorizontalOverflow(page);
    // bottom navigation is visible and works
    const nav = page.getByRole('navigation', { name: 'Main (mobile)' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main', exact: true })).toBeHidden();
    await nav.getByRole('link', { name: 'Setup' }).click();
    await page.getByRole('link', { name: '4. Subjects & topics' }).click();
    const today = await browserToday(page);
    const form = page.getByRole('form', { name: 'New subject' });
    await form.getByLabel('Subject name').fill('Geography');
    await form.getByLabel('Exam date').fill(addDays(today, 6));
    await form.getByRole('button', { name: 'Add subject' }).click();
    await page.getByRole('button', { name: 'Add topic' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Topic title').fill('Rivers');
    await dialog.getByLabel('Estimated study time (minutes)').fill('120');
    await noHorizontalOverflow(page);
    await dialog.getByRole('button', { name: 'Add topic' }).click();
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await nav.getByRole('link', { name: 'Timetable' }).click();
    await page.getByRole('button', { name: 'Generate plan' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Apply changes' }).click();
    await expect(page.getByRole('article').first()).toBeVisible();
    await noHorizontalOverflow(page);
    const btn = page.getByRole('button', { name: /^Mark complete:/ }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.getByRole('dialog').getByRole('radio', { name: /Not yet|Yes/ }).first().check();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    expect((await stored(page)).data.sessions.some((s) => s.status === 'completed')).toBe(true);
    await nav.getByRole('link', { name: 'Home' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Kim');
  });
});
