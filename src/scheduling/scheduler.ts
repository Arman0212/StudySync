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
 * 3. BASELINE / FEASIBILITY PASS — Earliest-Deadline-First (`generateEdfPlan`).
 *    Exams are processed earliest first and their work is put into the earliest free
 *    slots before the exam. Every slot an earlier exam can use is also usable by a later
 *    exam, but not vice versa, so EDF never lets a later exam take a slot an earlier exam
 *    needed (exchange argument). The minutes EDF manages to schedule per subject are the
 *    feasibility benchmark; whatever EDF cannot place is what the capacity really lacks.
 * 4. INTERLEAVED PASS (`generatePlan`). Days are filled in date order. For every free
 *    slot, all subjects with work left (and whose exam is still ahead) are candidates,
 *    ranked by `sessionScore` (topic priority + exam urgency + high-priority flag +
 *    overdue/missed work; see priority.ts). A candidate is only accepted if
 *      a) the slot is valid (study day, window, commitments, breaks, daily max, exam), and
 *      b) the CAPACITY RESERVATION for every earlier exam still holds: for each exam k
 *         that is earlier than the candidate's exam,
 *             margin × (EDF-feasible work still to place for exams ≤ k)
 *               ≤ usable free minutes from this day up to exam k (after the placement),
 *      c) it would not make three sessions of the same subject in a row that day —
 *         unless no other subject is eligible for the slot.
 *    Work left over after the day loop is placed by the same EDF routine.
 * 5. VERIFICATION. The interleaved result is accepted only if every subject has no more
 *    unscheduled (conflict) minutes than the EDF baseline. Otherwise the pass is retried
 *    with a stricter reservation margin, and finally the plain EDF plan is used. So the
 *    interleaving can never make a feasible plan infeasible or starve an earlier exam.
 * 6. Within a subject, topics are ordered by `topicPriority`; each topic first gets one
 *    session in priority order (every topic gets time), then the rest in priority order.
 * 7. Sessions are no longer than the preferred length; remainders are split evenly
 *    (60 min with a 50 min preference → 2 × 30). A session may be shortened to fit a
 *    gap but never below MIN_SESSION_MINUTES unless the topic remainder is smaller.
 * 8. Anything that cannot be placed becomes a CapacityConflict — never dropped
 *    silently. Invariant: scheduled + conflicted = required, per topic.
 */
import type {
  Availability, CapacityConflict, Commitment, ISODate, LocalNow, Profile, StudySession, Subject, Topic,
} from '../domain/types';
import { MIN_SESSION_MINUTES } from '../domain/types';
import { addDays, compareDates } from '../domain/dates';
import { DayLedger, ceilTo5, examDeadline, occupiesTime, type Placement } from './capacity';
import { compareSubjects, examKey, sessionScore, sortTopicsByPriority } from './priority';

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

export type PlanStrategy = 'interleaved' | 'earliest-deadline';

export interface PlanResult {
  /** Full new session list (preserved + newly planned), sorted by time. */
  sessions: StudySession[];
  conflicts: CapacityConflict[];
  /** Which pass produced the plan (informational). */
  strategy?: PlanStrategy;
}

/** Reservation margins tried in order before falling back to plain EDF. */
export const RESERVATION_MARGINS = [1.1, 1.5, 2.5] as const;

/** Max sessions of one subject in a row on a day, unless nothing else is eligible. */
export const MAX_CONSECUTIVE_SAME_SUBJECT = 2;

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

/** A subject's work queue: phase 1 gives each topic one turn, phase 2 goes topic by topic. */
interface SubjectState {
  subject: Subject;
  deadline: { date: ISODate; minutes: number };
  queue: TopicWork[];
  phase1: number;
  /** EDF-feasible minutes still to place (used for capacity reservation). */
  target: number;
}

function peek(st: SubjectState): TopicWork | null {
  while (st.phase1 < st.queue.length) {
    const w = st.queue[st.phase1]!;
    if (w.remaining > 0 && !w.failed) return w;
    st.phase1++;
  }
  return st.queue.find((w) => w.remaining > 0 && !w.failed) ?? null;
}

function consumed(st: SubjectState, w: TopicWork): void {
  if (st.phase1 < st.queue.length && st.queue[st.phase1] === w) st.phase1++;
}

interface Attempt {
  result: PlanResult;
  conflictBySubject: Map<string, number>;
}

/** Plain Earliest-Deadline-First plan (baseline, feasibility benchmark and fallback). */
export function generateEdfPlan(input: PlanInput): PlanResult {
  return runAttempt(input, null, new Map()).result;
}

/**
 * Interleaved plan with a feasibility guarantee relative to EDF (see header). This is
 * what the app uses.
 */
