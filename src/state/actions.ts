/**
 * Pure state transitions for AppData. Every function returns a new object.
 * Scheduling work is delegated to src/scheduling; this module only records results.
 */
import type {
  ActivityEntry, AppData, Availability, CapacityConflict, Commitment, MockScore, MockTestConfig,
  Profile, StudySession, Subject, Topic, TopicStatus,
} from '../domain/types';
import { emptyAppData } from '../domain/types';
import type { RescheduleOutcome } from '../scheduling/rescheduler';
import { applyOutcomes } from '../scheduling/rescheduler';

export interface Meta {
  /** ISO timestamp for activity entries. */
  at: string;
  id: () => string;
}

export type Action =
  | { type: 'setProfile'; profile: Profile }
  | { type: 'setAvailability'; availability: Availability }
  | { type: 'upsertCommitment'; commitment: Commitment }
  | { type: 'deleteCommitment'; id: string }
  | { type: 'upsertSubject'; subject: Subject }
  | { type: 'deleteSubject'; id: string }
  | { type: 'upsertTopic'; topic: Topic }
  | { type: 'deleteTopic'; id: string }
  | { type: 'setTopicStatus'; topicId: string; status: TopicStatus }
  | { type: 'setTopicConfidence'; topicId: string; confidence: number | null }
  | { type: 'applyPlan'; sessions: StudySession[]; conflicts: CapacityConflict[]; summary: string }
  | { type: 'completeSession'; id: string; actualMinutes: number | null; note: string; topicDone: boolean }
  | { type: 'markMissed'; id: string }
  | { type: 'startSession'; id: string }
  | { type: 'editSession'; id: string; date: string; start: number; duration: number }
  | { type: 'toggleLock'; id: string }
  | { type: 'deleteSession'; id: string }
  | { type: 'applyReschedule'; outcomes: RescheduleOutcome[] }
  | { type: 'replaceSession'; session: StudySession; reason: string }
  | { type: 'setMockConfig'; config: MockTestConfig }
  | { type: 'addMockScore'; score: MockScore }
  | { type: 'replaceAll'; data: AppData; reason: 'import' | 'demo' | 'reset' };

function log(d: AppData, meta: Meta, entry: Omit<ActivityEntry, 'id' | 'at'>): ActivityEntry[] {
  // Keep the log bounded so storage stays small.
  return [{ id: meta.id(), at: meta.at, ...entry }, ...d.activity].slice(0, 500);
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const copy = [...list];
  copy[i] = item;
  return copy;
}

function topicTitle(d: AppData, topicId: string): string {
  return d.topics.find((t) => t.id === topicId)?.title ?? 'a topic';
}

