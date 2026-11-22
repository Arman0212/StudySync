/**
 * Property-based tests: random profiles, commitments, subjects, topics and existing
 * sessions; every generated plan must satisfy all invariants.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generatePlan, isPreserved, requiredMinutes, type PlanInput } from './scheduler';
import { checkPlan } from './invariants';
import { previewBulkReschedule, applyOutcomes } from './rescheduler';
import { addDays } from '../domain/dates';
import type { Availability, Commitment, StudySession, Subject, Topic, Weekday } from '../domain/types';

const START = '2026-03-02';

const weekdaysArb = fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { minLength: 0, maxLength: 7 }).map((a) => a as Weekday[]);

const availabilityArb: fc.Arbitrary<Availability> = fc
  .record({
    studyDays: weekdaysArb,
    dayStart: fc.integer({ min: 6 * 12, max: 14 * 12 }).map((x) => x * 5),
    windowLen: fc.integer({ min: 12, max: 14 * 12 }).map((x) => x * 5),
    dailyMaxMinutes: fc.integer({ min: 3, max: 60 }).map((x) => x * 10),
    sessionLength: fc.integer({ min: 25, max: 120 }),
    shortBreak: fc.integer({ min: 0, max: 20 }),
    longBreak: fc.integer({ min: 20, max: 60 }),
    sessionsBeforeLongBreak: fc.integer({ min: 1, max: 5 }),
  })
  .map(({ windowLen, ...r }) => ({ ...r, dayEnd: Math.min(24 * 60, r.dayStart + windowLen) }));

const commitmentArb: fc.Arbitrary<Commitment> = fc
  .record({
    id: fc.uuid(),
    weekly: fc.boolean(),
    dayOffset: fc.integer({ min: 0, max: 20 }),
    weekdays: weekdaysArb,
    start: fc.integer({ min: 0, max: 22 * 12 }).map((x) => x * 5),
    len: fc.integer({ min: 1, max: 8 * 12 }).map((x) => x * 5),
  })
  .map((c) => ({
    id: c.id,
    label: 'c',
    repeat: c.weekly ? ('weekly' as const) : ('once' as const),
    date: c.weekly ? undefined : addDays(START, c.dayOffset),
    weekdays: c.weekly ? c.weekdays : undefined,
    start: c.start,
    end: Math.min(1440, c.start + c.len),
  }));

const worldArb = fc
  .record({
    availability: availabilityArb,
    commitments: fc.array(commitmentArb, { maxLength: 5 }),
    subjects: fc.array(
      fc.record({
        examOffset: fc.integer({ min: -2, max: 25 }),
        examStart: fc.option(fc.integer({ min: 0, max: 23 * 12 }).map((x) => x * 5), { nil: null }),
        high: fc.boolean(),
        topics: fc.array(
          fc.record({
            minutes: fc.integer({ min: 1, max: 600 }),
            difficulty: fc.constantFrom('easy', 'moderate', 'hard') as fc.Arbitrary<Topic['difficulty']>,
            importance: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<Topic['importance']>,
            status: fc.constantFrom('not_started', 'in_progress', 'completed') as fc.Arbitrary<Topic['status']>,
            confidence: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
      }),
      { minLength: 1, maxLength: 4 },
    ),
    nowOffset: fc.integer({ min: 0, max: 3 }),
    nowMinutes: fc.integer({ min: 0, max: 1439 }),
  })
  .map((w) => {
    const subjects: Subject[] = [];
    const topics: Topic[] = [];
    w.subjects.forEach((s, i) => {
      const id = `s${i}`;
      subjects.push({ id, name: id, examDate: addDays(START, s.examOffset), examStart: s.examStart, priority: s.high ? 'high' : 'normal', color: '#000' });
      s.topics.forEach((t, j) => {
        topics.push({ id: `${id}t${j}`, subjectId: id, title: 't', notes: '', difficulty: t.difficulty, importance: t.importance, estimatedMinutes: t.minutes, status: t.status, confidence: t.confidence, order: j });
      });
    });
    let n = 0;
    const input: PlanInput = {
      profile: { planStart: START },
      availability: w.availability,
      commitments: w.commitments,
      subjects,
      topics,
      existingSessions: [],
      now: { date: addDays(START, w.nowOffset), minutes: w.nowMinutes },
      makeId: () => `g${++n}`,
    };
    return input;
  });

function totals(input: PlanInput, sessions: StudySession[], conflicts: { neededMinutes: number }[]) {
  const preserved = input.existingSessions.filter(isPreserved);
  const required = input.topics.reduce((t, topic) => t + requiredMinutes(topic, preserved), 0);
  const preservedIds = new Set(preserved.map((s) => s.id));
  const scheduled = sessions.filter((s) => !preservedIds.has(s.id)).reduce((t, s) => t + s.duration, 0);
  const conflicted = conflicts.reduce((t, c) => t + c.neededMinutes, 0);
  return { required, scheduled, conflicted };
}

const RUNS = 300;

describe('scheduler invariants (property-based)', () => {
  it('every fresh plan satisfies all invariants and accounts for all required time', () => {
    fc.assert(
      fc.property(worldArb, (input) => {
        const r = generatePlan(input);
        expect(checkPlan(r.sessions, input)).toEqual([]);
        const topicIds = new Set(input.topics.map((t) => t.id));
        for (const s of r.sessions) expect(topicIds.has(s.topicId)).toBe(true);
        // never before "now"
        for (const s of r.sessions) expect(s.date > input.now.date || (s.date === input.now.date && s.start >= input.now.minutes)).toBe(true);
        const t = totals(input, r.sessions, r.conflicts);
        expect(t.scheduled + t.conflicted).toBe(t.required);
      }),
      { numRuns: RUNS },
    );
  });

  it('regeneration leaves completed, locked and in-progress sessions unchanged', () => {
    fc.assert(
      fc.property(worldArb, fc.array(fc.tuple(fc.nat(), fc.constantFrom('completed', 'locked', 'in_progress', 'missed', 'none')), { maxLength: 30 }), fc.integer({ min: 0, max: 4 }), (input, marks, later) => {
        const first = generatePlan(input);
        // Mark some sessions as completed / locked / in progress / missed.
        const existing = first.sessions.map((s) => ({ ...s }));
        for (const [idx, kind] of marks) {
          const s = existing[idx % Math.max(1, existing.length)];
          if (!s) continue;
          if (kind === 'completed') s.status = 'completed';
          if (kind === 'locked') s.locked = true;
          if (kind === 'in_progress') s.status = 'in_progress';
          if (kind === 'missed') s.status = 'missed';
        }
        const next: PlanInput = { ...input, existingSessions: existing, now: { date: addDays(input.now.date, later), minutes: input.now.minutes } };
        const r = generatePlan(next);
        for (const s of existing.filter(isPreserved)) expect(r.sessions.find((x) => x.id === s.id)).toEqual(s);
        expect(new Set(r.sessions.map((s) => s.id)).size).toBe(r.sessions.length);
        // Only newly placed sessions must satisfy the placement rules (preserved ones may be in the past).
        const preservedIds = new Set(existing.filter(isPreserved).map((s) => s.id));
        const fresh = new Set(r.sessions.filter((s) => !preservedIds.has(s.id)).map((s) => s.id));
        expect(checkPlan(r.sessions, next, { onlyIds: fresh })).toEqual([]);
        const t = totals(next, r.sessions, r.conflicts);
        expect(t.scheduled + t.conflicted).toBe(t.required);
      }),
      { numRuns: RUNS },
    );
  });

  it('bulk rescheduling never overlaps, duplicates or passes an exam', () => {
    fc.assert(
      fc.property(worldArb, fc.array(fc.nat(), { maxLength: 10 }), (input, picks) => {
        const plan = generatePlan(input).sessions.map((s) => ({ ...s }));
        for (const p of picks) {
          const s = plan[p % Math.max(1, plan.length)];
          if (s) s.status = 'missed';
        }
        const ctx = { ...input, sessions: plan, timestamp: 'x' };
        const outcomes = previewBulkReschedule(ctx);
        const applied = applyOutcomes(plan, outcomes);
        expect(applied).toHaveLength(plan.length);
        const movedIds = new Set(outcomes.filter((o) => o.kind === 'moved').map((o) => o.session.id));
        expect(checkPlan(applied, input, { onlyIds: movedIds })).toEqual([]);
        for (const o of outcomes) if (o.kind === 'moved') expect(o.session.rescheduleCount).toBe(1);
      }),
      { numRuns: RUNS },
    );
  });
});

describe('property generator sanity', () => {
  it('produces non-trivial plans (both sessions and conflicts occur)', () => {
    const samples = fc.sample(worldArb, { numRuns: 200, seed: 42 });
    const results = samples.map((i) => generatePlan(i));
    const withSessions = results.filter((r) => r.sessions.length > 0).length;
    const withConflicts = results.filter((r) => r.conflicts.length > 0).length;
    expect(withSessions).toBeGreaterThan(60);
    expect(withConflicts).toBeGreaterThan(20);
  });
});