export function generatePlan(input: PlanInput): PlanResult {
  // Attempts use temporary ids; only the accepted plan draws ids from the real factory.
  const temp = (): PlanInput => {
    let n = 0;
    return { ...input, makeId: () => `${TMP}${++n}` };
  };
  const baseline = runAttempt(temp(), null, new Map());
  const baseConflict = baseline.conflictBySubject;
  const preserved = input.existingSessions.filter(isPreserved);
  const subjectsWithWork = new Set(input.topics.filter((t) => requiredMinutes(t, preserved) > 0).map((t) => t.subjectId));
  if (subjectsWithWork.size > 1) {
    for (const margin of RESERVATION_MARGINS) {
      const attempt = runAttempt(temp(), margin, baseConflict);
      const noWorse = [...attempt.conflictBySubject].every(([sid, mins]) => mins <= (baseConflict.get(sid) ?? 0));
      if (noWorse) return relabel(attempt.result, input.makeId, 'interleaved');
    }
  }
  return relabel(baseline.result, input.makeId, 'earliest-deadline');
}

const TMP = '__tmp_';

/** Replace temporary ids with ids from the caller's factory. */
function relabel(r: PlanResult, makeId: () => string, strategy: PlanStrategy): PlanResult {
  const sessions = r.sessions.map((s) => (s.id.startsWith(TMP) ? { ...s, id: makeId() } : s));
  return { sessions: sortSessions(sessions), conflicts: r.conflicts, strategy };
}

/**
 * One planning attempt. margin === null → pure EDF. Otherwise the interleaved day loop
 * runs first, using `baseConflict` to know how much of each subject is EDF-feasible.
 */
