import type { Availability, Commitment, StudySession, Subject, Topic } from '../domain/types';
import { DEFAULT_AVAILABILITY } from '../domain/types';
import type { PlanInput } from '../scheduling/scheduler';

export function av(overrides: Partial<Availability> = {}): Availability {
  return { ...DEFAULT_AVAILABILITY, studyDays: [0, 1, 2, 3, 4, 5, 6], ...overrides };
}

export function subject(id: string, examDate: string, overrides: Partial<Subject> = {}): Subject {
  return { id, name: id.toUpperCase(), examDate, examStart: 9 * 60, priority: 'normal', color: '#1f6f50', ...overrides };
}

let order = 0;
export function topic(id: string, subjectId: string, estimatedMinutes: number, overrides: Partial<Topic> = {}): Topic {
  return {
    id, subjectId, title: `Topic ${id}`, notes: '', difficulty: 'moderate', importance: 'medium',
    estimatedMinutes, status: 'not_started', confidence: null, order: order++, ...overrides,
  };
}

export function commitment(id: string, overrides: Partial<Commitment>): Commitment {
  return { id, label: id, repeat: 'weekly', weekdays: [], start: 0, end: 0, ...overrides };
}

export function session(id: string, overrides: Partial<StudySession>): StudySession {
  return {
    id, topicId: 't', subjectId: 's', date: '2026-01-05', start: 600, duration: 50, status: 'planned',
    locked: false, actualMinutes: null, note: '', rescheduleCount: 0, history: [], ...overrides,
  };
}

export function idFactory(prefix = 'n'): () => string {
  let i = 0;
  return () => `${prefix}${++i}`;
}

export function planInput(overrides: Partial<PlanInput>): PlanInput {
  return {
    profile: { planStart: '2026-01-05' },
    availability: av(),
    commitments: [],
    subjects: [],
    topics: [],
    existingSessions: [],
    now: { date: '2026-01-05', minutes: 0 },
    makeId: idFactory(),
    ...overrides,
  };
}
