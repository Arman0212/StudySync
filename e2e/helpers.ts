import { expect, type Page } from '@playwright/test';

export async function fresh(page: Page): Promise<void> {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./');
}

/** Today's date in the browser's timezone as YYYY-MM-DD. */
export async function browserToday(page: Page): Promise<string> {
  return page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Creates a profile through the UI with all seven days available and wide hours. */
export async function createProfile(page: Page, name = 'Asha'): Promise<string> {
  await fresh(page);
  await page.getByRole('button', { name: 'Create my plan' }).click();
  await page.getByLabel('Display name (optional)').fill(name);
  const today = await browserToday(page);
  await page.getByLabel('Plan start date').fill(today);
  await page.getByRole('button', { name: 'Create profile and continue' }).click();
  await expect(page.getByRole('heading', { name: 'When can you study?' })).toBeVisible();
  for (const day of ['Sunday', 'Saturday']) {
    const box = page.getByRole('checkbox', { name: day, exact: true });
    if (!(await box.isChecked())) await box.check();
  }
  await page.getByLabel('Daily start time').fill('00:00');
  await page.getByLabel('Daily end time').fill('23:55');
  await page.getByLabel('Daily maximum focused study (minutes)').fill('600');
  await page.getByRole('button', { name: 'Save availability' }).click();
  await expect(page.getByRole('heading', { name: 'Add a commitment' })).toBeVisible();
  return today;
}

export async function addSubject(page: Page, name: string, examDate: string, examTime = ''): Promise<void> {
  await page.goto('./#/setup/subjects');
  const form = page.getByRole('form', { name: 'New subject' });
  await form.getByLabel('Subject name').fill(name);
  await form.getByLabel('Exam date').fill(examDate);
  if (examTime) await form.getByLabel('Exam start time (optional)').fill(examTime);
  await form.getByRole('button', { name: 'Add subject' }).click();
}

export async function addTopic(page: Page, subject: string, title: string, minutes: number, opts: { difficulty?: string; importance?: string } = {}): Promise<void> {
  const card = page.locator('section.card', { has: page.getByRole('heading', { name: subject, exact: false }) }).filter({ has: page.getByRole('button', { name: 'Add topic' }) });
  await card.getByRole('button', { name: 'Add topic' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Topic title').fill(title);
  await dialog.getByLabel('Estimated study time (minutes)').fill(String(minutes));
  if (opts.difficulty) await dialog.getByLabel('Difficulty').selectOption(opts.difficulty);
  if (opts.importance) await dialog.getByLabel('Importance').selectOption(opts.importance);
  await dialog.getByRole('button', { name: 'Add topic' }).click();
  await expect(dialog.getByLabel('Topic title')).toHaveValue('');
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
}

export async function generatePlan(page: Page): Promise<void> {
  await page.goto('./#/timetable');
  await page.getByRole('button', { name: /^(Generate|Regenerate) plan$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview plan changes' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Apply changes' }).click();
  await expect(dialog).toBeHidden();
}

export async function noHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
