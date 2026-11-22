import { describe, expect, it } from 'vitest';
import { heatLevel, heatmapWeeks } from './heatmap';
import type { StudySession } from '../domain/types';

const session = (over: Partial<StudySession>): StudySession => ({ id: 'x', topicId: 't', subjectId: 's', date: '2026-11-23', start: 600, duration: 50, status: 'completed', locked: false, rescheduleCount: 0, history: [], ...over }) as StudySession;

describe('study heatmap', () => {
  it('builds Monday-first week columns ending with the current week', () => {
    const weeks = heatmapWeeks([], '2026-11-25', 3);
    expect(weeks).toHaveLength(3);
    expect(weeks[0]![0]!.date).toBe('2026-11-09');
    expect(weeks[2]![6]!.date).toBe('2026-11-29');
    expect(weeks[2]![2]!.future).toBe(false);
    expect(weeks[2]![3]!.future).toBe(true);
  });

  it('sums only completed sessions, preferring actual minutes', () => {
    const weeks = heatmapWeeks(
      [session({ date: '2026-11-24', duration: 50, actualMinutes: 70 }), session({ date: '2026-11-24', duration: 50 }), session({ date: '2026-11-24', status: 'missed' }), session({ date: '2026-11-23', status: 'planned' })],
      '2026-11-25',
      1,
    );
    expect(weeks[0]![1]!.minutes).toBe(120);
    expect(weeks[0]![1]!.level).toBe(3);
    expect(weeks[0]![0]!.minutes).toBe(0);
  });

  it('maps minutes to five levels', () => {
    expect([0, 1, 59, 60, 119, 120, 179, 180, 600].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
