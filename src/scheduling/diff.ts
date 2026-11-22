/**
 * Plan diff used for the "preview before replacing" step of regeneration.
 * Sessions are matched by id (the scheduler reuses ids for the same topic).
 */
import type { StudySession } from '../domain/types';

export interface PlanDiff {
  added: StudySession[];
  moved: { before: StudySession; after: StudySession }[];
  removed: StudySession[];
  unchanged: StudySession[];
}

export function diffPlans(before: StudySession[], after: StudySession[]): PlanDiff {
  const beforeById = new Map(before.map((s) => [s.id, s]));
  const afterIds = new Set(after.map((s) => s.id));
  const diff: PlanDiff = { added: [], moved: [], removed: [], unchanged: [] };
  for (const a of after) {
    const b = beforeById.get(a.id);
    if (!b) diff.added.push(a);
    else if (b.date !== a.date || b.start !== a.start || b.duration !== a.duration || b.status !== a.status) diff.moved.push({ before: b, after: a });
    else diff.unchanged.push(a);
  }
  for (const b of before) if (!afterIds.has(b.id)) diff.removed.push(b);
  return diff;
}

export function hasChanges(d: PlanDiff): boolean {
  return d.added.length + d.moved.length + d.removed.length > 0;
}
