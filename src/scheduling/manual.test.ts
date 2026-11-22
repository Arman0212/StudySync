import { describe, it, expect } from 'vitest';
import { placementProblems } from './manual';
import { av, commitment, session, subject } from '../test/factories';

const ctx = {
  availability: av({ dailyMaxMinutes: 100 }),
  commitments: [commitment('lab', { weekdays: [1], start: 600, end: 660 })],
  subjects: [subject('m', '2026-01-07')],
  sessions: [session('other', { subjectId: 'm', date: '2026-01-05', start: 700, duration: 50 })],
};

describe('placementProblems', () => {
  it('accepts a valid placement', () => {
    expect(placementProblems({ id: 'x', subjectId: 'm', date: '2026-01-06', start: 600, duration: 50 }, ctx)).toEqual([]);
  });
  it('reports every rule that is broken', () => {
    const p = placementProblems({ id: 'x', subjectId: 'm', date: '2026-01-05', start: 630, duration: 90 }, ctx);
    expect(p).toEqual(['It overlaps one of your commitments.', 'It overlaps another study session.', expect.stringMatching(/above your daily maximum/)]);
    expect(placementProblems({ id: 'x', subjectId: 'm', date: '2026-01-07', start: 540, duration: 30 }, ctx)).toEqual(['It would end after the M exam starts.']);
    expect(placementProblems({ id: 'x', subjectId: 'm', date: '2026-01-06', start: 1300, duration: 30 }, ctx)).toEqual(['The session is outside your daily study hours.']);
  });
});
