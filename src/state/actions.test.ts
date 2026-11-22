import { describe, it, expect } from 'vitest';
import { reduce, type Meta } from './actions';
import { emptyAppData } from '../domain/types';
import { session, subject, topic } from '../test/factories';

let n = 0;
const meta: Meta = { at: '2026-01-05T10:00:00.000Z', id: () => `a${++n}` };

function base() {
  const d = emptyAppData();
  d.subjects = [subject('s', '2026-02-01')];
  d.topics = [topic('t', 's', 100)];
  d.sessions = [session('x', { topicId: 't', subjectId: 's' }), session('y', { topicId: 't', subjectId: 's', start: 700 })];
  return d;
}

describe('state actions', () => {
  it('completing one session of a multi-session topic does not complete the topic unless confirmed', () => {
    const d1 = reduce(base(), { type: 'completeSession', id: 'x', actualMinutes: 40, note: 'ok', topicDone: false }, meta);
    expect(d1.sessions[0]).toMatchObject({ status: 'completed', actualMinutes: 40, note: 'ok', duration: 50 });
    expect(d1.topics[0]!.status).toBe('in_progress');
    const d2 = reduce(d1, { type: 'completeSession', id: 'y', actualMinutes: null, note: '', topicDone: true }, meta);
    expect(d2.topics[0]!.status).toBe('completed');
    expect(d2.activity.map((a) => a.kind)).toEqual(['topic_completed', 'session_completed', 'session_completed']);
  });

  it('missed sessions are never completed and clear actual minutes', () => {
    const d = reduce(base(), { type: 'markMissed', id: 'x' }, meta);
    expect(d.sessions[0]!.status).toBe('missed');
    expect(d.sessions[0]!.actualMinutes).toBeNull();
    expect(reduce(d, { type: 'markMissed', id: 'x' }, meta)).toBe(d); // idempotent
  });

  it('deleting a subject cascades to topics and sessions', () => {
    const d = reduce(base(), { type: 'deleteSubject', id: 's' }, meta);
    expect(d.topics).toEqual([]);
    expect(d.sessions).toEqual([]);
  });

  it('upsert does not duplicate on repeated submits', () => {
    let d = base();
    const t = topic('new', 's', 30);
    d = reduce(d, { type: 'upsertTopic', topic: t }, meta);
    d = reduce(d, { type: 'upsertTopic', topic: t }, meta);
    expect(d.topics.filter((x) => x.id === 'new')).toHaveLength(1);
  });

  it('toggles locks, edits and deletes sessions with activity entries', () => {
    let d = reduce(base(), { type: 'toggleLock', id: 'x' }, meta);
    expect(d.sessions[0]!.locked).toBe(true);
    d = reduce(d, { type: 'editSession', id: 'x', date: '2026-01-06', start: 800, duration: 30 }, meta);
    expect(d.sessions[0]).toMatchObject({ date: '2026-01-06', start: 800, duration: 30 });
    d = reduce(d, { type: 'deleteSession', id: 'x' }, meta);
    expect(d.sessions.map((s) => s.id)).toEqual(['y']);
    expect(d.activity.map((a) => a.kind)).toEqual(['session_deleted', 'session_edited', 'session_locked']);
  });

  it('reset returns empty data', () => {
    expect(reduce(base(), { type: 'replaceAll', data: emptyAppData(), reason: 'reset' }, meta)).toEqual(emptyAppData());
  });
});
