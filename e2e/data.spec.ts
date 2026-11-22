import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { addDays, browserToday, generatePlan, seed, stored } from './helpers';

async function seedBasic(page: import('@playwright/test').Page) {
  const today = await browserToday(page);
  await seed(page, {
    today,
    subjects: [{ id: 's', name: 'Economics', examDate: addDays(today, 7) }],
    topics: [{ id: 't1', subjectId: 's', title: 'Supply and demand', estimatedMinutes: 100, confidence: 2 }, { id: 't2', subjectId: 's', title: 'Elasticity', estimatedMinutes: 60 }, { id: 't3', subjectId: 's', title: 'Game theory', estimatedMinutes: 60 }],
  });
}

test('mock-test prompt contains every chosen setting; config is saved', async ({ page }) => {
  await seedBasic(page);
  await page.goto('./#/mock-test');
  await expect(page.getByText('StudySync does not generate questions or contact any AI.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Game theory' }).uncheck();
  await page.getByLabel('Number of questions').selectOption('custom');
  await page.getByLabel('Custom number of questions').fill('12');
  await page.getByLabel('Difficulty').selectOption('mixed');
  await page.getByRole('checkbox', { name: 'Numerical' }).check();
  await page.getByLabel('Total marks (optional)').fill('60');
  await page.getByLabel('Time limit in minutes (optional)').fill('90');
  await page.getByLabel('Marking scheme (optional)').fill('Negative marking');
  await page.getByLabel('Exam-style instructions (optional)').fill('Answer all questions');
  const text = await page.getByLabel(/Prompt text/).inputValue();
  for (const s of ['Subject: Economics', 'Supply and demand; Elasticity', 'Number of questions: 12', 'Difficulty: mixed', 'multiple choice, short answer, numerical', 'Total marks: 60', 'Time limit: 90 minutes', 'Negative marking', 'Answer all questions', 'Do NOT include answers', 'proportionately', 'rubric', 'weakest topics', 'revision plan']) {
    expect(text).toContain(s);
  }
  expect(text).not.toContain('Game theory');
  await page.reload();
  await expect(page.getByLabel('Custom number of questions')).toHaveValue('12');
  await expect(page.getByRole('checkbox', { name: 'Game theory' })).not.toBeChecked();
});

test('clipboard unavailable: manual-copy fallback appears and text is selected', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
  await seedBasic(page);
  await page.goto('./#/mock-test');
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByText(/Copying isn’t available in this browser/)).toBeVisible();
  const selected = await page.getByLabel(/Prompt text/).evaluate((el: HTMLTextAreaElement) => el.selectionEnd - el.selectionStart === el.value.length && el.value.length > 0);
  expect(selected).toBe(true);
});

test('prompt can be downloaded as .txt and edits can be reset', async ({ page }) => {
  await seedBasic(page);
  await page.goto('./#/mock-test');
  const area = page.getByLabel(/Prompt text/);
  const original = await area.inputValue();
  await area.fill('my edit');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .txt' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.txt$/);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(area).toHaveValue(original);
});

