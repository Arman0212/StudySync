import { useState } from 'react';
import { loadPrefs, savePrefs, type KeyValueStore } from '../storage/storage';

/** 'system' follows prefers-color-scheme; 'light' / 'dark' override it. */
export type ThemePref = 'system' | 'light' | 'dark';

export function readThemePref(store: KeyValueStore): ThemePref {
  const v = loadPrefs(store).theme;
  return v === 'light' || v === 'dark' ? v : 'system';
}

/** Sets (or clears) data-theme on <html>; the token CSS does the rest. */
export function applyTheme(pref: ThemePref, root: HTMLElement | undefined = globalThis.document?.documentElement): void {
  if (!root) return;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function useTheme(store: KeyValueStore): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => readThemePref(store));
  const set = (p: ThemePref) => {
    setPref(p);
    applyTheme(p);
    savePrefs(store, { ...loadPrefs(store), theme: p });
  };
  return [pref, set];
}
