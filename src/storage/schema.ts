/**
 * Strict runtime validation of persisted / imported data, plus schema migrations.
 * Pure module (no browser storage access) so it can be shared by load and import.
 */
import { isValidDate } from '../domain/dates';
import type { AppData } from '../domain/types';
import { DEFAULT_AVAILABILITY } from '../domain/types';

export const SCHEMA_VERSION = 2;
export const APP_MARKER = 'studysync';

export interface Envelope {
  app: typeof APP_MARKER;
  schemaVersion: number;
  savedAt: string;
  data: AppData;
}

export type ParseResult = { ok: true; data: AppData; migratedFrom?: number } | { ok: false; error: string; code: 'malformed' | 'wrong_app' | 'future_version' | 'invalid' };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isMin = (v: unknown): v is number => isNum(v) && v >= 0 && v <= 1440;
const oneOf = <T extends string>(v: unknown, opts: readonly T[]): v is T => isStr(v) && (opts as readonly string[]).includes(v);
const isWeekdays = (v: unknown) => Array.isArray(v) && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
const optNum = (v: unknown) => v === undefined || v === null || isNum(v);

class Invalid extends Error {}
function req(cond: boolean, path: string): void {
  if (!cond) throw new Invalid(path);
}

function checkData(d: unknown): AppData {
  req(isObj(d), 'data');
  const o = d as Obj;
  if (o.profile !== null) {
    req(isObj(o.profile), 'profile');
    const p = o.profile as Obj;
    req(isStr(p.displayName) && isStr(p.institution) && isStr(p.timezone) && isValidDate(p.planStart), 'profile fields');
  }
  req(isObj(o.availability), 'availability');
  const a = o.availability as Obj;
  req(isWeekdays(a.studyDays), 'availability.studyDays');
  for (const k of ['dayStart', 'dayEnd'] as const) req(isMin(a[k]), `availability.${k}`);
  for (const k of ['dailyMaxMinutes', 'sessionLength', 'shortBreak', 'longBreak', 'sessionsBeforeLongBreak'] as const) req(isNum(a[k]) && (a[k] as number) >= 0, `availability.${k}`);

  req(Array.isArray(o.commitments), 'commitments');
  (o.commitments as unknown[]).forEach((c, i) => {
    req(isObj(c), `commitments[${i}]`);
    const x = c as Obj;
    req(isStr(x.id) && isStr(x.label) && oneOf(x.repeat, ['once', 'weekly'] as const) && isMin(x.start) && isMin(x.end), `commitments[${i}]`);
    if (x.repeat === 'once') req(isValidDate(x.date), `commitments[${i}].date`);
    else req(isWeekdays(x.weekdays), `commitments[${i}].weekdays`);
  });

  req(Array.isArray(o.subjects), 'subjects');
  const subjectIds = new Set<string>();
  (o.subjects as unknown[]).forEach((s, i) => {
    req(isObj(s), `subjects[${i}]`);
    const x = s as Obj;
    req(isStr(x.id) && isStr(x.name) && isValidDate(x.examDate) && oneOf(x.priority, ['normal', 'high'] as const) && isStr(x.color), `subjects[${i}]`);
    req(x.examStart === undefined || x.examStart === null || isMin(x.examStart), `subjects[${i}].examStart`);
    req(!subjectIds.has(x.id as string), `subjects[${i}] duplicate id`);
    subjectIds.add(x.id as string);
  });

  req(Array.isArray(o.topics), 'topics');
  const topicIds = new Set<string>();
  (o.topics as unknown[]).forEach((t, i) => {
    req(isObj(t), `topics[${i}]`);
    const x = t as Obj;
    req(isStr(x.id) && isStr(x.subjectId) && subjectIds.has(x.subjectId) && isStr(x.title) && isStr(x.notes), `topics[${i}]`);
    req(oneOf(x.difficulty, ['easy', 'moderate', 'hard'] as const) && oneOf(x.importance, ['low', 'medium', 'high'] as const), `topics[${i}] levels`);
    req(oneOf(x.status, ['not_started', 'in_progress', 'completed'] as const) && isNum(x.estimatedMinutes) && x.estimatedMinutes > 0 && isNum(x.order), `topics[${i}] fields`);
    req(x.confidence === undefined || x.confidence === null || (Number.isInteger(x.confidence) && (x.confidence as number) >= 1 && (x.confidence as number) <= 5), `topics[${i}].confidence`);
    req(!topicIds.has(x.id as string), `topics[${i}] duplicate id`);
    topicIds.add(x.id as string);
  });

  req(Array.isArray(o.sessions), 'sessions');
  const sessionIds = new Set<string>();
  (o.sessions as unknown[]).forEach((s, i) => {
    req(isObj(s), `sessions[${i}]`);
    const x = s as Obj;
    req(isStr(x.id) && isStr(x.topicId) && topicIds.has(x.topicId) && isStr(x.subjectId) && subjectIds.has(x.subjectId), `sessions[${i}] links`);
    req(isValidDate(x.date) && isMin(x.start) && isNum(x.duration) && x.duration > 0, `sessions[${i}] time`);
    req(oneOf(x.status, ['planned', 'in_progress', 'completed', 'missed', 'rescheduled'] as const) && typeof x.locked === 'boolean', `sessions[${i}] status`);
    req(isNum(x.rescheduleCount) && Array.isArray(x.history) && optNum(x.actualMinutes) && (x.note === undefined || isStr(x.note)), `sessions[${i}] tracking`);
    req(!sessionIds.has(x.id as string), `sessions[${i}] duplicate id`);
    sessionIds.add(x.id as string);
  });

  req(Array.isArray(o.conflicts) && Array.isArray(o.activity) && Array.isArray(o.mockScores), 'lists');
  req(o.mockConfig === null || isObj(o.mockConfig), 'mockConfig');
  req(typeof o.isDemo === 'boolean', 'isDemo');
  return o as unknown as AppData;
}