export function reduce(d: AppData, a: Action, meta: Meta): AppData {
  switch (a.type) {
    case 'setProfile':
      return { ...d, profile: a.profile };
    case 'setAvailability':
      return { ...d, availability: a.availability };
    case 'upsertCommitment':
      return { ...d, commitments: upsert(d.commitments, a.commitment) };
    case 'deleteCommitment':
      return { ...d, commitments: d.commitments.filter((c) => c.id !== a.id) };
    case 'upsertSubject':
      return { ...d, subjects: upsert(d.subjects, a.subject) };
    case 'deleteSubject':
      return {
        ...d,
        subjects: d.subjects.filter((s) => s.id !== a.id),
        topics: d.topics.filter((t) => t.subjectId !== a.id),
        sessions: d.sessions.filter((s) => s.subjectId !== a.id),
        conflicts: d.conflicts.filter((c) => c.subjectId !== a.id),
        mockConfig: d.mockConfig?.subjectId === a.id ? null : d.mockConfig,
      };
    case 'upsertTopic': {
      const prev = d.topics.find((t) => t.id === a.topic.id);
      const topics = upsert(d.topics, a.topic);
      const activity =
        a.topic.status === 'completed' && prev?.status !== 'completed'
          ? log(d, meta, { kind: 'topic_completed', message: `Marked “${a.topic.title}” as completed`, topicId: a.topic.id, subjectId: a.topic.subjectId })
          : d.activity;
      return { ...d, topics, activity };
    }
    case 'deleteTopic':
      return {
        ...d,
        topics: d.topics.filter((t) => t.id !== a.id),
        sessions: d.sessions.filter((s) => s.topicId !== a.id),
        conflicts: d.conflicts.filter((c) => c.topicId !== a.id),
        mockConfig: d.mockConfig ? { ...d.mockConfig, topicIds: d.mockConfig.topicIds.filter((x) => x !== a.id) } : null,
      };
    case 'setTopicStatus': {
      const t = d.topics.find((x) => x.id === a.topicId);
      if (!t || t.status === a.status) return d;
      return reduce(d, { type: 'upsertTopic', topic: { ...t, status: a.status } }, meta);
    }
    case 'setTopicConfidence':
      return { ...d, topics: d.topics.map((t) => (t.id === a.topicId ? { ...t, confidence: a.confidence } : t)) };
    case 'applyPlan':
      return { ...d, sessions: a.sessions, conflicts: a.conflicts, activity: log(d, meta, { kind: 'plan_generated', message: a.summary }) };
    case 'completeSession': {
      const s = d.sessions.find((x) => x.id === a.id);
      if (!s) return d;
      let next: AppData = {
        ...d,
        sessions: d.sessions.map((x) => (x.id === a.id ? { ...x, status: 'completed' as const, actualMinutes: a.actualMinutes, note: a.note } : x)),
        activity: log(d, meta, { kind: 'session_completed', message: `Completed a session on “${topicTitle(d, s.topicId)}”${a.actualMinutes != null ? ` (${a.actualMinutes} min)` : ''}`, sessionId: s.id, topicId: s.topicId, subjectId: s.subjectId }),
      };
      next = reduce(next, { type: 'setTopicStatus', topicId: s.topicId, status: a.topicDone ? 'completed' : 'in_progress' }, meta);
      return next;
    }
    case 'startSession': {
      const s = d.sessions.find((x) => x.id === a.id);
      if (!s || s.status === 'completed') return d;
      const next = { ...d, sessions: d.sessions.map((x) => (x.id === a.id ? { ...x, status: 'in_progress' as const } : x)) };
      const t = d.topics.find((x) => x.id === s.topicId);
      return t && t.status === 'not_started' ? reduce(next, { type: 'setTopicStatus', topicId: t.id, status: 'in_progress' }, meta) : next;
    }
    case 'markMissed': {
      const s = d.sessions.find((x) => x.id === a.id);
      if (!s || s.status === 'missed') return d;
      return {
        ...d,
        sessions: d.sessions.map((x) => (x.id === a.id ? { ...x, status: 'missed' as const, actualMinutes: null } : x)),
        activity: log(d, meta, { kind: 'session_missed', message: `Missed a session on “${topicTitle(d, s.topicId)}”`, sessionId: s.id, topicId: s.topicId, subjectId: s.subjectId }),
      };
    }
    case 'editSession': {
      const s = d.sessions.find((x) => x.id === a.id);
      if (!s) return d;
      return {
        ...d,
        sessions: d.sessions.map((x) => (x.id === a.id ? { ...x, date: a.date, start: a.start, duration: a.duration } : x)),
        activity: log(d, meta, { kind: 'session_edited', message: `Edited a session on “${topicTitle(d, s.topicId)}”`, sessionId: s.id, topicId: s.topicId, subjectId: s.subjectId }),
      };
    }
    case 'toggleLock': {
      const s = d.sessions.find((x) => x.id === a.id);
      if (!s) return d;
      return {
        ...d,
        sessions: d.sessions.map((x) => (x.id === a.id ? { ...x, locked: !x.locked } : x)),
        activity: log(d, meta, { kind: 'session_locked', message: `${s.locked ? 'Unlocked' : 'Locked'} a session on “${topicTitle(d, s.topicId)}”`, sessionId: s.id, topicId: s.topicId, subjectId: s.subjectId }),
      };
    }
    case 'deleteSession': {
      const s = d.sessions.find((x) => x.id === a.id);
      if (!s) return d;
      return {
        ...d,
        sessions: d.sessions.filter((x) => x.id !== a.id),
        activity: log(d, meta, { kind: 'session_deleted', message: `Deleted a session on “${topicTitle(d, s.topicId)}”`, topicId: s.topicId, subjectId: s.subjectId }),
      };
    }
    case 'applyReschedule': {
      const moved = a.outcomes.filter((o) => o.kind === 'moved');
      if (moved.length === 0) return d;
      let activity = d.activity;
      for (const o of moved) {
        activity = log({ ...d, activity }, meta, { kind: 'session_rescheduled', message: `Rescheduled “${topicTitle(d, o.session.topicId)}” to ${o.to.date}`, sessionId: o.session.id, topicId: o.session.topicId, subjectId: o.session.subjectId });
      }
      return { ...d, sessions: applyOutcomes(d.sessions, a.outcomes), activity };
    }
    case 'replaceSession': {
      if (!d.sessions.some((x) => x.id === a.session.id)) return d;
      return {
        ...d,
        sessions: d.sessions.map((x) => (x.id === a.session.id ? a.session : x)),
        activity: log(d, meta, { kind: 'session_rescheduled', message: `${a.reason}: “${topicTitle(d, a.session.topicId)}” to ${a.session.date}`, sessionId: a.session.id, topicId: a.session.topicId, subjectId: a.session.subjectId }),
      };
    }
    case 'setMockConfig':
      return { ...d, mockConfig: a.config };
    case 'addMockScore': {
      const subj = d.subjects.find((s) => s.id === a.score.subjectId);
      return {
        ...d,
        mockScores: [...d.mockScores, a.score],
        activity: log(d, meta, { kind: 'mock_score', message: `Recorded a mock-test score of ${a.score.scorePercent}% for ${subj?.name ?? 'a subject'}`, subjectId: a.score.subjectId }),
      };
    }
    case 'replaceAll':
      if (a.reason === 'reset') return emptyAppData();
      if (a.reason === 'import') return { ...a.data, activity: log(a.data, meta, { kind: 'data_imported', message: 'Imported data from a file' }) };
      return a.data;
  }
}
