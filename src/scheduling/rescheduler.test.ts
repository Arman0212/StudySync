import { describe, it, expect } from 'vitest';
import { applyOutcomes, applyShorter, previewBulkReschedule, rescheduleSession, type RescheduleContext } from './rescheduler';
import { diffPlans, hasChanges } from './diff';
import { generatePlan } from './scheduler';
import { checkPlan } from './invariants';
import { av, planInput, session, subject, topic } from '../test/factories';

const subj = subject('m', '2026-01-09');
const topics = [topic('t', 'm', 500)];

function ctx(sessions: RescheduleContext['sessions'], overrides: Partial<RescheduleContext> = {}): RescheduleContext {
  return {
    profile: { planStart: '2026-01-05' },
    availability: av(),
    commitments: [],
    subjects: [subj],
    sessions,
    now: { date: '2026-01-06', minutes: 8 * 60 },
    timestamp: '2026-01-06T08:00:00.000Z',
    ...overrides,
  };
}

describe('rescheduleSession', () => {
  it('moves a missed session to a valid slot before the exam with the same identity', () => {
    const missed = session('a', { topicId: 't', subjectId: 'm', date: '2026-01-05', start: 9 * 60, status: 'missed' });
    const other = session('b', { topicId: 't', subjectId: 'm', date: '2026-01-06', start: 9 * 60 });
    const c = ctx([missed, other]);
    const out = rescheduleSession('a', c)!;
    expect(out.kind).toBe('moved');
    if (out.kind !== 'moved') return;
    expect(out.session).toMatchObject({ id: 'a', topicId: 't', duration: 50, status: 'rescheduled', rescheduleCount: 1, date: '2026-01-06', start: 600 });
    expect(out.session.history).toEqual([{ fromDate: '2026-01-05', fromStart: 540, toDate: '2026-01-06', toStart: 600, reason: 'Missed session', at: c.timestamp }]);
    const next = applyOutcomes(c.sessions, [out]);
    expect(next).toHaveLength(2);
    expect(new Set(next.map((s) => s.id)).size).toBe(2);
    expect(checkPlan(next, { ...c, topics })).toEqual([]);
    // moving it again increments the count and keeps history
    const again = rescheduleSession('a', ctx(next.map((s) => (s.id === 'a' ? { ...s, status: 'missed' as const } : s))))!;
    expect(again.kind === 'moved' && again.session.rescheduleCount).toBe(2);
    expect(again.kind === 'moved' && again.session.history).toHaveLength(2);
  });

  it('returns a conflict with choices when nothing fits before the exam', () => {
    const missed = session('a', { topicId: 't', subjectId: 'm', date: '2026-01-05', start: 9 * 60, status: 'missed', duration: 50 });
    const c = ctx([missed], { now: { date: '2026-01-08', minutes: 20 * 60 + 30 } }); // only 30 min left before exam day
    const out = rescheduleSession('a', c)!;
    expect(out.kind).toBe('conflict');
    if (out.kind !== 'conflict') return;
    expect(out.choices).toEqual(['shorten', 'keep_missed', 'delete']);
    expect(out.shorterOption).toEqual({ date: '2026-01-08', start: 20 * 60 + 30, duration: 30 });
    const shortened = applyShorter(out, c)!;
    expect(shortened).toMatchObject({ id: 'a', duration: 30, status: 'rescheduled' });

    const none = rescheduleSession('a', ctx([missed], { now: { date: '2026-01-08', minutes: 21 * 60 } }))!;
    expect(none.kind === 'conflict' && none.choices).toEqual(['keep_missed', 'delete']);
  });

  it('returns null for unknown sessions', () => {
    expect(rescheduleSession('zzz', ctx([]))).toBeNull();
  });
});

describe('previewBulkReschedule', () => {
  it('places every missed session without collisions and changes nothing until applied', () => {
    const sessions = [0, 1, 2].map((i) => session(`m${i}`, { topicId: 't', subjectId: 'm', date: '2026-01-05', start: 540 + i * 60, status: 'missed' }));
    const c = ctx(sessions, { availability: av({ dailyMaxMinutes: 100 }) });
    const snapshot = JSON.stringify(c.sessions);
    const preview = previewBulkReschedule(c);
    expect(JSON.stringify(c.sessions)).toBe(snapshot); // pure: nothing changed
    expect(preview.every((o) => o.kind === 'moved')).toBe(true);
    const applied = applyOutcomes(c.sessions, preview);
    expect(applied).toHaveLength(3);
    expect(checkPlan(applied, { ...c, topics })).toEqual([]);
  });
});

describe('diffPlans', () => {
  it('reports added, moved and removed sessions for regeneration', () => {
    const input = planInput({ subjects: [subject('m', '2026-01-12')], topics: [topic('t', 'm', 150)] });
    const first = generatePlan(input).sessions;
    const bigger = planInput({ ...input, topics: [topic('t', 'm', 250)], existingSessions: first, now: { date: '2026-01-06', minutes: 0 } });
    const second = generatePlan(bigger).sessions;
    const d = diffPlans(first, second);
    expect(hasChanges(d)).toBe(true);
    expect(d.moved.length).toBe(first.length);
    expect(d.added.length).toBeGreaterThan(0);
    expect(d.removed).toEqual([]);
    const removedDiff = diffPlans(first, []);
    expect(removedDiff.removed).toHaveLength(first.length);
    expect(hasChanges(diffPlans(first, first))).toBe(false);
  });
});
