/**
 * Checks for a manually edited session placement (pure). Returns friendly messages;
 * an empty list means the placement is valid.
 */
import { compareDates, formatDuration, weekdayOf } from '../domain/dates';
import type { Availability, Commitment, StudySession, Subject } from '../domain/types';
import { commitmentsOn, examDeadline, occupiesTime } from './capacity';

export function placementProblems(
  draft: Pick<StudySession, 'id' | 'subjectId' | 'date' | 'start' | 'duration'>,
  ctx: { availability: Availability; commitments: Commitment[]; subjects: Subject[]; sessions: StudySession[] },
): string[] {
  const out: string[] = [];
  const av = ctx.availability;
  const end = draft.start + draft.duration;
  if (!av.studyDays.includes(weekdayOf(draft.date))) out.push('That day is not one of your study days.');
  if (draft.start < av.dayStart || end > av.dayEnd) out.push('The session is outside your daily study hours.');
  for (const c of commitmentsOn(ctx.commitments, draft.date)) {
    if (draft.start < c.end && c.start < end) {
      out.push('It overlaps one of your commitments.');
      break;
    }
  }
  const sameDay = ctx.sessions.filter((s) => s.id !== draft.id && s.date === draft.date && occupiesTime(s));
  if (sameDay.some((s) => draft.start < s.start + s.duration && s.start < end)) out.push('It overlaps another study session.');
  const total = sameDay.reduce((t, s) => t + s.duration, 0) + draft.duration;
  if (total > av.dailyMaxMinutes) out.push(`That day would have ${formatDuration(total)} of study, above your daily maximum of ${formatDuration(av.dailyMaxMinutes)}.`);
  const subject = ctx.subjects.find((s) => s.id === draft.subjectId);
  if (subject) {
    const dl = examDeadline(subject);
    const c = compareDates(draft.date, dl.date);
    if (c > 0 || (c === 0 && end > dl.minutes)) out.push(`It would end after the ${subject.name} exam starts.`);
  }
  return out;
}