test('export then import restores identical data; bad files are rejected safely', async ({ page }, info) => {
  await seedBasic(page);
  await generatePlan(page);
  await page.goto('./#/settings');
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data (.json)' }).click();
  const file = info.outputPath('export.json');
  await (await dl).saveAs(file);
  const exported = JSON.parse(readFileSync(file, 'utf8'));
  const original = (await stored(page)).data;
  expect(exported.data).toEqual(original);

  const bad = info.outputPath('bad.json');
  writeFileSync(bad, '{ not json');
  await page.getByTestId('import-file').setInputFiles(bad);
  await expect(page.getByRole('alert').filter({ hasText: 'not valid JSON' })).toBeVisible();
  const wrong = info.outputPath('wrong.json');
  writeFileSync(wrong, JSON.stringify({ ...exported, schemaVersion: 999 }));
  await page.getByTestId('import-file').setInputFiles(wrong);
  await expect(page.getByRole('alert').filter({ hasText: 'newer than this app supports' })).toBeVisible();
  const broken = info.outputPath('broken.json');
  writeFileSync(broken, JSON.stringify({ ...exported, data: { ...exported.data, sessions: [{ id: 'x' }] } }));
  await page.getByTestId('import-file').setInputFiles(broken);
  await expect(page.getByRole('alert').filter({ hasText: 'incomplete or damaged' })).toBeVisible();
  expect((await stored(page)).data).toEqual(original);

  // Reset, then import the good file.
  await page.getByRole('button', { name: 'Reset all data…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset all StudySync data?' });
  await expect(dialog.getByRole('button', { name: 'Delete everything' })).toBeDisabled();
  await dialog.getByLabel('Type RESET to confirm').fill('RESET');
  await dialog.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to StudySync' })).toBeVisible();
  await seed(page, { today: await browserToday(page), subjects: [], topics: [] });
  await page.goto('./#/settings');
  await page.getByTestId('import-file').setInputFiles(file);
  await page.getByRole('dialog', { name: 'Replace your current data?' }).getByRole('button', { name: 'Replace with imported data' }).click();
  const restored = (await stored(page)).data as unknown as Record<string, unknown>;
  const { activity: a1, ...rest1 } = restored;
  const { activity: a0, ...rest0 } = original as unknown as Record<string, unknown>;
  expect(rest1).toEqual(rest0);
  expect((a1 as unknown[]).length).toBe((a0 as unknown[]).length + 1); // + "Imported data" entry
});

test('corrupted saved data shows recovery and is never overwritten', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('studysync:data', '{"app":"studysync","schemaVersion":2,"data":{"oops"'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'We couldn’t read your saved data' })).toBeVisible();
  await expect(page.getByText(/has not been changed or deleted/)).toBeVisible();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download raw backup' }).click();
  expect((await dl).suggestedFilename()).toMatch(/raw-backup/);
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('studysync:data'))).toBe('{"app":"studysync","schemaVersion":2,"data":{"oops"');
  expect(await page.evaluate(() => localStorage.getItem('studysync:backup'))).toBe('{"app":"studysync","schemaVersion":2,"data":{"oops"');
  await page.getByRole('button', { name: 'Reset and start fresh…' }).click();
  await page.getByLabel('Type RESET to confirm').fill('reset');
  await page.getByRole('button', { name: 'Reset data' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to StudySync' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('studysync:backup'))).not.toBeNull();
});

test('session edit validates overlaps; delete needs confirmation', async ({ page }) => {
  const today = await browserToday(page);
  const d1 = addDays(today, 1);
  const mk = (id: string, start: number) => ({ id, topicId: 't', subjectId: 's', date: d1, start, duration: 50, status: 'planned', locked: false, actualMinutes: null, note: '', rescheduleCount: 0, history: [] });
  await seed(page, { today, subjects: [{ id: 's', name: 'Music', examDate: addDays(today, 5) }], topics: [{ id: 't', subjectId: 's', title: 'Harmony', estimatedMinutes: 100 }], sessions: [mk('a', 600), mk('b', 720)] });
  await page.goto('./#/timetable');
  await page.getByRole('button', { name: /^Edit time: Harmony, .* 10:00/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit session' });
  await dialog.getByLabel('Start time').fill('12:30');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog.getByText('It overlaps another study session.')).toBeVisible();
  await dialog.getByLabel('Start time').fill('15:00');
  await dialog.getByLabel('Duration (minutes)').fill('40');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toBeHidden();
  expect((await stored(page)).data.sessions.find((s) => s.id === 'a')).toMatchObject({ start: 900, duration: 40 });
  await page.getByRole('button', { name: /^Delete: Harmony, .* 12:00/ }).click();
  await page.getByRole('dialog', { name: 'Delete this session?' }).getByRole('button', { name: 'Cancel' }).click();
  expect((await stored(page)).data.sessions).toHaveLength(2);
  await page.getByRole('button', { name: /^Delete: Harmony, .* 12:00/ }).click();
  await page.getByRole('dialog', { name: 'Delete this session?' }).getByRole('button', { name: 'Delete session' }).click();
  expect((await stored(page)).data.sessions.map((s) => s.id)).toEqual(['a']);
});