function runAttempt(input: PlanInput, margin: number | null, baseConflict: Map<string, number>): Attempt {
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
  // "Overdue" work: missed sessions per topic in the current plan.
  const missedByTopic = new Map<string, number>();
  for (const s of input.existingSessions) if (s.status === 'missed') missedByTopic.set(s.topicId, (missedByTopic.get(s.topicId) ?? 0) + 1);

  const ledger = new DayLedger({ availability: av, commitments: input.commitments, sessions: preserved, now, planStart: input.profile.planStart });
  const newSessions: StudySession[] = [];
  // Subject of every occupying session per day, for the "no 3 in a row" rule.
  const daySubjects = new Map<ISODate, { start: number; subjectId: string }[]>();
  const noteSubject = (date: ISODate, start: number, subjectId: string) => {
    const l = daySubjects.get(date) ?? [];
    l.push({ start, subjectId });
    l.sort((a, b) => a.start - b.start);
    daySubjects.set(date, l);
  };
  for (const s of preserved) if (occupiesTime(s)) noteSubject(s.date, s.start, s.subjectId);

  const subjects = [...input.subjects].sort(compareSubjects);
  const states: SubjectState[] = subjects.map((subject) => {
    const queue = sortTopicsByPriority(input.topics.filter((t) => t.subjectId === subject.id))
      .map((topic) => ({ topic, subject, remaining: requiredMinutes(topic, preserved), failed: false }))
      .filter((w) => w.remaining > 0);
    const total = queue.reduce((t, w) => t + w.remaining, 0);
    return { subject, deadline: examDeadline(subject), queue, phase1: 0, target: Math.max(0, total - (baseConflict.get(subject.id) ?? 0)) };
  });

  function record(st: SubjectState, w: TopicWork, p: Placement): void {
    ledger.add(p);
    noteSubject(p.date, p.start, st.subject.id);
    w.remaining -= p.duration;
    st.target = Math.max(0, st.target - p.duration);
    consumed(st, w);
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

  if (margin !== null) interleave(margin);

  // EDF pass (the whole algorithm when margin === null; otherwise it places leftovers).
  // Groups of same-moment exams are consumed round-robin.
  const groups: SubjectState[][] = [];
  for (const st of states) {
    const last = groups[groups.length - 1];
    if (last && examKey(last[0]!.subject) === examKey(st.subject)) last.push(st);
    else groups.push([st]);
  }
  for (const group of groups) {
    let active = true;
    while (active) {
      active = false;
      for (const st of group) {
        const w = peek(st);
        if (!w) continue;
        active = true;
        const wanted = nextChunk(w.remaining, av.sessionLength);
        const p = ledger.findSlot(wanted, Math.min(wanted, MIN_SESSION_MINUTES), st.deadline);
        if (p) record(st, w, p);
        else {
          // No gap of even the minimum length remains before this exam; the rest of the
          // topic becomes a conflict.
          w.failed = true;
          consumed(st, w);
        }
      }
    }
  }

  const conflicts: CapacityConflict[] = [];
  const conflictBySubject = new Map<string, number>();
  for (const st of states) {
    for (const w of st.queue) {
      if (w.remaining <= 0) continue;
      const deadline = st.deadline;
      const reason: CapacityConflict['reason'] =
        compareDates(deadline.date, ledger.firstDate) < 0 ||
        (deadline.date === ledger.firstDate && deadline.minutes <= (ledger.firstDate === now.date ? now.minutes : 0))
          ? 'exam_before_start'
          : !ledger.hasStudyDayBefore(deadline)
            ? 'no_study_days'
            : 'no_capacity';
      conflicts.push({ topicId: w.topic.id, subjectId: st.subject.id, neededMinutes: w.remaining, availableMinutes: ledger.rawCapacityBefore(deadline), reason });
      conflictBySubject.set(st.subject.id, (conflictBySubject.get(st.subject.id) ?? 0) + w.remaining);
    }
  }
  return { result: { sessions: sortSessions([...preserved, ...newSessions]), conflicts }, conflictBySubject };

  /** The interleaved day-by-day pass (step 4 of the header comment). */
  function interleave(m: number): void {
    const open = states.filter((st) => st.queue.length > 0 && compareDates(st.deadline.date, ledger.firstDate) >= 0);
    if (open.length === 0) return;
    const lastDate = open.reduce((d, st) => (compareDates(st.deadline.date, d) > 0 ? st.deadline.date : d), ledger.firstDate);

    for (let date = ledger.firstDate; compareDates(date, lastDate) <= 0; date = addDays(date, 1)) {
      if (!ledger.isStudyDay(date)) continue;
      for (;;) {
        const ranked = open
          .filter((st) => st.target > 0 && compareDates(date, st.deadline.date) <= 0)
          .map((st) => ({ st, w: peek(st) }))
          .filter((c): c is { st: SubjectState; w: TopicWork } => c.w !== null)
          .map((c) => ({ ...c, score: sessionScore(c.w.topic, c.st.subject, date, missedByTopic.get(c.w.topic.id) ?? 0) }))
          .sort((a, b) => b.score - a.score || compareSubjects(a.st.subject, b.st.subject));
        if (ranked.length === 0) break;

        let chosen: { st: SubjectState; w: TopicWork; p: Placement } | null = null;
        let thirdInRow: { st: SubjectState; w: TopicWork; p: Placement } | null = null;
        for (const c of ranked) {
          // Never place more than the EDF-feasible amount for this subject here; the
          // leftover pass tries to add more afterwards.
          const wanted = Math.min(nextChunk(c.w.remaining, av.sessionLength), Math.max(c.st.target, Math.min(c.w.remaining, MIN_SESSION_MINUTES)));
          const p = ledger.placeOnDay(date, wanted, Math.min(wanted, MIN_SESSION_MINUTES), c.st.deadline);
          if (!p) continue;
          ledger.add(p);
          const reserved = reservationHolds(c.st, date, m);
          ledger.remove(p);
          if (!reserved) continue;
          if (makesRunTooLong(date, p.start, c.st.subject.id)) {
            thirdInRow ??= { ...c, p };
            continue;
          }
          chosen = { ...c, p };
          break;
        }
        // Rule c) yields only when no other subject is eligible for this slot.
        const pick = chosen ?? thirdInRow;
        if (!pick) break;
        record(pick.st, pick.w, pick.p);
      }
    }
  }

  /**
   * Capacity reservation: placing work of `st` must leave enough usable time before every
   * EARLIER exam for that exam's (EDF-feasible) remaining work, times the margin.
   */
  function reservationHolds(st: SubjectState, date: ISODate, m: number): boolean {
    for (const other of states) {
      const dl = other.deadline;
      if (examKey(other.subject) >= examKey(st.subject)) continue; // only earlier exams
      if (compareDates(dl.date, date) < 0) continue; // already past
      const demand = states.filter((x) => examKey(x.subject) <= examKey(other.subject)).reduce((t, x) => t + x.target, 0);
      if (demand === 0) continue;
      let capacity = 0;
      for (let d = date; compareDates(d, dl.date) <= 0 && capacity < demand * m; d = addDays(d, 1)) capacity += ledger.usableMinutes(d, dl);
      if (demand * m > capacity) return false;
    }
    return true;
  }

  function makesRunTooLong(date: ISODate, start: number, subjectId: string): boolean {
    const seq = [...(daySubjects.get(date) ?? []), { start, subjectId }].sort((a, b) => a.start - b.start);
    const i = seq.findIndex((x) => x.start === start && x.subjectId === subjectId);
    const k = MAX_CONSECUTIVE_SAME_SUBJECT + 1;
    for (let from = Math.max(0, i - k + 1); from <= i; from++) {
      const window = seq.slice(from, from + k);
      if (window.length === k && window.every((x) => x.subjectId === subjectId)) return true;
    }
    return false;
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
