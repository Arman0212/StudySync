/**
 * The ONLY module that touches browser storage. Components and state code call these
 * functions; they never use localStorage directly.
 */
import type { AppData } from '../domain/types';
import { makeEnvelope, parseJsonText, type ParseResult } from './schema';

export const DATA_KEY = 'studysync:data';
export const BACKUP_KEY = 'studysync:backup';
export const PREFS_KEY = 'studysync:prefs';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; data: AppData; savedAt: string | null; migratedFrom?: number }
  | { status: 'corrupt'; raw: string; error: string; code: Exclude<ParseResult, { ok: true }>['code'] };

/** Memory fallback when localStorage is unavailable (e.g. blocked by privacy settings). */
export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

export function defaultStore(): KeyValueStore {
  try {
    const ls = globalThis.localStorage;
    const probe = '__studysync_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryStore();
  }
}

export function loadData(store: KeyValueStore): LoadResult {
  const raw = store.getItem(DATA_KEY);
  if (raw === null) return { status: 'empty' };
  const parsed = parseJsonText(raw);
  if (!parsed.ok) {
    // Keep a raw backup of the damaged data, without ever overwriting the original key.
    if (store.getItem(BACKUP_KEY) !== raw) {
      try {
        store.setItem(BACKUP_KEY, raw);
      } catch {
        /* quota: the original key is still intact */
      }
    }
    return { status: 'corrupt', raw, error: parsed.error, code: parsed.code };
  }
  let savedAt: string | null;
  try {
    const env = JSON.parse(raw) as { savedAt?: unknown };
    savedAt = typeof env.savedAt === 'string' ? env.savedAt : null;
  } catch {
    savedAt = null;
  }
  return parsed.migratedFrom ? { status: 'ok', data: parsed.data, savedAt, migratedFrom: parsed.migratedFrom } : { status: 'ok', data: parsed.data, savedAt };
}

export function saveData(store: KeyValueStore, data: AppData, savedAt: string): void {
  store.setItem(DATA_KEY, JSON.stringify(makeEnvelope(data, savedAt)));
}

export function exportJson(data: AppData, savedAt: string): string {
  return JSON.stringify(makeEnvelope(data, savedAt), null, 2);
}

export function readBackup(store: KeyValueStore): string | null {
  return store.getItem(BACKUP_KEY);
}

/** Wipe app data. The raw backup is kept unless `includeBackup` is set. */
export function clearData(store: KeyValueStore, includeBackup = false): void {
  store.removeItem(DATA_KEY);
  if (includeBackup) store.removeItem(BACKUP_KEY);
}

/** Small per-browser UI preferences (e.g. last timetable view). */
export function loadPrefs(store: KeyValueStore): Record<string, string> {
  try {
    const v = JSON.parse(store.getItem(PREFS_KEY) ?? '{}') as unknown;
    return typeof v === 'object' && v !== null ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function savePrefs(store: KeyValueStore, prefs: Record<string, string>): void {
  try {
    store.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* non-essential */
  }
}

export { parseJsonText };
