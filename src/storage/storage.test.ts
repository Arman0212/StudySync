import { describe, it, expect } from 'vitest';
import { BACKUP_KEY, DATA_KEY, clearData, exportJson, loadData, memoryStore, saveData, readBackup, defaultStore } from './storage';
import { SCHEMA_VERSION, parseJsonText, parseEnvelope } from './schema';
import { emptyAppData, type AppData } from '../domain/types';
import { session, subject, topic } from '../test/factories';

function sample(): AppData {
  const d = emptyAppData();
  d.profile = { displayName: 'Asha', institution: 'Uni', timezone: 'Asia/Kolkata', planStart: '2026-01-05' };
  d.subjects = [subject('s', '2026-02-01')];
  d.topics = [topic('t', 's', 120, { confidence: 3 })];
  d.sessions = [session('x', { topicId: 't', subjectId: 's', history: [{ fromDate: '2026-01-05', fromStart: 540, toDate: '2026-01-06', toStart: 600, reason: 'Missed', at: 'z' }], rescheduleCount: 1 })];
  d.commitments = [{ id: 'c', label: 'Lab', repeat: 'weekly', weekdays: [2], start: 600, end: 720 }];
  return d;
}

describe('storage', () => {
  it('returns empty when nothing is saved', () => {
    expect(loadData(memoryStore())).toEqual({ status: 'empty' });
  });

  it('saves and loads identical data with the schema version', () => {
    const store = memoryStore();
    const d = sample();
    saveData(store, d, '2026-01-05T10:00:00.000Z');
    const raw = JSON.parse(store.getItem(DATA_KEY)!);
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loadData(store)).toEqual({ status: 'ok', data: d, savedAt: '2026-01-05T10:00:00.000Z' });
  });

  it('handles corrupted data safely: backup kept, original never overwritten', () => {
    const store = memoryStore();
    store.setItem(DATA_KEY, '{"app":"studysync", broken');
    const r = loadData(store);
    expect(r.status).toBe('corrupt');
    expect(store.getItem(DATA_KEY)).toBe('{"app":"studysync", broken');
    expect(readBackup(store)).toBe('{"app":"studysync", broken');
  });

  it('flags invalid structure and future versions as corrupt with explanations', () => {
    const store = memoryStore();
    store.setItem(DATA_KEY, JSON.stringify({ app: 'studysync', schemaVersion: SCHEMA_VERSION, savedAt: 'x', data: { ...sample(), topics: 'nope' } }));
    const r = loadData(store);
    expect(r.status === 'corrupt' && r.error).toMatch(/problem at: topics/);
    store.setItem(DATA_KEY, JSON.stringify({ app: 'studysync', schemaVersion: 99, data: sample() }));
    const f = loadData(store);
    expect(f.status === 'corrupt' && f.code).toBe('future_version');
  });

  it('migrates schema v1 data', () => {
    const v1 = { app: 'studysync', schemaVersion: 1, savedAt: 'x', data: { profile: null, availability: { studyDays: [1], dayStart: 540, dayEnd: 1020, dailyMaxMinutes: 200, sessionLength: 50 }, commitments: [], subjects: [], topics: [], sessions: [] } };
    const r = parseEnvelope(v1);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.migratedFrom).toBe(1);
      expect(r.data.activity).toEqual([]);
      expect(r.data.availability.shortBreak).toBe(10);
    }
  });

  it('export then import restores identical data', () => {
    const d = sample();
    const text = exportJson(d, '2026-01-05T10:00:00.000Z');
    const r = parseJsonText(text);
    expect(r).toEqual({ ok: true, data: d });
  });

  it('rejects malformed, foreign and inconsistent files', () => {
    expect(parseJsonText('not json')).toMatchObject({ ok: false, code: 'malformed' });
    expect(parseJsonText('[]')).toMatchObject({ ok: false, code: 'malformed' });
    expect(parseJsonText('{"app":"other","schemaVersion":2}')).toMatchObject({ ok: false, code: 'wrong_app' });
    expect(parseJsonText('{"app":"studysync","schemaVersion":"2"}')).toMatchObject({ ok: false, code: 'invalid' });
    const d = sample();
    d.sessions[0]!.topicId = 'ghost';
    expect(parseJsonText(exportJson(d, 'x'))).toMatchObject({ ok: false, code: 'invalid' });
    const dup = sample();
    dup.topics.push({ ...dup.topics[0]! });
    expect(parseJsonText(exportJson(dup, 'x'))).toMatchObject({ ok: false });
  });

  it('clears data but keeps the backup unless asked', () => {
    const store = memoryStore();
    store.setItem(DATA_KEY, 'x');
    store.setItem(BACKUP_KEY, 'y');
    clearData(store);
    expect(store.getItem(DATA_KEY)).toBeNull();
    expect(store.getItem(BACKUP_KEY)).toBe('y');
    clearData(store, true);
    expect(store.getItem(BACKUP_KEY)).toBeNull();
  });

  it('uses real localStorage when available', () => {
    const s = defaultStore();
    s.setItem('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
  });
});
