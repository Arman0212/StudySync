import { describe, it, expect } from 'vitest';
import { generateEdfPlan, generatePlan, nextChunk, requiredMinutes, conflictSuggestions } from './scheduler';
import { sessionScore } from './priority';
import { checkPlan } from './invariants';
import { av, commitment, planInput, session, subject, topic } from '../test/factories';
import type { PlanInput } from './scheduler';
import { addDays } from '../domain/dates';

function run(input: PlanInput) {
  const result = generatePlan(input);
  const errors = checkPlan(result.sessions, input);
  expect(errors).toEqual([]);
  return result;
}

const minutesFor = (sessions: { topicId: string; duration: number }[], topicId: string) =>
  sessions.filter((s) => s.topicId === topicId).reduce((t, s) => t + s.duration, 0);

describe('nextChunk', () => {
  it('splits evenly without exceeding the preferred length', () => {
    expect(nextChunk(40, 50)).toBe(40);
    expect(nextChunk(60, 50)).toBe(30);
    expect(nextChunk(125, 50)).toBe(45);
    expect(nextChunk(300, 50)).toBe(50);
    expect(nextChunk(7, 50)).toBe(7);
  });
});

describe('generatePlan scenarios', () => {
  it('one subject, two topics, future exam: sessions appear before the exam and link to topics', () => {
    const s = subject('math', '2026-01-12');
    const t1 = topic('t1', 'math', 120);
    const t2 = topic('t2', 'math', 90);
    const r = run(planInput({ subjects: [s], topics: [t1, t2] }));
    expect(r.conflicts).toEqual([]);
    expect(minutesFor(r.sessions, 't1')).toBe(120);
    expect(minutesFor(r.sessions, 't2')).toBe(90);
    for (const x of r.sessions) {
      expect(x.date < '2026-01-12' || (x.date === '2026-01-12' && x.start + x.duration <= 540)).toBe(true);
      expect(x.subjectId).toBe('math');
      expect(x.duration).toBeLessThanOrEqual(50);
    }
  });

  it('several subjects: the earlier exam is prioritised', () => {
    const early = subject('early', '2026-01-08');
    const late = subject('late', '2026-01-20', { priority: 'high' });
    const r = run(planInput({ subjects: [late, early], topics: [topic('l1', 'late', 200), topic('e1', 'early', 200)] }));
    const firstEarly = r.sessions.find((x) => x.subjectId === 'early')!;
    const firstLate = r.sessions.find((x) => x.subjectId === 'late')!;
    expect(firstEarly.date <= firstLate.date).toBe(true);
    expect(r.sessions[0]!.subjectId).toBe('early');
    expect(r.conflicts).toEqual([]);
  });

  it('hard, important topic is scheduled before an easy, minor topic for the same exam', () => {
    const s = subject('bio', '2026-01-15');
    const easy = topic('easy', 'bio', 100, { difficulty: 'easy', importance: 'low' });
    const hard = topic('hard', 'bio', 100, { difficulty: 'hard', importance: 'high' });
    const r = run(planInput({ subjects: [s], topics: [easy, hard] }));
    expect(r.sessions[0]!.topicId).toBe('hard');
    // every topic still gets time
    expect(minutesFor(r.sessions, 'easy')).toBe(100);
  });

  it('very low daily maximum: cap never exceeded and leftover becomes a conflict', () => {
    const s = subject('chem', '2026-01-08'); // 3 full days (5,6,7) + morning of 8 before 09:00 (window starts 09:00)
    const r = run(planInput({ availability: av({ dailyMaxMinutes: 30 }), subjects: [s], topics: [topic('c1', 'chem', 300)] }));
    const perDay = new Map<string, number>();
    for (const x of r.sessions) perDay.set(x.date, (perDay.get(x.date) ?? 0) + x.duration);
    for (const v of perDay.values()) expect(v).toBeLessThanOrEqual(30);
    expect(minutesFor(r.sessions, 'c1')).toBe(90);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ topicId: 'c1', neededMinutes: 210, availableMinutes: 90, reason: 'no_capacity' });
    expect(conflictSuggestions(r.conflicts[0]!).length).toBeGreaterThan(1);
  });

  it('weekly commitment overlapping the study window is never overlapped', () => {
    const s = subject('phy', '2026-01-19');
    const lecture = commitment('lec', { weekdays: [1, 2, 3, 4, 5], start: 10 * 60, end: 13 * 60 });
    const r = run(planInput({ commitments: [lecture], subjects: [s], topics: [topic('p1', 'phy', 600)] }));
    for (const x of r.sessions) {
      const wd = new Date(`${x.date}T12:00:00Z`).getUTCDay();
      if (wd >= 1 && wd <= 5) expect(x.start + x.duration <= 600 || x.start >= 780).toBe(true);
    }
  });

  it('no study days before an exam: clear conflict and no session after the exam', () => {
    // plan starts Monday 5 Jan; exam Thursday 8 Jan; study only on weekends
    const s = subject('law', '2026-01-08');
    const r = run(planInput({ availability: av({ studyDays: [0, 6] }), subjects: [s], topics: [topic('l1', 'law', 120)] }));
    expect(r.sessions).toEqual([]);
    expect(r.conflicts).toEqual([expect.objectContaining({ topicId: 'l1', neededMinutes: 120, availableMinutes: 0, reason: 'no_study_days' })]);
  });

  it('an earlier exam is not starved by greedy placement of a later exam', () => {
    // Capacity before the early exam: Jan 5 and 6 → 2 days × 100 min = 200 min.
    // A naive "highest priority first" greedy would put the late, high-priority hard
    // topic into Jan 5–6 and starve the early exam. EDF must give early its 200 min.
    const early = subject('early', '2026-01-07', { examStart: 8 * 60 });
    const late = subject('late', '2026-01-09', { examStart: 8 * 60, priority: 'high' });
    const tEarly = topic('e', 'early', 200, { difficulty: 'easy', importance: 'low' });
    const tLate = topic('l', 'late', 200, { difficulty: 'hard', importance: 'high' });
    const r = run(planInput({ availability: av({ dailyMaxMinutes: 100 }), subjects: [late, early], topics: [tLate, tEarly] }));
    expect(minutesFor(r.sessions, 'e')).toBe(200);
    expect(minutesFor(r.sessions, 'l')).toBe(200);
    expect(r.conflicts).toEqual([]);
  });

  it('two exams on the same day are interleaved and both get time', () => {
    const a = subject('a', '2026-01-08');
    const b = subject('b', '2026-01-08');
    const r = run(planInput({ availability: av({ dailyMaxMinutes: 100 }), subjects: [a, b], topics: [topic('ta', 'a', 300), topic('tb', 'b', 300)] }));
    // 3 days × 100 = 300 capacity shared fairly
    expect(minutesFor(r.sessions, 'ta')).toBe(150);
    expect(minutesFor(r.sessions, 'tb')).toBe(150);
    const total = r.conflicts.reduce((t, c) => t + c.neededMinutes, 0);
    expect(total).toBe(300);
  });

  it('a single topic longer than all capacity is partly scheduled with the rest in conflict', () => {
    const s = subject('his', '2026-01-07');
    const r = run(planInput({ subjects: [s], topics: [topic('h', 'his', 5000)] }));
    const scheduled = minutesFor(r.sessions, 'h');
    expect(scheduled).toBeGreaterThan(0);
    expect(scheduled + r.conflicts[0]!.neededMinutes).toBe(5000);
  });

  it('a commitment covering the entire study window leaves that day empty', () => {
    const s = subject('eco', '2026-01-08');
    const allDay = commitment('job', { repeat: 'once', date: '2026-01-06', start: 8 * 60, end: 22 * 60 });
    const r = run(planInput({ commitments: [allDay], subjects: [s], topics: [topic('e', 'eco', 900)] }));
    expect(r.sessions.some((x) => x.date === '2026-01-06')).toBe(false);
    expect(r.sessions.some((x) => x.date === '2026-01-05')).toBe(true);
  });

  it('exam before the plan start yields a conflict and no sessions', () => {
    const s = subject('old', '2026-01-01');
    const r = run(planInput({ subjects: [s], topics: [topic('o', 'old', 60)] }));
    expect(r.sessions).toEqual([]);
    expect(r.conflicts[0]).toMatchObject({ reason: 'exam_before_start', availableMinutes: 0 });
  });

  it('never schedules before "now" on the current day', () => {
    const s = subject('x', '2026-01-08');
    const r = run(planInput({ now: { date: '2026-01-05', minutes: 14 * 60 + 2 }, subjects: [s], topics: [topic('x1', 'x', 100)] }));
    expect(r.sessions[0]!.date).toBe('2026-01-05');
    expect(r.sessions[0]!.start).toBe(14 * 60 + 5);
  });

  it('respects short and long breaks', () => {
    const s = subject('br', '2026-01-08');
    const r = run(planInput({ availability: av({ dailyMaxMinutes: 600, shortBreak: 10, longBreak: 30, sessionsBeforeLongBreak: 2 }), subjects: [s], topics: [topic('b', 'br', 200)] }));
    const day = r.sessions.filter((x) => x.date === '2026-01-05');
    expect(day.map((x) => x.start)).toEqual([540, 600, 680, 740]);
  });

  it('exam without a start time blocks the whole exam day', () => {
    const s = subject('nd', '2026-01-06', { examStart: null });
    const r = run(planInput({ subjects: [s], topics: [topic('n', 'nd', 600)] }));
    expect(r.sessions.every((x) => x.date === '2026-01-05')).toBe(true);
  });

  it('completed topics need no time; preserved sessions count as coverage', () => {
    const t = topic('t', 's', 100);
    const done = session('d1', { topicId: 't', subjectId: 's', status: 'completed', duration: 50 });
    expect(requiredMinutes(t, [done])).toBe(50);
    expect(requiredMinutes({ ...t, status: 'completed' }, [])).toBe(0);
    const missed = session('m1', { topicId: 't', subjectId: 's', status: 'missed', duration: 50, locked: true });
    expect(requiredMinutes(t, [missed])).toBe(100);
  });
});

