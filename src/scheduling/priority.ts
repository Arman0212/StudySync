/**
 * Topic priority — a transparent HEURISTIC, not a validated model.
 *
 *   priority = 3 × importance + 2 × difficulty + confidenceGap
 *
 *   importance:    low = 1, medium = 2, high = 3
 *   difficulty:    easy = 1, moderate = 2, hard = 3
 *   confidenceGap: no rating = 0; otherwise max(0, 3 − confidence)
 *                  (confidence 1 → +2, 2 → +1, 3..5 → 0)
 *
 * Range: 5 (low, easy) to 17 (high, hard, confidence 1).
 * Higher priority topics are scheduled earlier within their subject. Subjects
 * themselves are ordered by exam date/time first (earliest exam first); the
 * subject's "high" priority flag only breaks ties between exams at the same time.
 */
import type { Difficulty, ISODate, Importance, Subject, Topic } from '../domain/types';
import { diffDays } from '../domain/dates';

export const IMPORTANCE_WEIGHT: Record<Importance, number> = { low: 1, medium: 2, high: 3 };
export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { easy: 1, moderate: 2, hard: 3 };

export function confidenceGap(confidence: number | null | undefined): number {
  if (confidence == null) return 0;
  return Math.max(0, 3 - confidence);
}

export function topicPriority(topic: Pick<Topic, 'importance' | 'difficulty' | 'confidence'>): number {
  return 3 * IMPORTANCE_WEIGHT[topic.importance] + 2 * DIFFICULTY_WEIGHT[topic.difficulty] + confidenceGap(topic.confidence);
}

/** Highest priority first; ties keep the order the student entered topics in. */
export function sortTopicsByPriority<T extends Topic>(topics: T[]): T[] {
  return [...topics].sort((a, b) => topicPriority(b) - topicPriority(a) || a.order - b.order || a.id.localeCompare(b.id));
}

/** Minutes-of-epoch-like key for an exam moment, used to order subjects. */
export function examKey(subject: Pick<Subject, 'examDate' | 'examStart'>): string {
  const start = subject.examStart ?? 0;
  return `${subject.examDate}T${String(start).padStart(4, '0')}`;
}

/** Earliest exam first; same moment → high priority first → name. */
export function compareSubjects(a: Subject, b: Subject): number {
  const ka = examKey(a);
  const kb = examKey(b);
  if (ka !== kb) return ka < kb ? -1 : 1;
  if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/** Exams closer than this many days get an urgency bonus. */
export const URGENCY_WINDOW_DAYS = 14;

/**
 * Score used to pick which subject gets a free slot on a given day (interleaved pass).
 * Also a transparent HEURISTIC:
 *
 *   score = topicPriority(next topic)                    5..17  (importance, difficulty, confidence)
 *         + urgency  = max(0, 14 − days until the exam)  0..14
 *         + 2 if the subject is marked high priority
 *         + overdue  = 3 × missed sessions of the topic (capped at 3 sessions → +9)
 *
 * The score only decides the ORDER among eligible subjects. Whether a subject is
 * eligible at all is decided by the capacity reservation in scheduler.ts, which protects
 * earlier exams regardless of score.
 */
export function sessionScore(topic: Pick<Topic, 'importance' | 'difficulty' | 'confidence'>, subject: Pick<Subject, 'examDate' | 'priority'>, date: ISODate, missedCount: number): number {
  const urgency = Math.max(0, URGENCY_WINDOW_DAYS - diffDays(date, subject.examDate));
  return topicPriority(topic) + urgency + (subject.priority === 'high' ? 2 : 0) + 3 * Math.min(3, Math.max(0, missedCount));
}
