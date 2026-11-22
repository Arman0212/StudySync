import { useState, type ReactNode } from 'react';
import { useApp } from '../../state/store';
import type { StudySession } from '../../domain/types';
import { formatDate, formatDuration, formatTime, parseTime } from '../../domain/dates';
import { validateSessionEdit, hasErrors, type Errors } from '../../domain/validation';
import { placementProblems } from '../../scheduling/manual';
import { applyShorter, rescheduleSession, type RescheduleOutcome } from '../../scheduling/rescheduler';
import { rescheduleContext } from '../../state/planning';
import { Choice, ChoiceGroup, TextAreaField, TextField } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { ConfirmDialog, Modal } from '../../ui/Modal';
import { Notice } from '../../ui/bits';
import { useToast } from '../../ui/Toast';

export interface SessionActions {
  complete: (s: StudySession) => void;
  missed: (s: StudySession) => void;
  start: (s: StudySession) => void;
  edit: (s: StudySession) => void;
  toggleLock: (s: StudySession) => void;
  remove: (s: StudySession) => void;
  reschedule: (s: StudySession) => void;
  dialogs: ReactNode;
}

/** Shared session actions + their dialogs (used by the timetable and dashboard). */
export function useSessionActions(): SessionActions {
  const { data, dispatch, now, clock } = useApp();
  const toast = useToast();
  const [completing, setCompleting] = useState<StudySession | null>(null);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [deleting, setDeleting] = useState<StudySession | null>(null);
  const [conflict, setConflict] = useState<Extract<RescheduleOutcome, { kind: 'conflict' }> | null>(null);
  const topicTitle = (s: StudySession) => data.topics.find((t) => t.id === s.topicId)?.title ?? 'Topic';

  const reschedule = (s: StudySession) => {
    const ctx = rescheduleContext(data, now, clock().toISOString());
    if (!ctx) return;
    const out = rescheduleSession(s.id, ctx);
    if (!out) return;
    if (out.kind === 'moved') {
      dispatch({ type: 'applyReschedule', outcomes: [out] });
      toast.show(`Moved “${topicTitle(s)}” to ${formatDate(out.to.date)} at ${formatTime(out.to.start)}`);
    } else {
      setConflict(out);
    }
  };

  const missed = (s: StudySession) => {
    dispatch({ type: 'markMissed', id: s.id });
    toast.show(`Marked “${topicTitle(s)}” as missed`, 'info', s.locked ? undefined : { label: 'Reschedule', onClick: () => reschedule({ ...s, status: 'missed' }) });
  };

  const dialogs = (
    <>
      {completing && <CompleteDialog session={completing} title={topicTitle(completing)} onClose={() => setCompleting(null)} />}
      {editing && <EditDialog session={editing} title={topicTitle(editing)} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Delete this session?"
          message={<p>“{topicTitle(deleting)}” on {formatDate(deleting.date)} at {formatTime(deleting.start)} will be removed. The topic itself is kept; regenerate the plan to re-plan its time.</p>}
          confirmLabel="Delete session"
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            dispatch({ type: 'deleteSession', id: deleting.id });
            toast.show('Session deleted');
            setDeleting(null);
          }}
        />
      )}
      {conflict && (
        <Modal
          title="No free slot before the exam"
          onClose={() => setConflict(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => { setConflict(null); toast.show('Kept as missed', 'info'); }}>Keep as missed</Button>
              {conflict.choices.includes('delete') && (
                <Button variant="danger" onClick={() => { dispatch({ type: 'deleteSession', id: conflict.session.id }); setConflict(null); toast.show('Session deleted'); }}>Delete session</Button>
              )}
              {conflict.shorterOption && (
                <Button
                  variant="primary"
                  onClick={() => {
                    const ctx = rescheduleContext(data, now, clock().toISOString());
                    const s = ctx && applyShorter(conflict, ctx);
                    if (s) dispatch({ type: 'replaceSession', session: s, reason: 'Rescheduled (shortened)' });
                    setConflict(null);
                    toast.show('Rescheduled as a shorter session');
                  }}
                >
                  Use a {formatDuration(conflict.shorterOption.duration)} slot
                </Button>
              )}
            </>
          }
        >
          <Notice level="warning">
            <p>{conflict.reason}</p>
          </Notice>
          <p style={{ marginTop: 12 }}>StudySync never moves work past an exam. You can choose:</p>
          <ul>
            {conflict.shorterOption && <li>Use a shorter {formatDuration(conflict.shorterOption.duration)} slot on {formatDate(conflict.shorterOption.date)} at {formatTime(conflict.shorterOption.start)}.</li>}
            <li>Keep it as missed (it will not count as done).</li>
            <li>Delete the session.</li>
            <li>Or free up time: raise your daily maximum, widen your study hours or remove a commitment.</li>
          </ul>
        </Modal>
      )}
    </>
  );

  return {
    complete: setCompleting,
    missed,
    start: (s) => {
      dispatch({ type: 'startSession', id: s.id });
      toast.show('Session started — good luck!', 'info');
    },
    edit: setEditing,
    toggleLock: (s) => {
      dispatch({ type: 'toggleLock', id: s.id });
      toast.show(s.locked ? 'Session unlocked' : 'Session locked — regeneration will keep it as is', 'info');
    },
    remove: setDeleting,
    reschedule,
    dialogs,
  };
}

