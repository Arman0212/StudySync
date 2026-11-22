import { render } from '@testing-library/react';
import { App } from '../App';
import { memoryStore, saveData, type KeyValueStore } from '../storage/storage';
import { emptyAppData, type AppData } from '../domain/types';

export const FIXED_NOW = new Date('2026-01-05T04:30:00.000Z'); // 10:00 in Asia/Kolkata, Monday
export const clock = () => FIXED_NOW;

export function seeded(mut: (d: AppData) => void = () => undefined): KeyValueStore {
  const store = memoryStore();
  const d = emptyAppData();
  d.profile = { displayName: 'Asha', institution: '', timezone: 'Asia/Kolkata', planStart: '2026-01-05' };
  d.availability.studyDays = [0, 1, 2, 3, 4, 5, 6];
  mut(d);
  saveData(store, d, FIXED_NOW.toISOString());
  return store;
}

export function renderApp(path: string, store: KeyValueStore = memoryStore()) {
  window.location.hash = path;
  return { store, ...render(<App store={store} clock={clock} />) };
}
