import { addDays, diffDays, startOfWeek } from '../domain/dates';
import type { ISODate, StudySession } from '../domain/types';

export interface HeatCell {
  date: ISODate;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/**
 * Study heatmap data: minutes of completed sessions per day (actual minutes when recorded,
 * otherwise the planned duration), as Monday-first week columns ending with today's week.
 */
export function heatmapWeeks(sessions: StudySession[], today: ISODate, weeks: number): HeatCell[][] {
  const byDate = new Map<ISODate, number>();
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + (s.actualMinutes ?? s.duration));
  }
  const first = addDays(startOfWeek(today), -7 * (weeks - 1));
  const out: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const minutes = byDate.get(date) ?? 0;
      col.push({ date, minutes, level: heatLevel(minutes), future: diffDays(today, date) > 0 });
    }
    out.push(col);
  }
  return out;
}

/** 0 = none, then < 1 h, < 2 h, < 3 h, 3 h or more. */
export function heatLevel(minutes: number): HeatCell['level'] {
  if (minutes <= 0) return 0;
  if (minutes < 60) return 1;
  if (minutes < 120) return 2;
  if (minutes < 180) return 3;
  return 4;
}
