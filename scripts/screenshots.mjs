// Captures full-page screenshots of every screen with demo data loaded.
// Usage: node scripts/screenshots.mjs <out-dir> [--dark]
// Expects the production build to be served at http://localhost:4173 (npm run build && npm run preview).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'docs/screenshots/after';
const withDark = process.argv.includes('--dark');
const base = process.env.BASE_URL ?? 'http://localhost:4173/';
mkdirSync(out, { recursive: true });

const SCREENS = [
  ['dashboard', 'dashboard'],
  ['setup-profile', 'setup/profile'],
  ['setup-availability', 'setup/availability'],
  ['setup-commitments', 'setup/commitments'],
  ['setup-subjects', 'setup/subjects'],
  ['timetable-list', 'timetable', 'List'],
  ['timetable-day', 'timetable', 'Day'],
  ['timetable-week', 'timetable', 'Week'],
  ['progress', 'progress'],
  ['mock-test', 'mock-test'],
  ['settings', 'settings'],
];

const browser = await chromium.launch();
const schemes = withDark ? ['light', 'dark'] : ['light'];
for (const scheme of schemes) {
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width > 600 ? 900 : 844 }, colorScheme: scheme, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const suffix = `${width}${scheme === 'dark' ? '-dark' : ''}`;
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.goto(base);
    await page.screenshot({ path: join(out, `welcome-${suffix}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Load demo data' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load demo data' }).click();
    await page.getByRole('note').waitFor();
    await page.waitForTimeout(5000); // let the demo toast disappear
    for (const [name, route, view] of SCREENS) {
      await page.goto(`${base}#/${route}`);
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      if (view) await page.getByRole('button', { name: view, exact: true }).click();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(out, `${name}-${suffix}.png`), fullPage: true });
    }
    if (withDark) {
      // Complete two of today's sessions to show the check animation result, ring and heatmap.
      await page.goto(`${base}#/dashboard`);
      for (let i = 0; i < 2; i++) {
        const btn = page.getByRole('button', { name: /^Mark complete:/ }).first();
        if (!(await btn.count())) break;
        await btn.click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('radio').first().check();
        await dialog.getByRole('button', { name: 'Save' }).click();
        await dialog.waitFor({ state: 'hidden' });
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, `dashboard-activity-${suffix}.png`), fullPage: true });
      await page.goto(`${base}#/progress`);
      await page.getByRole('heading', { level: 1 }).first().waitFor();
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(out, `progress-activity-${suffix}.png`), fullPage: true });
    }
    await ctx.close();
    console.log(`captured ${scheme} @ ${width}px`);
  }
}
await browser.close();
