/**
 * Plan invariant checker. Used by property-based tests and as a runtime self-check.
 * Returns a list of human-readable violations (empty = valid).
 */
import { compareDates, weekdayOf } from '../domain/dates';
import type { Availability, Commitment, StudySession, Subject, Topic } from '../domain/types';
import { commitmentsOn, examDeadline, occupiesTime } from './capacity';

export function checkPlan(
  sessions: StudySession[],
  ctx: { availability: Availability; commitments: Commitment[]; subjects: Subject[]; topics: Topic[] },
  opts: { onlyIds?: Set<string> } = {},
): string[] {
  const errors: string[] = [];
  const av = ctx.availability;
  const topicById = new Map(ctx.topics.map((t) => [t.id, t]));
  const subjectById = new Map(ctx.subjects.map((s) => [s.id, s]));
  const active = sessions.filter(occupiesTime);
  const check = (s: StudySession) => !opts.onlyIds || opts.onlyIds.has(s.id);

  const ids = new Set<string>();
  for (const s of sessions) {
    if (ids.has(s.id)) errors.push(`duplicate id ${s.id}`);
    ids.add(s.id);
  }

  const byDay = new Map<string, StudySession[]>();
  for (const s of active) {
    const l = byDay.get(s.date) ?? [];
    l.push(s);
    byDay.set(s.date, l);
  }
  for (const [date, list] of byDay) {
    list.sort((a, b) => a.start - b.start);
    for (let i = 1; i < list.length; i++) {
      if (list[i]!.start < list[i - 1]!.start + list[i - 1]!.duration) errors.push(`overlap on ${date}: ${list[i - 1]!.id} / ${list[i]!.id}`);
    }
    const total = list.reduce((t, s) => t + s.duration, 0);
    if (total > av.dailyMaxMinutes && list.some(check)) errors.push(`daily max exceeded on ${date}: ${total}`);
  }

  for (const s of active) {
    if (!check(s)) continue;
    const end = s.start + s.duration;
    if (!av.studyDays.includes(weekdayOf(s.date))) errors.push(`${s.id} on non-study day ${s.date}`);
    if (s.start < av.dayStart || end > av.dayEnd) errors.push(`${s.id} outside window`);
    for (const c of commitmentsOn(ctx.commitments, s.date)) {
      if (s.start < c.end && c.start < end) errors.push(`${s.id} overlaps commitment on ${s.date}`);
    }
    const topic = topicById.get(s.topicId);
    if (!topic) errors.push(`${s.id} has unknown topic ${s.topicId}`);
    const subject = subjectById.get(s.subjectId);
    if (!subject) errors.push(`${s.id} has unknown subject`);
    else {
      if (topic && topic.subjectId !== subject.id) errors.push(`${s.id} topic/subject mismatch`);
      const dl = examDeadline(subject);
      const c = compareDates(s.date, dl.date);
      if (c > 0 || (c === 0 && end > dl.minutes)) errors.push(`${s.id} ends after exam`);
    }
    if (s.duration <= 0) errors.push(`${s.id} non-positive duration`);
  }
  return errors;
}
