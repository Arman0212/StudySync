/**
 * Day-level capacity bookkeeping used by the scheduler and rescheduler.
 *
 * Pure module: it receives everything (including "now") as input.
 *
 * Rules enforced when placing a session on a day:
 *  1. The day is one of the student's study days.
 *  2. The session lies inside [dayStart, dayEnd] and starts no earlier than "now" on today.
 *  3. It does not overlap any commitment that applies on that day.
 *  4. It does not overlap another session, and keeps at least `shortBreak` minutes from
 *     neighbouring sessions.
 *  5. No more than `sessionsBeforeLongBreak` sessions are chained together with gaps
 *     shorter than `longBreak` (i.e. a long break is inserted after every N sessions).
 *  6. The day's total session minutes do not exceed `dailyMaxMinutes`.
 *  7. The session ends no later than the exam starts (exam day without a start time is
 *     treated as fully unavailable for that subject).
 */
import { addDays, compareDates, dateRange, weekdayOf } from '../domain/dates';
import type { Availability, Commitment, ISODate, LocalNow, Minutes, StudySession, Subject } from '../domain/types';
import { MIN_SESSION_MINUTES } from '../domain/types';

export interface Interval {
  start: Minutes;
  end: Minutes;
}

export interface Placement {
  date: ISODate;
  start: Minutes;
  duration: Minutes;
}

/** Sessions that occupy time. Missed sessions are history only and free their slot. */
export function occupiesTime(s: Pick<StudySession, 'status'>): boolean {
  return s.status !== 'missed';
}

export function commitmentAppliesOn(c: Commitment, date: ISODate): boolean {
  if (c.repeat === 'once') return c.date === date;
  return (c.weekdays ?? []).includes(weekdayOf(date));
}

/** Commitment intervals on a date, sorted and merged (overlapping ones combined). */
export function commitmentsOn(commitments: Commitment[], date: ISODate): Interval[] {
  const list = commitments
    .filter((c) => commitmentAppliesOn(c, date) && c.end > c.start)
    .map((c) => ({ start: c.start, end: c.end }))
    .sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const iv of list) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else merged.push({ ...iv });
  }
  return merged;
}

export function ceilTo5(m: number): number {
  return Math.ceil(m / 5) * 5;
}

/** Last date + minute a subject's sessions may end at. */
export function examDeadline(subject: Pick<Subject, 'examDate' | 'examStart'>): { date: ISODate; minutes: Minutes } {
  if (subject.examStart == null) return { date: subject.examDate, minutes: 0 };
  return { date: subject.examDate, minutes: subject.examStart };
}

/** Number of break-rule violations for a day's sorted sessions (see rules 4 and 5). */
export function breakViolations(sorted: Interval[], av: Availability): number {
  let violations = 0;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]!.start - sorted[i - 1]!.end;
    if (gap < av.shortBreak) violations++;
    if (gap < av.longBreak) {
      run++;
      if (run > av.sessionsBeforeLongBreak) violations++;
    } else {
      run = 1;
    }
  }
  return violations;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export interface LedgerInput {
  availability: Availability;
  commitments: Commitment[];
  /** Sessions already fixed in the calendar (they block time and use daily budget). */
  sessions: Pick<StudySession, 'id' | 'date' | 'start' | 'duration' | 'status'>[];
  now: LocalNow;
  /** First date the plan may use (the plan start). */
  planStart: ISODate;
}

/**
 * Mutable ledger of occupied time per day. The scheduler adds sessions to it as it
 * places them, so later placements see earlier ones.
 */
export class DayLedger {
  private readonly av: Availability;
  private readonly commitments: Commitment[];
  private readonly sessionsByDay = new Map<ISODate, Interval[]>();
  private readonly commitmentCache = new Map<ISODate, Interval[]>();
  readonly now: LocalNow;
  readonly firstDate: ISODate;

  constructor(input: LedgerInput) {
    this.av = input.availability;
    this.commitments = input.commitments;
    this.now = input.now;
    this.firstDate = compareDates(input.planStart, input.now.date) > 0 ? input.planStart : input.now.date;
    for (const s of input.sessions) if (occupiesTime(s)) this.add(s);
  }

  add(p: Pick<Placement, 'date' | 'start' | 'duration'>): void {
    const list = this.sessionsByDay.get(p.date) ?? [];
    list.push({ start: p.start, end: p.start + p.duration });
    list.sort((a, b) => a.start - b.start);
    this.sessionsByDay.set(p.date, list);
  }

  remove(p: Pick<Placement, 'date' | 'start' | 'duration'>): void {
    const list = this.sessionsByDay.get(p.date);
    if (!list) return;
    const i = list.findIndex((x) => x.start === p.start && x.end === p.start + p.duration);
    if (i >= 0) list.splice(i, 1);
  }

  sessionsOn(date: ISODate): Interval[] {
    return this.sessionsByDay.get(date) ?? [];
  }

