/**
 * StudySync timetable generator (pure, deterministic).
 *
 * Algorithm overview
 * ------------------
 * 1. Keep "preserved" sessions exactly as they are: completed, in-progress and locked
 *    sessions. They block their time slot and count towards their topic's coverage
 *    (missed sessions never count as covered and do not block time).
 * 2. Work out each topic's remaining requirement:
 *        required = topic completed ? 0 : max(0, estimate − minutes of preserved, non-missed sessions)
 * 3. Group subjects by exam moment and process the groups EARLIEST EXAM FIRST
 *    (Earliest-Deadline-First). Each group's work is placed into the earliest free
 *    slots before its exam. Because every slot an earlier exam can use is also usable by
 *    a later exam, but not vice versa, filling earliest deadlines first means a later
 *    exam can never take a slot an earlier exam needed (the classic exchange argument
 *    for EDF). Subjects whose exams start at the same moment are interleaved round-robin
 *    so neither starves the other.
 * 4. Within a subject, topics are ordered by `topicPriority` (see priority.ts). Each
 *    topic first gets one session in priority order (so every topic gets some time),
 *    then the rest of the work is placed topic by topic in priority order.
 * 5. Topics are split into sessions no longer than the preferred session length. The
 *    remaining time is split evenly (e.g. 60 min with a 50 min preference → 2 × 30 min)
 *    to avoid tiny tail sessions. A session may be shortened to fit a gap, but never
 *    below MIN_SESSION_MINUTES unless the topic's remainder itself is smaller.
 * 6. Anything that cannot be placed before the exam becomes a CapacityConflict — it is
 *    never dropped silently. Invariant: scheduled + conflicted = required, per topic.
 */
import type {
  Availability, CapacityConflict, Commitment, LocalNow, Profile, StudySession, Subject, Topic,
} from '../domain/types';
import { MIN_SESSION_MINUTES } from '../domain/types';
import { compareDates } from '../domain/dates';
import { DayLedger, ceilTo5, examDeadline, occupiesTime } from './capacity';
import { compareSubjects, examKey, sortTopicsByPriority } from './priority';

export interface PlanInput {
  profile: Pick<Profile, 'planStart'>;
  availability: Availability;
  commitments: Commitment[];
  subjects: Subject[];
  topics: Topic[];
  /** The current session list; preserved ones are kept, the rest may be replaced. */
  existingSessions: StudySession[];
  now: LocalNow;
  /** Id factory for brand new sessions. Must return unique ids. */
  makeId: () => string;
}

export interface PlanResult {
  /** Full new session list (preserved + newly planned), sorted by time. */
  sessions: StudySession[];
  conflicts: CapacityConflict[];
}

/** Sessions regeneration must never touch. */
export function isPreserved(s: StudySession): boolean {
  return s.locked || s.status === 'completed' || s.status === 'in_progress';
}

/** Minutes of a topic already covered by preserved sessions (missed never counts). */
export function coveredMinutes(topicId: string, preserved: StudySession[]): number {
  return preserved.filter((s) => s.topicId === topicId && occupiesTime(s)).reduce((t, s) => t + s.duration, 0);
}

export function requiredMinutes(topic: Topic, preserved: StudySession[]): number {
  if (topic.status === 'completed') return 0;
  return Math.max(0, topic.estimatedMinutes - coveredMinutes(topic.id, preserved));
}

/** Even split: the next chunk for a remainder given the preferred session length. */
export function nextChunk(remaining: number, sessionLength: number): number {
  if (remaining <= sessionLength) return remaining;
  const n = Math.ceil(remaining / sessionLength);
  return Math.min(remaining, sessionLength, ceilTo5(Math.ceil(remaining / n)));
}

export function sortSessions<T extends Pick<StudySession, 'date' | 'start' | 'id'>>(list: T[]): T[] {
  return [...list].sort((a, b) => compareDates(a.date, b.date) || a.start - b.start || a.id.localeCompare(b.id));
}

interface TopicWork {
  topic: Topic;
  subject: Subject;
  remaining: number;
  failed: boolean;
}

