import { describe, it, expect } from 'vitest';
import { compareSubjects, confidenceGap, sortTopicsByPriority, topicPriority } from './priority';
import { subject, topic } from '../test/factories';

describe('priority formula', () => {
  it('matches the documented formula', () => {
    expect(topicPriority({ importance: 'low', difficulty: 'easy', confidence: null })).toBe(5);
    expect(topicPriority({ importance: 'high', difficulty: 'hard', confidence: 1 })).toBe(17);
    expect(topicPriority({ importance: 'medium', difficulty: 'moderate', confidence: 3 })).toBe(10);
    expect(topicPriority({ importance: 'high', difficulty: 'easy', confidence: 2 })).toBe(12);
  });

  it('confidence gap only boosts low confidence', () => {
    expect([null, 1, 2, 3, 4, 5].map((c) => confidenceGap(c))).toEqual([0, 2, 1, 0, 0, 0]);
  });

  it('sorts topics by priority with stable ties', () => {
    const a = topic('a', 's', 10, { importance: 'low', difficulty: 'easy' });
    const b = topic('b', 's', 10, { importance: 'high', difficulty: 'hard' });
    const c = topic('c', 's', 10, { importance: 'low', difficulty: 'easy' });
    expect(sortTopicsByPriority([a, b, c]).map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('orders subjects by exam moment, then high priority', () => {
    const a = subject('a', '2026-02-01');
    const b = subject('b', '2026-01-20');
    const c = subject('c', '2026-01-20', { priority: 'high' });
    const d = subject('d', '2026-01-20', { examStart: 8 * 60 });
    expect([a, b, c, d].sort(compareSubjects).map((s) => s.id)).toEqual(['d', 'c', 'b', 'a']);
  });
});
