/**
 * Timezone-safe date utilities.
 *
 * All calendar arithmetic is done on "YYYY-MM-DD" strings by converting to a UTC
 * day number via Date.UTC (which never depends on the host timezone) and back.
 * We never call `new Date("YYYY-MM-DD")` and never read the host clock here.
 */
import type { ISODate, Minutes, Weekday, LocalNow } from './types';

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isValidDate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function parts(date: ISODate): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Days since 1970-01-01 for a calendar date (timezone independent). */
export function toDayNumber(date: ISODate): number {
  const [y, m, d] = parts(date);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * MS_PER_DAY);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(date) + days);
}

/** b - a in whole days. */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(b) - toDayNumber(a);
}

export function weekdayOf(date: ISODate): Weekday {
  // 1970-01-01 was a Thursday (4).
  return ((((toDayNumber(date) + 4) % 7) + 7) % 7) as Weekday;
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0; // ISO strings sort lexicographically
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** Inclusive range of dates from `from` to `to`. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const a = toDayNumber(from);
  const b = toDayNumber(to);
  for (let n = a; n <= b; n++) out.push(fromDayNumber(n));
  return out;
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: ISODate): ISODate {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "HH:MM" -> minutes. Returns null for invalid input. */
export function parseTime(value: string): Minutes | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 24 || mi > 59 || (h === 24 && mi !== 0)) return null;
  return h * 60 + mi;
}

export function formatTime(minutes: Minutes): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function formatDuration(minutes: Minutes): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function weekdayName(wd: Weekday, long = false): string {
  return (long ? WEEKDAY_LONG : WEEKDAY_SHORT)[wd];
}

/** e.g. "Mon 3 Mar 2026" — formatted from components, so no timezone shift. */
export function formatDate(date: ISODate, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const [y, m, d] = parts(date);
  const wd = opts.weekday === false ? '' : `${WEEKDAY_SHORT[weekdayOf(date)]} `;
  return `${wd}${d} ${MONTH_SHORT[m - 1]}${opts.year ? ` ${y}` : ''}`;
}

/**
 * The current local date and time in an IANA timezone for a given instant.
 * This is the only place that converts an absolute instant into the student's
 * calendar; the caller supplies the instant so the function stays deterministic.
 */
export function localNowIn(instant: Date, timeZone: string): LocalNow {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(instant)) p[part.type] = part.value;
  const hour = Number(p.hour) % 24;
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: hour * 60 + Number(p.minute) };
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Compare two (date, minute) instants on the local calendar. */
export function compareMoments(aDate: ISODate, aMin: Minutes, bDate: ISODate, bMin: Minutes): number {
  const c = compareDates(aDate, bDate);
  return c !== 0 ? c : aMin - bMin;
}
