import { describe, it, expect } from 'vitest';
import { alerts, overview, readiness, revisionSuggestions, subjectProgress, weeklyBars } from './progress';
import { emptyAppData } from './types';
import { session, subject, topic } from '../test/factories';

function data() {
  const d = emptyAppData();
  d.subjects = [subject('a', '2026-01-20'), subject('b', '2026-01-07')];
  d.topics = [topic('a1', 'a', 100, { confidence: 1 }), topic('a2', 'a', 100, { status: 'completed', confidence: 5 }), topic('b1', 'b', 60)];
  d.sessions = [
    session('s1', { topicId: 'a1', subjectId: 'a', date: '2026-01-05', duration: 50, status: 'completed', actualMinutes: 60 }),
    session('s2', { topicId: 'a1', subjectId: 'a', date: '2026-01-06', duration: 50, status: 'missed' }),
    session('s3', { topicId: 'b1', subjectId: 'b', date: '2026-01-06', duration: 60 }),
  ];
  return d;
}

describe('progress metrics', () => {
  it('computes per-subject completion from real records; missed never counts', () => {
    const sp = subjectProgress(data().subjects[0]!, data(), '2026-01-05');
    expect(sp.completedMinutes).toBe(150);
    expect(sp.percent).toBe(75);
    expect(sp.remainingMinutes).toBe(50);
    expect(sp.actualMinutes).toBe(60);
    expect(sp.topicsCompleted).toBe(1);
    expect(sp.daysToExam).toBe(15);
  });

  it('overview counts topics, completion and planned hours this week', () => {
    const o = overview(data(), '2026-01-05');
    expect(o).toMatchObject({ subjectCount: 2, topicsTotal: 3, topicsCompleted: 1, percent: 58, plannedMinutesThisWeek: 110, missedCount: 1 });
    expect(o.subjects[0]!.subject.id).toBe('b'); // ordered by exam date
  });

  it('weekly bars are derived from saved sessions only', () => {
    const bars = weeklyBars(data(), '2026-01-07');
    expect(bars).toHaveLength(7);
    expect(bars[0]).toEqual({ date: '2026-01-05', plannedMinutes: 50, completedMinutes: 50 });
    expect(bars[1]).toEqual({ date: '2026-01-06', plannedMinutes: 60, completedMinutes: 0 });
  });

  it('suggests low-confidence topics for revision', () => {
    expect(revisionSuggestions(data()).map((t) => t.id)).toEqual(['a1']);
  });

  it('readiness indicator uses only inputs that exist', () => {
    const d = data();
    const sp = subjectProgress(d.subjects[0]!, d, '2026-01-05');
    const r = readiness(sp, [])!;
    expect(r.components.map((c) => c.label)).toEqual(['Study completion', 'Average confidence']);
    expect(r.value).toBe(63); // (75 + 50) / 2
    const withScore = readiness(sp, [{ id: 'm', subjectId: 'a', date: '2026-01-05', scorePercent: 40, topicScores: {}, note: '' }])!;
    expect(withScore.components).toHaveLength(3);
    const empty = subjectProgress(subject('z', '2026-02-01'), { topics: [], sessions: [] }, '2026-01-05');
    expect(readiness(empty, [])).toBeNull();
  });

  it('raises capacity, missed and exam-soon alerts', () => {
    const d = data();
    d.conflicts = [{ topicId: 'b1', subjectId: 'b', neededMinutes: 60, availableMinutes: 0, reason: 'no_capacity' }];
    const ids = alerts(d, { date: '2026-01-05', minutes: 600 }).map((a) => a.id);
    expect(ids).toEqual(['capacity', 'missed', 'soon-b']);
  });
});