/**
 * Migrations from older schema versions. Version 1 was the first draft of the format
 * (no activity log, no mock-test data, no demo flag and no session history); it is
 * upgraded by filling those in with safe empty values.
 */
export function migrate(version: number, data: unknown): unknown {
  let d = data;
  if (version === 1) {
    const o = isObj(d) ? d : {};
    d = {
      ...o,
      availability: isObj(o.availability) ? { ...DEFAULT_AVAILABILITY, ...o.availability } : o.availability,
      sessions: Array.isArray(o.sessions) ? o.sessions.map((s) => (isObj(s) ? { rescheduleCount: 0, history: [], locked: false, actualMinutes: null, note: '', ...s } : s)) : o.sessions,
      conflicts: o.conflicts ?? [],
      activity: [],
      mockConfig: null,
      mockScores: [],
      isDemo: false,
    };
  }
  // Future migrations (v2 → v3 …) chain here.
  return d;
}

export function parseEnvelope(value: unknown): ParseResult {
  if (!isObj(value)) return { ok: false, code: 'malformed', error: 'The file is not a StudySync data file.' };
  if (value.app !== APP_MARKER) return { ok: false, code: 'wrong_app', error: 'This file was not exported from StudySync.' };
  const version = value.schemaVersion;
  if (!Number.isInteger(version) || (version as number) < 1) return { ok: false, code: 'invalid', error: 'The file has no valid schema version.' };
  if ((version as number) > SCHEMA_VERSION) {
    return { ok: false, code: 'future_version', error: `This data uses schema version ${String(version)}, which is newer than this app supports (${SCHEMA_VERSION}).` };
  }
  try {
    const migrated = migrate(version as number, value.data);
    const data = checkData(migrated);
    return version === SCHEMA_VERSION ? { ok: true, data } : { ok: true, data, migratedFrom: version as number };
  } catch (e) {
    const where = e instanceof Invalid ? e.message : 'unknown field';
    return { ok: false, code: 'invalid', error: `The data is incomplete or damaged (problem at: ${where}).` };
  }
}

export function parseJsonText(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, code: 'malformed', error: 'The file is not valid JSON.' };
  }
  return parseEnvelope(value);
}

export function makeEnvelope(data: AppData, savedAt: string): Envelope {
  return { app: APP_MARKER, schemaVersion: SCHEMA_VERSION, savedAt, data };
}
