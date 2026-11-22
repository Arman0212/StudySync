/**
 * Rescheduling of missed sessions (pure, deterministic).
 *
 * A rescheduled session keeps its identity (same id, topic, subject and duration),
 * moves to the next valid free slot before its exam, and records where it came from,
 * why it moved and how many times it has moved. It is never duplicated.
 * If no slot of the full duration exists before the exam, the result is a conflict
 * with choices instead of pushing work past the exam.
 */
import type { Availability, Commitment, LocalNow, Profile, StudySession, Subject } from '../domain/types';
import { MIN_SESSION_MINUTES } from '../domain/types';
import { DayLedger, examDeadline, type Placement } from './capacity';

export interface RescheduleContext {
  profile: Pick<Profile, 'planStart'>;
  availability: Availability;
  commitments: Commitment[];
  subjects: Subject[];
  sessions: StudySession[];
  now: LocalNow;
  /** ISO timestamp stored in history (supplied by the caller, never read here). */
  timestamp: string;
}

export type RescheduleChoice = 'shorten' | 'keep_missed' | 'delete';

export type RescheduleOutcome =
  | { kind: 'moved'; session: StudySession; from: Placement; to: Placement }
  | {
      kind: 'conflict';
      session: StudySession;
      reason: string;
      /** A shorter placement that does fit before the exam, if any. */
      shorterOption: Placement | null;
      choices: RescheduleChoice[];
    };

function ledgerFor(ctx: RescheduleContext, excludeIds: Set<string>): DayLedger {
  return new DayLedger({
    availability: ctx.availability,
    commitments: ctx.commitments,
    sessions: ctx.sessions.filter((s) => !excludeIds.has(s.id)),
    now: ctx.now,
    planStart: ctx.profile.planStart,
  });
}

function moved(s: StudySession, to: Placement, reason: string, timestamp: string): StudySession {
  return {
    ...s,
    date: to.date,
    start: to.start,
    duration: to.duration,
    status: 'rescheduled',
    rescheduleCount: s.rescheduleCount + 1,
    history: [...s.history, { fromDate: s.date, fromStart: s.start, toDate: to.date, toStart: to.start, reason, at: timestamp }],
  };
}

function planOne(s: StudySession, ledger: DayLedger, ctx: RescheduleContext, reason: string): RescheduleOutcome {
  const subject = ctx.subjects.find((x) => x.id === s.subjectId);
  if (!subject) {
    return { kind: 'conflict', session: s, reason: 'This session’s subject no longer exists.', shorterOption: null, choices: ['delete'] };
  }
  const deadline = examDeadline(subject);
  const p = ledger.findSlot(s.duration, s.duration, deadline);
  if (p) {
    ledger.add(p);
    return { kind: 'moved', session: moved(s, p, reason, ctx.timestamp), from: { date: s.date, start: s.start, duration: s.duration }, to: p };
  }
  const shorter = ledger.findSlot(s.duration, Math.min(s.duration, MIN_SESSION_MINUTES), deadline);
  return {
    kind: 'conflict',
    session: s,
    reason: `No free ${s.duration}-minute slot is left before the ${subject.name} exam.`,
    shorterOption: shorter,
    choices: shorter ? ['shorten', 'keep_missed', 'delete'] : ['keep_missed', 'delete'],
  };
}

/** Plan the move for one session (does not mutate anything). */
export function rescheduleSession(sessionId: string, ctx: RescheduleContext, reason = 'Missed session'): RescheduleOutcome | null {
  const s = ctx.sessions.find((x) => x.id === sessionId);
  if (!s) return null;
  return planOne(s, ledgerFor(ctx, new Set([s.id])), ctx, reason);
}

/** Apply a "shorten" choice from a conflict outcome. */
export function applyShorter(outcome: Extract<RescheduleOutcome, { kind: 'conflict' }>, ctx: RescheduleContext): StudySession | null {
  if (!outcome.shorterOption) return null;
  return moved(outcome.session, outcome.shorterOption, 'Missed session (shortened to fit before exam)', ctx.timestamp);
}

/**
 * Preview a bulk reschedule of every missed (unlocked) session. Sessions are placed one
 * after another in time order so they never collide with each other.
 */
export function previewBulkReschedule(ctx: RescheduleContext): RescheduleOutcome[] {
  const missed = ctx.sessions
    .filter((s) => s.status === 'missed' && !s.locked)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start));
  const ledger = ledgerFor(ctx, new Set(missed.map((s) => s.id)));
  return missed.map((s) => planOne(s, ledger, ctx, 'Missed session (bulk reschedule)'));
}

/** Replace sessions by id with their moved versions. Never adds or duplicates sessions. */
export function applyOutcomes(sessions: StudySession[], outcomes: RescheduleOutcome[]): StudySession[] {
  const updates = new Map<string, StudySession>();
  for (const o of outcomes) if (o.kind === 'moved') updates.set(o.session.id, o.session);
  return sessions.map((s) => updates.get(s.id) ?? s);
}
