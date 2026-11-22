import { test, expect } from '@playwright/test';
import { fresh } from './helpers';

test('built app loads and shows the welcome screen', async ({ page }) => {
  await fresh(page);
  await expect(page.getByRole('heading', { name: 'Welcome to StudySync' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load demo data' })).toBeVisible();
});

test('demo data is only loaded on request and is labelled fictional', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: 'Load demo data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load demo data' }).click();
  await expect(page.getByRole('note')).toContainText('fictional');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo Student');
  if (process.env.SHOTS) {
    for (const r of ['dashboard', 'setup/subjects', 'timetable', 'progress', 'mock-test', 'settings']) {
      await page.goto(`./#/${r}`);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${process.env.SHOTS}/${r.replace('/', '-')}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 360, height: 800 });
    for (const r of ['dashboard', 'timetable']) {
      await page.goto(`./#/${r}`);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${process.env.SHOTS}/m-${r}.png`, fullPage: false });
    }
  }
});