describe('regeneration', () => {
  it('keeps completed, locked and in-progress sessions exactly as they are', () => {
    const s = subject('m', '2026-01-12');
    const t1 = topic('t1', 'm', 300);
    const completed = session('c', { topicId: 't1', subjectId: 'm', date: '2026-01-05', start: 9 * 60, duration: 50, status: 'completed', actualMinutes: 45 });
    const locked = session('l', { topicId: 't1', subjectId: 'm', date: '2026-01-07', start: 15 * 60, duration: 40, locked: true });
    const inProg = session('i', { topicId: 't1', subjectId: 'm', date: '2026-01-06', start: 18 * 60, duration: 30, status: 'in_progress' });
    const planned = session('p', { topicId: 't1', subjectId: 'm', date: '2026-01-09', start: 10 * 60, duration: 50 });
    const input = planInput({ subjects: [s], topics: [t1], existingSessions: [completed, locked, inProg, planned] });
    const r = run(input);
    expect(r.sessions.find((x) => x.id === 'c')).toEqual(completed);
    expect(r.sessions.find((x) => x.id === 'l')).toEqual(locked);
    expect(r.sessions.find((x) => x.id === 'i')).toEqual(inProg);
    // remaining = 300 - 120 covered
    const fresh = r.sessions.filter((x) => !['c', 'l', 'i'].includes(x.id));
    expect(fresh.reduce((t, x) => t + x.duration, 0)).toBe(180);
    // the replaced planned session's id is reused (shows as "moved" in the diff)
    expect(fresh.some((x) => x.id === 'p')).toBe(true);
    // no duplicate ids
    expect(new Set(r.sessions.map((x) => x.id)).size).toBe(r.sessions.length);
  });

  it('regenerating twice is stable', () => {
    const s = subject('m', '2026-01-12');
    const input = planInput({ subjects: [s], topics: [topic('a', 'm', 200), topic('b', 'm', 100)] });
    const r1 = generatePlan(input);
    const r2 = generatePlan({ ...input, existingSessions: r1.sessions });
    expect(r2.sessions).toEqual(r1.sessions);
  });

  it('handles a long horizon quickly', () => {
    const subjects = [subject('a', addDays('2026-01-05', 120)), subject('b', addDays('2026-01-05', 90))];
    const topics = Array.from({ length: 40 }, (_, i) => topic(`x${i}`, i % 2 ? 'a' : 'b', 240));
    const t0 = performance.now();
    const r = run(planInput({ subjects, topics }));
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(r.conflicts).toEqual([]);
  });
});