function CompleteDialog({ session, title, onClose }: { session: StudySession; title: string; onClose: () => void }) {
  const { data, dispatch } = useApp();
  const toast = useToast();
  const [actual, setActual] = useState(String(session.actualMinutes ?? session.duration));
  const [note, setNote] = useState(session.note ?? '');
  const others = data.sessions.filter((s) => s.topicId === session.topicId && s.id !== session.id && s.status !== 'completed' && s.status !== 'missed').length;
  const [topicDone, setTopicDone] = useState<'yes' | 'no' | ''>(others === 0 ? '' : 'no');
  const [error, setError] = useState<string | undefined>();
  const [choiceError, setChoiceError] = useState<string | undefined>();

  const confirm = () => {
    const n = actual.trim() === '' ? null : Number(actual);
    if (n != null && (!Number.isFinite(n) || n < 0 || n > 24 * 60)) {
      setError('Enter the minutes you actually studied (0–1440), or leave it blank.');
      return;
    }
    if (!topicDone) {
      setChoiceError('Please tell us whether the topic is now done.');
      return;
    }
    dispatch({ type: 'completeSession', id: session.id, actualMinutes: n == null ? null : Math.round(n), note: note.trim(), topicDone: topicDone === 'yes' });
    toast.show(topicDone === 'yes' ? `Session done and “${title}” marked complete` : 'Session marked complete');
    onClose();
  };

  return (
    <Modal
      title="Mark session complete"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={confirm}>Save</Button>
        </>
      }
    >
      <div className="form">
        <p>
          <strong>{title}</strong> · planned {formatDuration(session.duration)}
        </p>
        <TextField label="Actual minutes studied" type="number" inputMode="numeric" min={0} value={actual} onChange={(e) => setActual(e.target.value)} error={error} hint="Tracked separately from the estimate." />
        <TextAreaField label="Note (optional)" value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />
        <ChoiceGroup legend={`Is “${title}” now completely done?`} error={choiceError}>
          <Choice type="radio" name="topic-done" label="Yes, topic completed" checked={topicDone === 'yes'} onChange={() => setTopicDone('yes')} />
          <Choice type="radio" name="topic-done" label="Not yet" checked={topicDone === 'no'} onChange={() => setTopicDone('no')} />
        </ChoiceGroup>
        {others > 0 && <p className="muted small">This topic has {others} other planned session{others === 1 ? '' : 's'}.</p>}
      </div>
    </Modal>
  );
}

function EditDialog({ session, title, onClose }: { session: StudySession; title: string; onClose: () => void }) {
  const { data, dispatch } = useApp();
  const toast = useToast();
  const [date, setDate] = useState(session.date);
  const [start, setStart] = useState(formatTime(session.start));
  const [duration, setDuration] = useState(String(session.duration));
  const [errors, setErrors] = useState<Errors>({});
  const [problems, setProblems] = useState<string[]>([]);

  const save = () => {
    const p = { start: parseTime(start) ?? Number.NaN, duration: duration.trim() === '' ? Number.NaN : Number(duration) };
    const errs = validateSessionEdit(p, data.availability);
    if (!date) errs.date = 'Choose a date.';
    setErrors(errs);
    if (hasErrors(errs)) return;
    const probs = placementProblems({ id: session.id, subjectId: session.subjectId, date, start: p.start, duration: Math.round(p.duration) }, data);
    setProblems(probs);
    if (probs.length > 0) return;
    dispatch({ type: 'editSession', id: session.id, date, start: p.start, duration: Math.round(p.duration) });
    toast.show('Session updated');
    onClose();
  };

  return (
    <Modal
      title="Edit session"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="form">
        <p><strong>{title}</strong></p>
        <div className="form-grid">
          <TextField label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
          <TextField label="Start time" type="time" required value={start} onChange={(e) => setStart(e.target.value)} error={errors.start} />
          <TextField label="Duration (minutes)" type="number" inputMode="numeric" min={1} required value={duration} onChange={(e) => setDuration(e.target.value)} error={errors.duration} />
        </div>
        {problems.length > 0 && (
          <Notice level="danger">
            <p>This time doesn’t work:</p>
            <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </Notice>
        )}
      </div>
    </Modal>
  );
}
