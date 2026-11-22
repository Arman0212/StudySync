import { test, expect } from '@playwright/test';
import { addDays, addSubject, addTopic, browserToday, createProfile, fresh, generatePlan, seed, stored } from './helpers';

test.describe('core user flows', () => {
  test('setup → generate: sessions appear before the exam and link to the right topics', async ({ page }) => {
    const today = await createProfile(page);
    const exam = addDays(today, 5);
    await addSubject(page, 'Calculus', exam, '09:00');
    await addTopic(page, 'Calculus', 'Limits', 120, { difficulty: 'hard', importance: 'high' });
    await addTopic(page, 'Calculus', 'Series', 60, { difficulty: 'easy', importance: 'low' });
    await generatePlan(page);
    const d = await stored(page);
    const byTopic = (title: string) => d.data.sessions.filter((s) => s.topicId === (d.data.topics as unknown as { id: string; title: string }[]).find((t) => t.title === title)!.id);
    expect(byTopic('Limits').reduce((t, s) => t + s.duration, 0)).toBe(120);
    expect(byTopic('Series').reduce((t, s) => t + s.duration, 0)).toBe(60);
    for (const s of d.data.sessions) expect(s.date < exam || (s.date === exam && s.start + s.duration <= 540)).toBe(true);
    await expect(page.getByRole('article', { name: /Session: Limits/ }).first()).toBeVisible();
    await expect(page.getByRole('article', { name: /Session: Series/ }).first()).toBeVisible();
  });

  test('earlier exam is prioritised and a very low daily maximum produces a visible capacity conflict', async ({ page }) => {
    const today = await browserToday(page);
    await seed(page, {
      today, dailyMax: 60, planStart: addDays(today, 1),
      subjects: [{ id: 'late', name: 'Late Subject', examDate: addDays(today, 10) }, { id: 'early', name: 'Early Subject', examDate: addDays(today, 3) }],
      topics: [{ id: 'l1', subjectId: 'late', title: 'Late topic', estimatedMinutes: 60 }, { id: 'e1', subjectId: 'early', title: 'Early topic', estimatedMinutes: 300 }],
    });
    await generatePlan(page);
    const d = await stored(page);
    const first = [...d.data.sessions].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]!;
    expect(first.topicId).toBe('e1');
    const perDay = new Map<string, number>();
    for (const s of d.data.sessions) perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.duration);
    for (const v of perDay.values()) expect(v).toBeLessThanOrEqual(60);
    const conflicts = page.getByRole('list', { name: 'Capacity conflicts' });
    await expect(conflicts).toContainText('Early topic');
    await expect(conflicts).toContainText('Needs 2 h 30 min more') // 3 days × one 50-min session (a 2nd session would be < 25 min under the 60-min cap);
    await page.goto('./#/dashboard');
    await expect(page.getByText(/could not fully fit/)).toBeVisible();
  });

  test('marking a topic complete updates every metric immediately and survives reload', async ({ page }) => {
    const today = await browserToday(page);
    await seed(page, { today, subjects: [{ id: 's', name: 'Biology', examDate: addDays(today, 6) }], topics: [{ id: 't1', subjectId: 's', title: 'Cells', estimatedMinutes: 100 }, { id: 't2', subjectId: 's', title: 'Genetics', estimatedMinutes: 100 }] });
    await page.goto('./#/progress');
    await page.getByRole('checkbox', { name: /Cells/ }).check();
    await expect(page.getByRole('progressbar', { name: 'Overall completion' })).toHaveAttribute('aria-valuenow', '50');
    await page.goto('./#/dashboard');
    await expect(page.getByTestId('metric-topics')).toHaveText('1 / 2');
    await expect(page.getByTestId('metric-completion')).toHaveText('50%');
    await page.reload();
    await expect(page.getByTestId('metric-topics')).toHaveText('1 / 2');
    await expect(page.getByTestId('metric-completion')).toHaveText('50%');
  });

  test('missed session is not counted complete; rescheduling keeps identity and moves before the exam', async ({ page }) => {
    const today = await browserToday(page);
    const tomorrow = addDays(today, 1);
    await seed(page, {
      today, planStart: tomorrow,
      subjects: [{ id: 's', name: 'Physics', examDate: addDays(today, 4) }],
      topics: [{ id: 't', subjectId: 's', title: 'Optics', estimatedMinutes: 100 }],
      sessions: [
        { id: 'keep-me', topicId: 't', subjectId: 's', date: tomorrow, start: 600, duration: 50, status: 'planned', locked: false, actualMinutes: null, note: '', rescheduleCount: 0, history: [] },
        { id: 'other', topicId: 't', subjectId: 's', date: tomorrow, start: 700, duration: 50, status: 'planned', locked: false, actualMinutes: null, note: '', rescheduleCount: 0, history: [] },
      ],
    });
    await page.goto('./#/timetable');
    await page.getByRole('button', { name: /Mark missed: Optics, .* 10:00/ }).click();
    await expect(page.getByRole('article', { name: /Optics, .* 10:00/ })).toContainText('Missed');
    await page.goto('./#/progress');
    await expect(page.getByRole('progressbar', { name: 'Overall completion' })).toHaveAttribute('aria-valuenow', '0');
    await page.goto('./#/timetable');
    await page.getByRole('button', { name: /^Reschedule: Optics/ }).click();
    await expect(page.getByText(/Moved “Optics” to/)).toBeVisible();
    const d = await stored(page);
    expect(d.data.sessions).toHaveLength(2);
    const moved = d.data.sessions.find((s) => s.id === 'keep-me')!;
    expect(moved.status).toBe('rescheduled');
    expect(moved.rescheduleCount).toBe(1);
    expect(moved.history).toHaveLength(1);
    expect(moved.date < addDays(today, 4)).toBe(true);
    const other = d.data.sessions.find((s) => s.id === 'other')!;
    if (moved.date === other.date) expect(moved.start >= other.start + other.duration || moved.start + moved.duration <= other.start).toBe(true);
  });

  test('bulk rescheduling shows a preview and nothing changes until confirmation', async ({ page }) => {
    const today = await browserToday(page);
    const tomorrow = addDays(today, 1);
    const mk = (id: string, start: number) => ({ id, topicId: 't', subjectId: 's', date: tomorrow, start, duration: 50, status: 'missed', locked: false, actualMinutes: null, note: '', rescheduleCount: 0, history: [] });
    await seed(page, { today, planStart: tomorrow, subjects: [{ id: 's', name: 'Law', examDate: addDays(today, 5) }], topics: [{ id: 't', subjectId: 's', title: 'Torts', estimatedMinutes: 100 }], sessions: [mk('m1', 600), mk('m2', 700)] });
    await page.goto('./#/timetable');
    const before = JSON.stringify((await stored(page)).data.sessions);
    await page.getByRole('button', { name: 'Reschedule all missed (2)' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reschedule all missed sessions?' });
    await expect(dialog.getByRole('list', { name: 'Reschedule preview' }).getByRole('listitem')).toHaveCount(2);
    expect(JSON.stringify((await stored(page)).data.sessions)).toBe(before);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(JSON.stringify((await stored(page)).data.sessions)).toBe(before);
    await page.getByRole('button', { name: 'Reschedule all missed (2)' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Apply 2 move/ }).click();
    const after = (await stored(page)).data.sessions;
    expect(after.map((s) => s.status)).toEqual(['rescheduled', 'rescheduled']);
  });

  test('a locked session survives regeneration unchanged; preview shown before applying', async ({ page }) => {
    const today = await browserToday(page);
    const tomorrow = addDays(today, 1);
    await seed(page, {
      today, planStart: tomorrow,
      subjects: [{ id: 's', name: 'Chemistry', examDate: addDays(today, 6) }],
      topics: [{ id: 't', subjectId: 's', title: 'Bonds', estimatedMinutes: 200 }],
      sessions: [{ id: 'locked1', topicId: 't', subjectId: 's', date: addDays(today, 2), start: 1000, duration: 40, status: 'planned', locked: false, actualMinutes: null, note: '', rescheduleCount: 0, history: [] }],
    });
    await page.goto('./#/timetable');
    await page.getByRole('button', { name: /^Lock: Bonds/ }).click();
    const lockedBefore = (await stored(page)).data.sessions.find((s) => s.id === 'locked1');
    expect(lockedBefore!.locked).toBe(true);
    await page.getByRole('button', { name: 'Regenerate plan' }).click();
    const dialog = page.getByRole('dialog', { name: 'Preview plan changes' });
    await expect(dialog.getByTestId('diff-added')).not.toHaveText('0');
    expect((await stored(page)).data.sessions).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Apply changes' }).click();
    const after = (await stored(page)).data.sessions;
    expect(after.find((s) => s.id === 'locked1')).toEqual(lockedBefore);
    expect(after.reduce((t, s) => t + s.duration, 0)).toBe(200);
  });

  test('exam before plan start: warning, confirmation and a visible conflict instead of an invalid plan', async ({ page }) => {
    const today = await createProfile(page);
    await addSubject(page, 'Old Exam', addDays(today, -2));
    await expect(page.getByRole('dialog', { name: 'Exam date is before your plan start' })).toBeVisible();
    await page.getByRole('button', { name: 'Save anyway' }).click();
    await expect(page.getByText(/This exam is before your plan start/)).toBeVisible();
    await addTopic(page, 'Old Exam', 'Something', 60);
    await generatePlan(page);
    expect((await stored(page)).data.sessions).toHaveLength(0);
    await expect(page.getByRole('list', { name: 'Capacity conflicts' })).toContainText('exam is before the plan start');
  });

  test('empty subject and topic forms show helpful messages and leave no broken state', async ({ page }) => {
    await createProfile(page);
    await page.goto('./#/setup/subjects');
    const form = page.getByRole('form', { name: 'New subject' });
    await form.getByRole('button', { name: 'Add subject' }).click();
    await expect(form.getByText('Subject name is required.')).toBeVisible();
    await expect(form.getByText('Choose the exam date.')).toBeVisible();
    await expect(page.getByText('No subjects yet')).toBeVisible();
    const today = await browserToday(page);
    await addSubject(page, 'Art', addDays(today, 3));
    await page.getByRole('button', { name: 'Add topic' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Estimated study time (minutes)').fill('');
    await dialog.getByRole('button', { name: 'Add topic' }).click();
    await expect(dialog.getByText('Topic title is required.')).toBeVisible();
    await expect(dialog.getByText(/more than 0 minutes/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    await expect(page.getByText('No topics yet')).toBeVisible();
    await page.goto('./#/timetable');
    await expect(page.getByText('Nothing to plan yet')).toBeVisible();
  });

  test('a full reload after edits keeps profile, subjects, sessions and progress', async ({ page }) => {
    const today = await createProfile(page, 'Meera');
    await addSubject(page, 'Statistics', addDays(today, 4), '09:00');
    await addTopic(page, 'Statistics', 'Regression', 100);
    await generatePlan(page);
    const first = page.getByRole('button', { name: /^Mark complete: Regression/ }).first();
    await first.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
    const before = await stored(page);
    await page.reload();
    await expect(page.getByTestId('saved-indicator').first()).toBeAttached();
    const after = await stored(page);
    expect(after).toEqual(before);
    await page.goto('./#/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Meera');
    await expect(page.getByTestId('metric-subjects')).toHaveText('1');
    await page.goto('./#/timetable');
    await expect(page.getByRole('article').filter({ hasText: 'Completed' })).toHaveCount(1);
  });
});

test('welcome screen does not invent data', async ({ page }) => {
  await fresh(page);
  expect(await page.evaluate(() => localStorage.getItem('studysync:data'))).toBeNull();
});