export function generatePlan(input: PlanInput): PlanResult {
  const { availability: av, now } = input;
  const topicIds = new Set(input.topics.map((t) => t.id));

  // Preserved sessions whose topic still exists. Sessions of deleted topics are dropped.
  const preserved = input.existingSessions.filter((s) => isPreserved(s) && topicIds.has(s.topicId));
  const replaceable = sortSessions(input.existingSessions.filter((s) => !isPreserved(s)));

  // Reuse ids of replaced sessions (per topic, in time order) so the plan diff can show
  // "moved" rather than "removed + added" for the same piece of work.
  const reusableIds = new Map<string, StudySession[]>();
  for (const s of replaceable) {
    const list = reusableIds.get(s.topicId) ?? [];
    list.push(s);
    reusableIds.set(s.topicId, list);
  }

  const ledger = new DayLedger({
    availability: av,
    commitments: input.commitments,
    sessions: preserved,
    now,
    planStart: input.profile.planStart,
  });

  const newSessions: StudySession[] = [];
  const conflicts: CapacityConflict[] = [];

  // Group subjects by exam moment (EDF). Same-moment subjects are interleaved.
  const subjects = [...input.subjects].sort(compareSubjects);
  const groups: Subject[][] = [];
  for (const s of subjects) {
    const last = groups[groups.length - 1];
    if (last && examKey(last[0]!) === examKey(s)) last.push(s);
    else groups.push([s]);
  }

  for (const group of groups) {
    // One work queue per subject; queues are consumed round-robin.
    const queues: TopicWork[][] = group.map((subject) =>
      sortTopicsByPriority(input.topics.filter((t) => t.subjectId === subject.id))
        .map((topic) => ({ topic, subject, remaining: requiredMinutes(topic, preserved), failed: false }))
        .filter((w) => w.remaining > 0),
    );

    // Build the order of "turns": first one turn per topic (priority order), then the
    // rest of each topic's work in priority order. Subjects alternate turn by turn.
    const streams = queues.map((q) => makeTurnStream(q, av.sessionLength));
    let active = true;
    while (active) {
      active = false;
      for (const stream of streams) {
        const work = stream.next();
        if (work.done) continue;
        active = true;
        placeChunk(work.value);
      }
    }

    for (const q of queues) {
      for (const w of q) {
        if (w.remaining > 0) {
          const deadline = examDeadline(w.subject);
          const reason: CapacityConflict['reason'] =
            compareDates(deadline.date, ledger.firstDate) < 0 ||
            (deadline.date === ledger.firstDate && deadline.minutes <= (ledger.firstDate === now.date ? now.minutes : 0))
              ? 'exam_before_start'
              : !ledger.hasStudyDayBefore(deadline)
                ? 'no_study_days'
                : 'no_capacity';
          conflicts.push({
            topicId: w.topic.id,
            subjectId: w.subject.id,
            neededMinutes: w.remaining,
            availableMinutes: ledger.rawCapacityBefore(deadline),
            reason,
          });
        }
      }
    }
  }

  function placeChunk(w: TopicWork): void {
    if (w.failed || w.remaining <= 0) return;
    const wanted = nextChunk(w.remaining, av.sessionLength);
    const minLen = Math.min(wanted, MIN_SESSION_MINUTES);
    const p = ledger.findSlot(wanted, minLen, examDeadline(w.subject));
    if (!p) {
      // No gap of even the minimum length remains before this exam; the rest of the
      // topic becomes a conflict.
      w.failed = true;
      return;
    }
    ledger.add(p);
    w.remaining -= p.duration;
    const reused = reusableIds.get(w.topic.id)?.shift();
    newSessions.push({
      id: reused?.id ?? input.makeId(),
      topicId: w.topic.id,
      subjectId: w.subject.id,
      date: p.date,
      start: p.start,
      duration: p.duration,
      status: 'planned',
      locked: false,
      actualMinutes: null,
      note: reused?.note ?? '',
      rescheduleCount: reused?.rescheduleCount ?? 0,
      history: reused?.history ?? [],
    });
  }

  return { sessions: sortSessions([...preserved, ...newSessions]), conflicts };
}

/**
 * Yields TopicWork items in turn order: one pass over all topics, then each topic until
 * its work is exhausted (or it failed to place).
 */
function* makeTurnStream(queue: TopicWork[], _sessionLength: number): Generator<TopicWork> {
  for (const w of queue) if (w.remaining > 0) yield w;
  for (const w of queue) {
    while (w.remaining > 0 && !w.failed) yield w;
  }
}

/** Suggestions shown next to a capacity conflict. */
export function conflictSuggestions(c: CapacityConflict): string[] {
  if (c.reason === 'exam_before_start') {
    return ['Check the exam date — it is before your plan start or already past.', 'Move the plan start earlier if you meant to begin sooner.'];
  }
  if (c.reason === 'no_study_days') {
    return ['Add a study day before this exam.', 'Widen your daily study hours.', 'Start the plan earlier.'];
  }
  return [
    'Study a little more each day (raise the daily maximum or widen your hours).',
    'Lower the time estimate if this topic needs less work than planned.',
    'Drop or shorten optional, low-importance topics.',
    'Start the plan earlier or add another study day.',
  ];
}
