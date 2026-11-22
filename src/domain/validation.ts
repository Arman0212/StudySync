/**
 * Form validation. Each validator returns a map of field → message (empty = valid).
 * Warnings (like an exam before the plan start) are returned separately because the
 * student may confirm them.
 */
import { compareDates, isValidDate, isValidTimeZone } from './dates';
import type { Availability, Commitment, Profile, Subject, Topic } from './types';
import { SESSION_LENGTH_MAX, SESSION_LENGTH_MIN } from './types';

export type Errors = Record<string, string>;

export function hasErrors(e: Errors): boolean {
  return Object.keys(e).length > 0;
}

const isPosInt = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function validateProfile(p: Profile): Errors {
  const e: Errors = {};
  if (p.displayName.length > 60) e.displayName = 'Please keep your name under 60 characters.';
  if (p.institution.length > 100) e.institution = 'Please keep this under 100 characters.';
  if (!isValidTimeZone(p.timezone)) e.timezone = 'Choose a valid timezone.';
  if (!isValidDate(p.planStart)) e.planStart = 'Choose the date your plan starts.';
  return e;
}

export function validateAvailability(a: Availability): Errors {
  const e: Errors = {};
  if (a.studyDays.length === 0) e.studyDays = 'Pick at least one study day.';
  if (!Number.isFinite(a.dayStart)) e.dayStart = 'Enter a start time.';
  if (!Number.isFinite(a.dayEnd)) e.dayEnd = 'Enter an end time.';
  else if (Number.isFinite(a.dayStart) && a.dayEnd <= a.dayStart) e.dayEnd = 'End time must be after the start time.';
  if (!isPosInt(a.dailyMaxMinutes)) e.dailyMaxMinutes = 'Daily maximum must be more than 0 minutes.';
  else if (Number.isFinite(a.dayStart) && Number.isFinite(a.dayEnd) && a.dayEnd > a.dayStart && a.dailyMaxMinutes > a.dayEnd - a.dayStart) {
    e.dailyMaxMinutes = 'Daily maximum can’t be longer than your study window.';
  }
  if (!Number.isFinite(a.sessionLength) || a.sessionLength < SESSION_LENGTH_MIN || a.sessionLength > SESSION_LENGTH_MAX) {
    e.sessionLength = `Session length must be between ${SESSION_LENGTH_MIN} and ${SESSION_LENGTH_MAX} minutes.`;
  }
  if (!Number.isFinite(a.shortBreak) || a.shortBreak < 0 || a.shortBreak > 60) e.shortBreak = 'Short break must be 0–60 minutes.';
  if (!Number.isFinite(a.longBreak) || a.longBreak < 0 || a.longBreak > 180) e.longBreak = 'Long break must be 0–180 minutes.';
  else if (Number.isFinite(a.shortBreak) && a.longBreak < a.shortBreak) e.longBreak = 'Long break should be at least as long as the short break.';
  if (!Number.isInteger(a.sessionsBeforeLongBreak) || a.sessionsBeforeLongBreak < 1 || a.sessionsBeforeLongBreak > 10) {
    e.sessionsBeforeLongBreak = 'Choose between 1 and 10 sessions.';
  }
  return e;
}

export function validateCommitment(c: Commitment): Errors {
  const e: Errors = {};
  if (!c.label.trim()) e.label = 'Give this commitment a name, e.g. “Lecture”.';
  if (c.repeat === 'once' && !isValidDate(c.date)) e.date = 'Choose a date.';
  if (c.repeat === 'weekly' && (!c.weekdays || c.weekdays.length === 0)) e.weekdays = 'Pick at least one weekday.';
  if (!Number.isFinite(c.start)) e.start = 'Enter a start time.';
  if (!Number.isFinite(c.end)) e.end = 'Enter an end time.';
  else if (Number.isFinite(c.start) && c.end <= c.start) e.end = 'End time must be after the start time.';
  return e;
}

export function validateSubject(s: Subject, existing: Subject[] = []): Errors {
  const e: Errors = {};
  const name = s.name.trim();
  if (!name) e.name = 'Subject name is required.';
  else if (existing.some((x) => x.id !== s.id && x.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'You already have a subject with this name.';
  if (!isValidDate(s.examDate)) e.examDate = 'Choose the exam date.';
  if (s.examStart != null && (!Number.isFinite(s.examStart) || s.examStart < 0 || s.examStart >= 1440)) e.examStart = 'Enter a valid time.';
  return e;
}

/** Non-blocking warnings the student must confirm. */
export function subjectWarnings(s: Subject, planStart: string | undefined): string[] {
  const w: string[] = [];
  if (planStart && isValidDate(s.examDate) && isValidDate(planStart) && compareDates(s.examDate, planStart) < 0) {
    w.push('This exam date is before your plan start, so no study sessions can be scheduled for it.');
  }
  return w;
}

export function validateTopic(t: Topic): Errors {
  const e: Errors = {};
  if (!t.title.trim()) e.title = 'Topic title is required.';
  if (!Number.isFinite(t.estimatedMinutes) || t.estimatedMinutes <= 0) e.estimatedMinutes = 'Estimated time must be more than 0 minutes.';
  else if (t.estimatedMinutes > 100 * 60) e.estimatedMinutes = 'That’s over 100 hours — try splitting it into smaller topics.';
  if (t.confidence != null && (!Number.isInteger(t.confidence) || t.confidence < 1 || t.confidence > 5)) e.confidence = 'Confidence is 1 to 5.';
  if (t.notes.length > 1000) e.notes = 'Notes are limited to 1000 characters.';
  return e;
}

export function validateSessionEdit(p: { start: number; duration: number }, av: Availability): Errors {
  const e: Errors = {};
  if (!Number.isFinite(p.start)) e.start = 'Enter a start time.';
  if (!Number.isFinite(p.duration) || p.duration <= 0) e.duration = 'Duration must be more than 0 minutes.';
  else if (Number.isFinite(p.start) && p.start + p.duration > 24 * 60) e.duration = 'The session must end by midnight.';
  else if (p.duration > av.dailyMaxMinutes) e.duration = 'Longer than your daily maximum.';
  return e;
}
