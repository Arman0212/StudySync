/** Glue between AppData and the pure scheduling modules (no algorithms here). */
import type { AppData, LocalNow } from '../domain/types';
import { generatePlan, type PlanResult } from '../scheduling/scheduler';
import type { RescheduleContext } from '../scheduling/rescheduler';
import { newId } from './ids';

export function computePlan(d: AppData, now: LocalNow): PlanResult | null {
  if (!d.profile) return null;
  return generatePlan({
    profile: d.profile,
    availability: d.availability,
    commitments: d.commitments,
    subjects: d.subjects,
    topics: d.topics,
    existingSessions: d.sessions,
    now,
    makeId: () => newId('s'),
  });
}

export function rescheduleContext(d: AppData, now: LocalNow, timestamp: string): RescheduleContext | null {
  if (!d.profile) return null;
  return { profile: d.profile, availability: d.availability, commitments: d.commitments, subjects: d.subjects, sessions: d.sessions, now, timestamp };
}
