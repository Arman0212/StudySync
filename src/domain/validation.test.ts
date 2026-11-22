import { describe, it, expect } from 'vitest';
import { subjectWarnings, validateAvailability, validateCommitment, validateProfile, validateSessionEdit, validateSubject, validateTopic, hasErrors } from './validation';
import { DEFAULT_AVAILABILITY } from './types';
import { subject, topic } from '../test/factories';

describe('validation', () => {
  it('profile', () => {
    expect(validateProfile({ displayName: '', institution: '', timezone: 'Asia/Kolkata', planStart: '2026-01-05' })).toEqual({});
    const e = validateProfile({ displayName: '', institution: '', timezone: 'Mars/Base', planStart: '2026-02-30' });
    expect(Object.keys(e).sort()).toEqual(['planStart', 'timezone']);
  });

  it('availability', () => {
    expect(validateAvailability(DEFAULT_AVAILABILITY)).toEqual({});
    const e = validateAvailability({ ...DEFAULT_AVAILABILITY, studyDays: [], dayStart: 600, dayEnd: 600, sessionLength: 10, dailyMaxMinutes: 0 });
    expect(e.studyDays).toBeDefined();
    expect(e.dayEnd).toBe('End time must be after the start time.');
    expect(e.sessionLength).toMatch(/between 25 and 120/);
    expect(e.dailyMaxMinutes).toMatch(/more than 0/);
    expect(validateAvailability({ ...DEFAULT_AVAILABILITY, dailyMaxMinutes: 24 * 60 }).dailyMaxMinutes).toBeDefined();
    expect(validateAvailability({ ...DEFAULT_AVAILABILITY, shortBreak: 20, longBreak: 10 }).longBreak).toBeDefined();
  });

  it('commitment', () => {
    expect(validateCommitment({ id: 'c', label: 'Lab', repeat: 'weekly', weekdays: [1], start: 600, end: 700 })).toEqual({});
    const e = validateCommitment({ id: 'c', label: ' ', repeat: 'weekly', weekdays: [], start: 700, end: 600 });
    expect(Object.keys(e).sort()).toEqual(['end', 'label', 'weekdays']);
    expect(validateCommitment({ id: 'c', label: 'x', repeat: 'once', start: 1, end: 2 }).date).toBeDefined();
  });

  it('subject, including duplicate names and exam-before-start warning', () => {
    const s = subject('a', '2026-01-10');
    expect(validateSubject(s)).toEqual({});
    expect(validateSubject({ ...s, name: '' }).name).toBe('Subject name is required.');
    expect(validateSubject({ ...s, id: 'b' }, [s]).name).toMatch(/already/);
    expect(validateSubject({ ...s, examDate: '' }).examDate).toBeDefined();
    expect(subjectWarnings(s, '2026-01-11')).toHaveLength(1);
    expect(subjectWarnings(s, '2026-01-10')).toHaveLength(0);
  });

  it('topic', () => {
    const t = topic('t', 's', 60);
    expect(hasErrors(validateTopic(t))).toBe(false);
    expect(validateTopic({ ...t, title: '' }).title).toBe('Topic title is required.');
    expect(validateTopic({ ...t, estimatedMinutes: 0 }).estimatedMinutes).toMatch(/more than 0/);
    expect(validateTopic({ ...t, estimatedMinutes: Number.NaN }).estimatedMinutes).toBeDefined();
    expect(validateTopic({ ...t, confidence: 6 }).confidence).toBeDefined();
  });

  it('session edits', () => {
    expect(validateSessionEdit({ start: 600, duration: 50 }, DEFAULT_AVAILABILITY)).toEqual({});
    expect(validateSessionEdit({ start: 1400, duration: 60 }, DEFAULT_AVAILABILITY).duration).toMatch(/midnight/);
    expect(validateSessionEdit({ start: 600, duration: -5 }, DEFAULT_AVAILABILITY).duration).toBeDefined();
  });
});
