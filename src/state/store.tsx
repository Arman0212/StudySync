/**
 * App state container: holds AppData, applies pure actions, and autosaves through the
 * storage module after every change. Components never touch storage directly.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, LocalNow } from '../domain/types';
import { emptyAppData } from '../domain/types';
import { localNowIn } from '../domain/dates';
import { newId } from './ids';
import { clearData, defaultStore, loadData, saveData, type KeyValueStore } from '../storage/storage';
import { reduce, type Action } from './actions';

export interface Recovery {
  raw: string;
  error: string;
}

interface State {
  data: AppData;
  savedAt: string | null;
  recovery: Recovery | null;
  dirty: boolean;
  saveError: string | null;
}

export interface AppContextValue {
  data: AppData;
  dispatch: (a: Action) => void;
  savedAt: string | null;
  saveError: string | null;
  recovery: Recovery | null;
  now: LocalNow;
  clock: () => Date;
  timezone: string;
  /** Wipe the stored app data (keeps the raw backup) and start fresh. */
  resetAll: () => void;
  store: KeyValueStore;
}

const AppContext = createContext<AppContextValue | null>(null);

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function initialState(store: KeyValueStore): State {
  const r = loadData(store);
  if (r.status === 'ok') return { data: r.data, savedAt: r.savedAt, recovery: null, dirty: r.migratedFrom != null, saveError: null };
  if (r.status === 'corrupt') return { data: emptyAppData(), savedAt: null, recovery: { raw: r.raw, error: r.error }, dirty: false, saveError: null };
  return { data: emptyAppData(), savedAt: null, recovery: null, dirty: false, saveError: null };
}

export function AppProvider({ children, store: storeProp, clock: clockProp }: { children: ReactNode; store?: KeyValueStore; clock?: () => Date }) {
  const [store] = useState<KeyValueStore>(() => storeProp ?? defaultStore());
  const clock = useMemo(() => clockProp ?? (() => new Date()), [clockProp]);
  const [loaded] = useState(() => initialState(store));
  const [state, setState] = useState<State>(loaded);
  const stateRef = useRef<State>(loaded);
  const timezone = state.data.profile?.timezone ?? browserTimezone();
  const [now, setNow] = useState<LocalNow>(() => localNowIn(clock(), timezone));

  useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const next = localNowIn(clock(), timezone);
        return prev.date === next.date && prev.minutes === next.minutes ? prev : next;
      });
    const t = setInterval(tick, 30_000);
    const onVisible = () => tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [clock, timezone]);

  // Data migrated from an older schema version is written back once in the new format.
  useEffect(() => {
    if (loaded.dirty && !loaded.recovery) {
      try {
        saveData(store, loaded.data, clock().toISOString());
      } catch {
        /* surfaced on the next save */
      }
    }
  }, [loaded, store, clock]);

  const commit = useCallback((next: State) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /**
   * Apply an action and autosave immediately. Saving is skipped while in recovery mode
   * (unless the action is an explicit import/demo/reset) so damaged data is never
   * overwritten silently.
   */
  const dispatch = useCallback(
    (a: Action) => {
      const s = stateRef.current;
      const meta = { at: clock().toISOString(), id: () => newId('a') };
      const data = reduce(s.data, a, meta);
      if (data === s.data) return;
      const leavingRecovery = s.recovery !== null && a.type === 'replaceAll';
      const recovery = leavingRecovery ? null : s.recovery;
      if (recovery) {
        commit({ ...s, data });
        return;
      }
      const at = clock().toISOString();
      try {
        saveData(store, data, at);
        commit({ ...s, data, recovery, savedAt: at, saveError: null, dirty: false });
      } catch {
        commit({ ...s, data, recovery, dirty: true, saveError: 'Could not save — your browser storage may be full or blocked.' });
      }
    },
    [clock, store, commit],
  );

  const resetAll = useCallback(() => {
    clearData(store);
    commit({ data: emptyAppData(), savedAt: null, recovery: null, dirty: false, saveError: null });
  }, [store, commit]);

  const value = useMemo<AppContextValue>(
    () => ({ data: state.data, dispatch, savedAt: state.savedAt, saveError: state.saveError, recovery: state.recovery, now, clock, timezone, resetAll, store }),
    [state, dispatch, now, clock, timezone, resetAll, store],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
