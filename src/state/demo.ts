/**
 * FICTIONAL demo data, only loaded when the student presses "Load demo data".
 * Dates are relative to "today" so the demo always looks current.
 */
import { addDays } from '../domain/dates';
import type { AppData, LocalNow, Topic } from '../domain/types';
import { DEFAULT_AVAILABILITY, emptyAppData } from '../domain/types';
import { generatePlan } from '../scheduling/scheduler';

export function buildDemoData(now: LocalNow, timezone: string, makeId: () => string): AppData {
  const d = emptyAppData();
  d.isDemo = true;
  d.profile = { displayName: 'Demo Student', institution: 'Example University (fictional)', timezone, planStart: now.date };
  d.availability = { ...DEFAULT_AVAILABILITY, studyDays: [1, 2, 3, 4, 5, 6], dayStart: 9 * 60, dayEnd: 20 * 60, dailyMaxMinutes: 4 * 60 };
  d.commitments = [
    { id: 'demo-c1', label: 'Lectures (demo)', repeat: 'weekly', weekdays: [1, 3, 5], start: 10 * 60, end: 12 * 60 },
    { id: 'demo-c2', label: 'Lab session (demo)', repeat: 'weekly', weekdays: [2], start: 14 * 60, end: 17 * 60 },
    { id: 'demo-c3', label: 'Commute (demo)', repeat: 'weekly', weekdays: [1, 2, 3, 4, 5], start: 9 * 60, end: 9 * 60 + 30 },
  ];
  d.subjects = [
    { id: 'demo-s1', name: 'Linear Algebra', examDate: addDays(now.date, 9), examStart: 10 * 60, priority: 'high', color: '#2563a8' },
    { id: 'demo-s2', name: 'Organic Chemistry', examDate: addDays(now.date, 16), examStart: 14 * 60, priority: 'normal', color: '#8a4fb0' },
    { id: 'demo-s3', name: 'Economics', examDate: addDays(now.date, 23), examStart: null, priority: 'normal', color: '#b4471f' },
  ];
  let order = 0;
  const t = (id: string, subjectId: string, title: string, mins: number, difficulty: Topic['difficulty'], importance: Topic['importance'], confidence: number | null): Topic => ({
    id, subjectId, title, notes: '', difficulty, importance, estimatedMinutes: mins, status: 'not_started', confidence, order: order++,
  });
  d.topics = [
    t('demo-t1', 'demo-s1', 'Eigenvalues and eigenvectors', 240, 'hard', 'high', 2),
    t('demo-t2', 'demo-s1', 'Vector spaces', 150, 'moderate', 'medium', 3),
    t('demo-t3', 'demo-s1', 'Matrix decompositions', 180, 'hard', 'high', 1),
    t('demo-t4', 'demo-s2', 'Reaction mechanisms', 240, 'hard', 'high', 2),
    t('demo-t5', 'demo-s2', 'Stereochemistry', 120, 'moderate', 'medium', 4),
    t('demo-t6', 'demo-s2', 'Spectroscopy basics', 90, 'easy', 'low', null),
    t('demo-t7', 'demo-s3', 'Market structures', 150, 'moderate', 'high', 3),
    t('demo-t8', 'demo-s3', 'Macroeconomic policy', 180, 'moderate', 'medium', 2),
  ];
  const plan = generatePlan({
    profile: d.profile,
    availability: d.availability,
    commitments: d.commitments,
    subjects: d.subjects,
    topics: d.topics,
    existingSessions: [],
    now,
    makeId,
  });
  d.sessions = plan.sessions;
  d.conflicts = plan.conflicts;
  return d;
}
