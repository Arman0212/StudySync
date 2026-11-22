import { useMemo, useState } from 'react';
import { useApp } from '../state/store';
import { navigate } from '../state/router';
import { computePlan, rescheduleContext } from '../state/planning';
import type { SessionStatus, StudySession } from '../domain/types';
import { addDays, dateRange, formatDate, formatDuration, formatTime, startOfWeek, isValidDate } from '../domain/dates';
import { diffPlans, hasChanges, type PlanDiff } from '../scheduling/diff';
import { conflictSuggestions, type PlanResult } from '../scheduling/scheduler';
import { previewBulkReschedule, type RescheduleOutcome } from '../scheduling/rescheduler';
import { loadPrefs, savePrefs } from '../storage/storage';
import { Button } from '../ui/Button';
import { SelectField, TextField } from '../ui/Field';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { Card, EmptyState, Notice, PageHeader, SubjectDot, sessionStatusLabel } from '../ui/bits';
import { useToast } from '../ui/Toast';
import { SessionCard } from './timetable/SessionCard';
import { useSessionActions } from './timetable/useSessionActions';

type View = 'day' | 'week' | 'list';
const STATUSES: SessionStatus[] = ['planned', 'in_progress', 'completed', 'missed', 'rescheduled'];

export function Timetable() {
  const { data, dispatch, now, clock, store } = useApp();
  const toast = useToast();
  const actions = useSessionActions();
  const [view, setViewState] = useState<View>(() => {
    const v = loadPrefs(store).timetableView;
    return v === 'day' || v === 'week' || v === 'list' ? v : 'list';
  });
  const [date, setDate] = useState(now.date);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<{ plan: PlanResult; diff: PlanDiff } | null>(null);
  const [bulk, setBulk] = useState<RescheduleOutcome[] | null>(null);
  const [detail, setDetail] = useState<StudySession | null>(null);

  const setView = (v: View) => {
    setViewState(v);
    savePrefs(store, { ...loadPrefs(store), timetableView: v });
  };

  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects]);
  const topicById = useMemo(() => new Map(data.topics.map((t) => [t.id, t])), [data.topics]);
  const filtered = useMemo(
    () =>
      data.sessions
        .filter((s) => (!subjectFilter || s.subjectId === subjectFilter) && (!statusFilter || s.status === statusFilter) && (!from || s.date >= from) && (!to || s.date <= to))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start)),
    [data.sessions, subjectFilter, statusFilter, from, to],
  );
  const missedCount = data.sessions.filter((s) => s.status === 'missed' && !s.locked).length;
  const totalFor = (d: string) => data.sessions.filter((s) => s.date === d && s.status !== 'missed').reduce((t, s) => t + s.duration, 0);

  const openPreview = () => {
    const plan = computePlan(data, now);
    if (!plan) return;
    setPreview({ plan, diff: diffPlans(data.sessions, plan.sessions) });
  };

  const applyPreview = () => {
    if (!preview) return;
    const { diff, plan } = preview;
    dispatch({ type: 'applyPlan', sessions: plan.sessions, conflicts: plan.conflicts, summary: `Generated plan: ${diff.added.length} added, ${diff.moved.length} moved, ${diff.removed.length} removed` });
    toast.show(plan.conflicts.length > 0 ? `Plan updated — ${plan.conflicts.length} topic(s) didn’t fully fit` : 'Plan updated', plan.conflicts.length > 0 ? 'info' : 'success');
    setPreview(null);
  };

  const openBulk = () => {
    const ctx = rescheduleContext(data, now, clock().toISOString());
    if (ctx) setBulk(previewBulkReschedule(ctx));
  };

  const card = (s: StudySession, showDate = false) => <SessionCard key={s.id} session={s} subject={subjectById.get(s.subjectId)} topic={topicById.get(s.topicId)} actions={actions} showDate={showDate} />;

  const dayTotal = (d: string) => {
    const t = totalFor(d);
    const over = t > data.availability.dailyMaxMinutes;
    return (
      <span className={`day-total ${over ? 'day-total-over' : ''}`}>
        {formatDuration(t)} of {formatDuration(data.availability.dailyMaxMinutes)} daily max{over ? ' — over the limit' : ''}
      </span>
    );
  };

  const nothingToPlan = data.subjects.length === 0 || data.topics.length === 0;
  const step = view === 'week' ? 7 : 1;

  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle="Your study sessions, day by day. Regenerating never touches completed, locked or in-progress sessions."
        actions={
          <>
            {missedCount > 0 && (
              <Button variant="secondary" icon="redo" onClick={openBulk}>
                Reschedule all missed ({missedCount})
              </Button>
            )}
            <Button variant="primary" icon="calendar" onClick={openPreview} disabled={nothingToPlan}>
              {data.sessions.length > 0 ? 'Regenerate plan' : 'Generate plan'}
            </Button>
          </>
        }
      />

      {nothingToPlan && (
        <EmptyState title="Nothing to plan yet" action={<Button variant="primary" onClick={() => navigate('/setup/subjects')}>Add subjects and topics</Button>}>
          Add at least one subject with a topic, then generate your timetable.
        </EmptyState>
      )}

      {data.conflicts.length > 0 && <ConflictList />}

      {!nothingToPlan && data.sessions.length === 0 && (
        <EmptyState title="No sessions yet" action={<Button variant="primary" onClick={openPreview}>Generate my plan</Button>}>
          StudySync will spread your topics across your free time before each exam.
        </EmptyState>
      )}

      {data.sessions.length > 0 && (
        <Card>
          <div className="toolbar" role="group" aria-label="Timetable controls">
            <div className="segmented" role="group" aria-label="View">
              {(['day', 'week', 'list'] as View[]).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
                  {v === 'day' ? 'Day' : v === 'week' ? 'Week' : 'List'}
                </button>
              ))}
            </div>
            {view !== 'list' && (
              <div className="datenav">
                <Button size="sm" variant="ghost" icon="chevronLeft" aria-label={view === 'week' ? 'Previous week' : 'Previous day'} onClick={() => setDate(addDays(date, -step))} />
                <Button size="sm" variant="secondary" onClick={() => setDate(now.date)}>Today</Button>
                <Button size="sm" variant="ghost" icon="chevronRight" aria-label={view === 'week' ? 'Next week' : 'Next day'} onClick={() => setDate(addDays(date, step))} />
              </div>
            )}
            {view !== 'list' && <TextField label="Go to date" type="date" value={date} onChange={(e) => isValidDate(e.target.value) && setDate(e.target.value)} />}
            <SelectField label="Subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectField>
            <SelectField label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{sessionStatusLabel(s)}</option>)}
            </SelectField>
            {view === 'list' && (
              <>
                <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </>
            )}
          </div>

          {view === 'day' && (
            <section aria-label={`Sessions on ${formatDate(date, { year: true })}`}>
              <div className="day-head">
                <h2>{formatDate(date, { year: true })}{date === now.date ? ' (today)' : ''}</h2>
                {dayTotal(date)}
              </div>
              {filtered.filter((s) => s.date === date).length === 0 ? (
                <EmptyState title="No sessions on this day">Use the arrows to move between days, or regenerate your plan.</EmptyState>
              ) : (
                filtered.filter((s) => s.date === date).map((s) => card(s))
              )}
            </section>
          )}

          {view === 'week' && (
            <section aria-label="Week view">
              <h2 className="sr-only">Week of {formatDate(startOfWeek(date), { year: true })}</h2>
              <div className="week-grid">
                {dateRange(startOfWeek(date), addDays(startOfWeek(date), 6)).map((d) => {
                  const list = filtered.filter((s) => s.date === d);
                  return (
                    <div key={d} className={`week-day ${d === now.date ? 'week-day-today' : ''}`}>
                      <h3>{formatDate(d)}{d === now.date ? ' · today' : ''}</h3>
                      {dayTotal(d)}
                      {list.length === 0 && <p className="muted small">No sessions</p>}
                      {list.map((s) => (
                        <button key={s.id} type="button" className="week-session" style={{ borderLeftColor: subjectById.get(s.subjectId)?.color }} onClick={() => setDetail(s)}>
                          <strong>{formatTime(s.start)}</strong> {topicById.get(s.topicId)?.title}
                          <br />
                          <span className="muted">{sessionStatusLabel(s.status)}{s.locked ? ' · locked' : ''}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {view === 'list' && (
            <section aria-label="Session list">
              <h2 className="sr-only">All sessions</h2>
              {filtered.length === 0 ? (
                <EmptyState title="No sessions match these filters">Clear a filter to see more sessions.</EmptyState>
              ) : (
                groupByDate(filtered).map(([d, list]) => (
                  <div key={d} style={{ marginBottom: 16 }}>
                    <div className="day-head">
                      <h3>{formatDate(d, { year: true })}{d === now.date ? ' (today)' : ''}</h3>
                      {dayTotal(d)}
                    </div>
                    {list.map((s) => card(s))}
                  </div>
                ))
              )}
            </section>
          )}
        </Card>
      )}

      {detail && (
        <Modal title="Session details" onClose={() => setDetail(null)} size="wide">
          {(() => {
            const live = data.sessions.find((s) => s.id === detail.id);
            return live ? card(live, true) : <p>This session no longer exists.</p>;
          })()}
        </Modal>
      )}

      {preview && <PlanPreview preview={preview} onCancel={() => setPreview(null)} onConfirm={applyPreview} />}

      {bulk && (
        <ConfirmDialog
          title="Reschedule all missed sessions?"
          confirmLabel={`Apply ${bulk.filter((o) => o.kind === 'moved').length} move(s)`}
          confirmDisabled={!bulk.some((o) => o.kind === 'moved')}
          onCancel={() => setBulk(null)}
          onConfirm={() => {
            dispatch({ type: 'applyReschedule', outcomes: bulk });
            toast.show(`Rescheduled ${bulk.filter((o) => o.kind === 'moved').length} session(s)`);
            setBulk(null);
          }}
        >
          <p>Nothing changes until you confirm. Here is what will happen:</p>
          <ul className="diff-list" aria-label="Reschedule preview">
            {bulk.map((o) => (
              <li key={o.session.id}>
                <strong>{topicById.get(o.session.topicId)?.title}</strong>: {formatDate(o.session.date)} {formatTime(o.session.start)} →{' '}
                {o.kind === 'moved' ? `${formatDate(o.to.date)} ${formatTime(o.to.start)}` : <span className="tag tag-danger">no slot before exam — stays missed</span>}
              </li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
      {actions.dialogs}
    </>
  );
}

function groupByDate(list: StudySession[]): [string, StudySession[]][] {
  const m = new Map<string, StudySession[]>();
  for (const s of list) m.set(s.date, [...(m.get(s.date) ?? []), s]);
  return [...m.entries()];
}

function PlanPreview({ preview, onCancel, onConfirm }: { preview: { plan: PlanResult; diff: PlanDiff }; onCancel: () => void; onConfirm: () => void }) {
  const { data } = useApp();
  const title = (s: StudySession) => data.topics.find((t) => t.id === s.topicId)?.title ?? 'Topic';
  const when = (s: StudySession) => `${formatDate(s.date)} ${formatTime(s.start)}`;
  const { diff, plan } = preview;
  // Conflicts can change even when no session moves (e.g. an exam before the plan start).
  const conflictsChanged = JSON.stringify(plan.conflicts) !== JSON.stringify(data.conflicts);
  const changed = hasChanges(diff) || conflictsChanged;
  const kept = data.sessions.filter((s) => s.locked || s.status === 'completed' || s.status === 'in_progress').length;
  return (
    <ConfirmDialog title="Preview plan changes" confirmLabel={changed ? 'Apply changes' : 'Close'} onCancel={onCancel} onConfirm={changed ? onConfirm : onCancel}>
      <p>Nothing changes until you apply. {kept > 0 && `${kept} completed, locked or in-progress session(s) are kept exactly as they are.`}</p>
      <ul className="list" aria-label="Change summary">
        <li className="list-item"><span>Added</span><strong data-testid="diff-added">{diff.added.length}</strong></li>
        <li className="list-item"><span>Moved</span><strong data-testid="diff-moved">{diff.moved.length}</strong></li>
        <li className="list-item"><span>Removed</span><strong data-testid="diff-removed">{diff.removed.length}</strong></li>
        <li className="list-item"><span>Unchanged</span><strong>{diff.unchanged.length}</strong></li>
      </ul>
      {!changed && <Notice level="success">Your plan is already up to date.</Notice>}
      {!hasChanges(diff) && conflictsChanged && <Notice>No sessions change, but the capacity conflict list will be updated.</Notice>}
      {diff.added.length > 0 && (
        <details>
          <summary>Added sessions</summary>
          <ul className="diff-list">{diff.added.map((s) => <li key={s.id}>{title(s)} — {when(s)} ({formatDuration(s.duration)})</li>)}</ul>
        </details>
      )}
      {diff.moved.length > 0 && (
        <details>
          <summary>Moved sessions</summary>
          <ul className="diff-list">{diff.moved.map((m) => <li key={m.after.id}>{title(m.after)} — {when(m.before)} → {when(m.after)}</li>)}</ul>
        </details>
      )}
      {diff.removed.length > 0 && (
        <details>
          <summary>Removed sessions</summary>
          <ul className="diff-list">{diff.removed.map((s) => <li key={s.id}>{title(s)} — {when(s)} ({sessionStatusLabel(s.status)})</li>)}</ul>
        </details>
      )}
      {plan.conflicts.length > 0 && (
        <Notice level="warning">
          <p>{plan.conflicts.length} topic(s) won’t fully fit before their exam ({formatDuration(plan.conflicts.reduce((t, c) => t + c.neededMinutes, 0))} unscheduled). They will be listed as capacity conflicts.</p>
        </Notice>
      )}
    </ConfirmDialog>
  );
}

function ConflictList() {
  const { data } = useApp();
  return (
    <Card title="Capacity conflicts" className="card-conflicts">
      <Notice level="danger">
        <p>Some work doesn’t fit before its exam. It is listed here so nothing is hidden.</p>
      </Notice>
      <ul className="list" aria-label="Capacity conflicts">
        {data.conflicts.map((c) => {
          const topic = data.topics.find((t) => t.id === c.topicId);
          const subject = data.subjects.find((s) => s.id === c.subjectId);
          return (
            <li key={c.topicId} className="list-item">
              <div className="list-main" style={{ alignItems: 'flex-start' }}>
                {subject && <SubjectDot color={subject.color} />}
                <div>
                  <p className="list-title">{topic?.title ?? 'Topic'} <span className="muted">({subject?.name})</span></p>
                  <p className="list-meta">
                    Needs <strong>{formatDuration(c.neededMinutes)}</strong> more · about <strong>{formatDuration(c.availableMinutes)}</strong> of study time exists before the exam in total
                    {c.reason === 'exam_before_start' && ' · exam is before the plan start'}
                    {c.reason === 'no_study_days' && ' · no study days before the exam'}
                  </p>
                  <ul className="small muted">{conflictSuggestions(c).map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
