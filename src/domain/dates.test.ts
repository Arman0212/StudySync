import { describe, it, expect, afterEach } from 'vitest';
import {
  addDays, dateRange, diffDays, formatDate, formatDuration, formatTime, isValidDate,
  localNowIn, parseTime, startOfWeek, weekdayOf, toDayNumber, fromDayNumber,
} from './dates';

const originalTZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTZ;
});

describe('date utilities', () => {
  it('validates ISO dates including leap years', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-1-01')).toBe(false);
    expect(isValidDate(42)).toBe(false);
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // US DST change
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // EU DST change
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('computes weekdays correctly', () => {
    expect(weekdayOf('1970-01-01')).toBe(4);
    expect(weekdayOf('2026-11-22')).toBe(0); // Sunday
    expect(weekdayOf('2026-11-23')).toBe(1);
  });

  it('round-trips day numbers', () => {
    for (const d of ['1999-12-31', '2026-02-28', '2028-02-29', '2040-07-15']) {
      expect(fromDayNumber(toDayNumber(d))).toBe(d);
    }
  });

  it('diffs and ranges dates', () => {
    expect(diffDays('2026-11-22', '2026-12-01')).toBe(9);
    expect(dateRange('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16');
    expect(startOfWeek('2026-11-23')).toBe('2026-11-23');
  });

  it('parses and formats times and durations', () => {
    expect(parseTime('09:30')).toBe(570);
    expect(parseTime('24:00')).toBe(1440);
    expect(parseTime('24:30')).toBeNull();
    expect(parseTime('9:5')).toBeNull();
    expect(formatTime(570)).toBe('09:30');
    expect(formatDuration(50)).toBe('50 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(135)).toBe('2 h 15 min');
  });

  describe('timezone safety (Asia/Kolkata, UTC+05:30)', () => {
    it('date-only values never shift a day when the host is in Asia/Kolkata', () => {
      process.env.TZ = 'Asia/Kolkata';
      expect(weekdayOf('2026-03-02')).toBe(1);
      expect(addDays('2026-03-01', 1)).toBe('2026-03-02');
      expect(formatDate('2026-03-02', { year: true })).toBe('Mon 2 Mar 2026');
      // The naive approach would drift: new Date('2026-03-02') is UTC midnight.
      expect(fromDayNumber(toDayNumber('2026-03-02'))).toBe('2026-03-02');
    });

    it('date-only values never shift a day when the host is behind UTC', () => {
      process.env.TZ = 'America/Los_Angeles';
      expect(formatDate('2026-03-02', { year: true })).toBe('Mon 2 Mar 2026');
      expect(weekdayOf('2026-03-02')).toBe(1);
    });

    it('resolves "today" in the student timezone, not UTC', () => {
      // 20:00 UTC on 1 March is 01:30 on 2 March in Kolkata.
      const instant = new Date(Date.UTC(2026, 2, 1, 20, 0));
      expect(localNowIn(instant, 'Asia/Kolkata')).toEqual({ date: '2026-03-02', minutes: 90 });
      expect(localNowIn(instant, 'UTC')).toEqual({ date: '2026-03-01', minutes: 1200 });
      // 18:29 UTC is still 23:59 on the same day in Kolkata.
      expect(localNowIn(new Date(Date.UTC(2026, 2, 1, 18, 29)), 'Asia/Kolkata')).toEqual({ date: '2026-03-01', minutes: 1439 });
    });

    it('falls back to UTC for an unknown timezone', () => {
      const instant = new Date(Date.UTC(2026, 2, 1, 20, 0));
      expect(localNowIn(instant, 'Not/AZone')).toEqual({ date: '2026-03-01', minutes: 1200 });
    });
  });
});