describe('interleaved placement', () => {
  const runs = (list: { date: string; start: number; subjectId: string }[]) => {
    const byDay = new Map<string, string[]>();
    for (const s of [...list].sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start)) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s.subjectId]);
    let longest = 0;
    for (const seq of byDay.values()) {
      let run = 0;
      seq.forEach((x, i) => { run = i > 0 && seq[i - 1] === x ? run + 1 : 1; longest = Math.max(longest, run); });
    }
    return longest;
  };

  it('mixes subjects from day one instead of starving the later exam', () => {
    const early = subject('early', '2026-01-15');
    const late = subject('late', '2026-01-30');
    const input = planInput({ subjects: [early, late], topics: [topic('e', 'early', 400), topic('l', 'late', 400)] });
    const edf = generateEdfPlan(input);
    const mixed = run(input);
    expect(mixed.strategy).toBe('interleaved');
    // EDF puts nothing of "late" on the first day; the interleaved plan does.
    expect(edf.sessions.filter((s) => s.date === '2026-01-05').every((s) => s.subjectId === 'early')).toBe(true);
    expect(mixed.sessions.some((s) => s.date === '2026-01-05' && s.subjectId === 'late')).toBe(true);
    expect(mixed.conflicts).toEqual([]);
  });

  it('never puts more than two sessions of one subject in a row when another subject can use the slot', () => {
    const a = subject('a', '2026-01-20');
    const b = subject('b', '2026-01-21');
    const c = subject('c', '2026-01-22');
    const topics = [topic('a1', 'a', 300, { importance: 'high', difficulty: 'hard' }), topic('b1', 'b', 300), topic('c1', 'c', 300, { importance: 'low', difficulty: 'easy' })];
    const r = run(planInput({ availability: av({ dailyMaxMinutes: 600 }), subjects: [a, b, c], topics }));
    expect(r.strategy).toBe('interleaved');
    // Any third-in-a-row session must come after every other subject's last session,
    // i.e. at a point where no other subject had work left to place.
    const sorted = [...r.sessions].sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start);
    sorted.forEach((x, i) => {
      if (i < 2 || x.date !== sorted[i - 2]!.date) return;
      if (x.subjectId !== sorted[i - 1]!.subjectId || x.subjectId !== sorted[i - 2]!.subjectId) return;
      expect(sorted.slice(i + 1).some((y) => y.subjectId !== x.subjectId)).toBe(false);
    });
    // and while all three subjects still have work, the first day has no run above two
    const firstDay = sorted.filter((x) => x.date === '2026-01-05');
    expect(runs(firstDay)).toBeLessThanOrEqual(2);
  });

  it('allows a third session in a row only when nothing else is eligible', () => {
    // Only one subject has work left: it may fill the day.
    const r = run(planInput({ subjects: [subject('a', '2026-01-20'), subject('b', '2026-01-21')], topics: [topic('a1', 'a', 300), topic('b1', 'b', 30, { status: 'completed' })] }));
    expect(runs(r.sessions)).toBeGreaterThan(2);
  });

  it('keeps an earlier exam safe when capacity is tight (falls back or reserves)', () => {
    // Exactly enough room for the early exam before it starts; the later exam must wait.
    const early = subject('early', '2026-01-07', { examStart: 8 * 60 });
    const late = subject('late', '2026-01-09', { examStart: 8 * 60, priority: 'high' });
    const input = planInput({ availability: av({ dailyMaxMinutes: 100 }), subjects: [late, early], topics: [topic('l', 'late', 200, { difficulty: 'hard', importance: 'high' }), topic('e', 'early', 200, { difficulty: 'easy', importance: 'low' })] });
    const r = run(input);
    expect(minutesFor(r.sessions, 'e')).toBe(200);
    expect(minutesFor(r.sessions, 'l')).toBe(200);
    expect(r.conflicts).toEqual([]);
    for (const s of r.sessions.filter((x) => x.topicId === 'l')) expect(s.date >= '2026-01-07').toBe(true);
  });

  it('uses the caller id factory only for the returned plan', () => {
    let n = 0;
    const r = generatePlan(planInput({ subjects: [subject('a', '2026-01-20'), subject('b', '2026-01-25')], topics: [topic('a1', 'a', 100), topic('b1', 'b', 100)], makeId: () => `id${++n}` }));
    expect(r.sessions.map((s) => s.id).sort()).toEqual(Array.from({ length: r.sessions.length }, (_, i) => `id${i + 1}`).sort());
  });

  it('session score adds urgency, high priority and overdue work to topic priority', () => {
    const t = { importance: 'medium', difficulty: 'moderate', confidence: null } as const;
    expect(sessionScore(t, { examDate: '2026-02-01', priority: 'normal' }, '2026-01-05', 0)).toBe(10);
    expect(sessionScore(t, { examDate: '2026-01-10', priority: 'normal' }, '2026-01-05', 0)).toBe(19);
    expect(sessionScore(t, { examDate: '2026-01-10', priority: 'high' }, '2026-01-05', 1)).toBe(24);
    expect(sessionScore(t, { examDate: '2026-02-01', priority: 'normal' }, '2026-01-05', 10)).toBe(19);
  });
});