  usedMinutes(date: ISODate): Minutes {
    return this.sessionsOn(date).reduce((t, s) => t + (s.end - s.start), 0);
  }

  private blocksOn(date: ISODate): Interval[] {
    let c = this.commitmentCache.get(date);
    if (!c) {
      c = commitmentsOn(this.commitments, date);
      this.commitmentCache.set(date, c);
    }
    return c;
  }

  isStudyDay(date: ISODate): boolean {
    return this.av.studyDays.includes(weekdayOf(date));
  }

  /** Usable [start, end) window for a date given "now" and an optional deadline that day. */
  private windowOn(date: ISODate, deadline?: { date: ISODate; minutes: Minutes }): Interval | null {
    if (!this.isStudyDay(date)) return null;
    if (compareDates(date, this.firstDate) < 0) return null;
    let start = this.av.dayStart;
    let end = this.av.dayEnd;
    if (date === this.now.date) start = Math.max(start, ceilTo5(this.now.minutes));
    if (deadline) {
      const c = compareDates(date, deadline.date);
      if (c > 0) return null;
      if (c === 0) end = Math.min(end, deadline.minutes);
    }
    return end > start ? { start, end } : null;
  }

  /**
   * Try to place a session on `date`. Returns the earliest valid placement whose
   * duration is between `minLen` and `wanted` (as long as possible), or null.
   */
  placeOnDay(date: ISODate, wanted: Minutes, minLen: Minutes, deadline?: { date: ISODate; minutes: Minutes }): Placement | null {
    const win = this.windowOn(date, deadline);
    if (!win) return null;
    const budget = this.av.dailyMaxMinutes - this.usedMinutes(date);
    if (budget < minLen) return null;
    const blocks = this.blocksOn(date);
    const sessions = this.sessionsOn(date);
    const sb = this.av.shortBreak;

    // Candidate start times: window start and the ends of anything that blocks time
    // (plus the short/long break after a session). Earliest valid candidate wins.
    const cands = new Set<number>([win.start]);
    for (const b of blocks) cands.add(ceilTo5(b.end));
    for (const s of sessions) {
      cands.add(ceilTo5(s.end + sb));
      cands.add(ceilTo5(s.end + this.av.longBreak));
    }
    const sorted = [...cands].filter((c) => c >= win.start && c < win.end).sort((a, b) => a - b);

    for (const c of sorted) {
      if (blocks.some((b) => b.start <= c && c < b.end)) continue;
      if (sessions.some((s) => s.start - sb < c + minLen && c < s.end + sb)) continue;
      let maxEnd = win.end;
      for (const b of blocks) if (b.start >= c) maxEnd = Math.min(maxEnd, b.start);
      for (const s of sessions) if (s.start >= c) maxEnd = Math.min(maxEnd, s.start - sb);
      const len = Math.min(wanted, budget, maxEnd - c);
      if (len < minLen) continue;
      const cand: Interval = { start: c, end: c + len };
      if (blocks.some((b) => overlaps(b, cand)) || sessions.some((s) => overlaps(s, cand))) continue;
      const before = breakViolations(sessions, this.av);
      const after = breakViolations([...sessions, cand].sort((a, b) => a.start - b.start), this.av);
      if (after > before) continue;
      return { date, start: c, duration: len };
    }
    return null;
  }

  /** Earliest placement from `fromDate` up to the deadline (inclusive of the deadline day). */
  findSlot(wanted: Minutes, minLen: Minutes, deadline: { date: ISODate; minutes: Minutes }, fromDate?: ISODate): Placement | null {
    let date = fromDate && compareDates(fromDate, this.firstDate) > 0 ? fromDate : this.firstDate;
    while (compareDates(date, deadline.date) <= 0) {
      const p = this.placeOnDay(date, wanted, minLen, deadline);
      if (p) return p;
      date = addDays(date, 1);
    }
    return null;
  }

  /**
   * Raw study capacity before a deadline, ignoring all sessions: per study day, the
   * window minus commitments, capped at the daily maximum.
   */
  rawCapacityBefore(deadline: { date: ISODate; minutes: Minutes }): Minutes {
    if (compareDates(deadline.date, this.firstDate) < 0) return 0;
    let total = 0;
    for (const date of dateRange(this.firstDate, deadline.date)) {
      const win = this.windowOn(date, deadline);
      if (!win) continue;
      let free = win.end - win.start;
      for (const b of this.blocksOn(date)) {
        const s = Math.max(b.start, win.start);
        const e = Math.min(b.end, win.end);
        if (e > s) free -= e - s;
      }
      total += Math.max(0, Math.min(free, this.av.dailyMaxMinutes));
    }
    return total;
  }

  hasStudyDayBefore(deadline: { date: ISODate; minutes: Minutes }): boolean {
    if (compareDates(deadline.date, this.firstDate) < 0) return false;
    return dateRange(this.firstDate, deadline.date).some((d) => this.windowOn(d, deadline) !== null);
  }
}

export { MIN_SESSION_MINUTES };
