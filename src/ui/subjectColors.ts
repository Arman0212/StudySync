import { SUBJECT_COLORS } from '../domain/types';

/**
 * Display palette for subject markers (dots, left bars, chips, progress fills).
 *
 * Subjects store one of the SUBJECT_COLORS values; that stored value is left untouched so
 * saved data, exports and the demo stay compatible. The UI maps each stored value to a
 * refined, muted display colour here. Unknown colours (e.g. from an older import) are shown
 * as stored.
 */
export const SUBJECT_DISPLAY: Record<string, { color: string; name: string }> = {
  '#1f6f50': { color: '#4E7D5B', name: 'Sage' },
  '#2563a8': { color: '#3B6EA8', name: 'Blue' },
  '#8a4fb0': { color: '#7656A6', name: 'Violet' },
  '#b4471f': { color: '#B4553A', name: 'Terracotta' },
  '#8a6a00': { color: '#8F6B1F', name: 'Amber' },
  '#0f7285': { color: '#2A7682', name: 'Teal' },
  '#b0306a': { color: '#A8466E', name: 'Rose' },
  '#4b5a6b': { color: '#5A6472', name: 'Slate' },
};

export function displaySubjectColor(stored: string | undefined): string | undefined {
  if (!stored) return stored;
  return SUBJECT_DISPLAY[stored.toLowerCase()]?.color ?? stored;
}

/** Picker options: the stored value plus its display colour and name. */
export const SUBJECT_OPTIONS = SUBJECT_COLORS.map((c) => ({ value: c.value, color: SUBJECT_DISPLAY[c.value.toLowerCase()]?.color ?? c.value, name: SUBJECT_DISPLAY[c.value.toLowerCase()]?.name ?? c.name }));
