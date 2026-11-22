import { useState, type FormEvent } from 'react';
import { useApp } from '../../state/store';
import type { Commitment, Weekday } from '../../domain/types';
import { validateCommitment, hasErrors, type Errors } from '../../domain/validation';
import { formatDate, formatTime, parseTime, weekdayName } from '../../domain/dates';
import { newId } from '../../state/ids';
import { Choice, ChoiceGroup, TextField } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/Modal';
import { Card, EmptyState } from '../../ui/bits';
import { useToast } from '../../ui/Toast';
import { useSubmitGuard } from '../../ui/useGuard';
import { WEEK_ORDER } from './AvailabilityForm';

interface Draft {
  id: string;
  label: string;
  repeat: 'once' | 'weekly';
  date: string;
  weekdays: Weekday[];
  start: string;
  end: string;
}

const blank = (date: string): Draft => ({ id: newId('c'), label: '', repeat: 'weekly', date, weekdays: [], start: '09:00', end: '10:00' });

export function describeCommitment(c: Commitment): string {
  const when = c.repeat === 'once' ? (c.date ? formatDate(c.date, { year: true }) : '') : `Every ${WEEK_ORDER.filter((w) => c.weekdays?.includes(w)).map((w) => weekdayName(w)).join(', ')}`;
  return `${when} · ${formatTime(c.start)}–${formatTime(c.end)}`;
}

export function Commitments() {
  const { data, dispatch, now } = useApp();
  const [draft, setDraft] = useState<Draft>(() => blank(now.date));
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [toDelete, setToDelete] = useState<Commitment | null>(null);
  const [busy, guard] = useSubmitGuard();
  const toast = useToast();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void guard(() => {
      const c: Commitment = {
        id: draft.id,
        label: draft.label.trim(),
        repeat: draft.repeat,
        start: parseTime(draft.start) ?? Number.NaN,
        end: parseTime(draft.end) ?? Number.NaN,
        ...(draft.repeat === 'once' ? { date: draft.date } : { weekdays: [...draft.weekdays].sort() }),
      };
      const errs = validateCommitment(c);
      setErrors(errs);
      if (hasErrors(errs)) return false;
      dispatch({ type: 'upsertCommitment', commitment: c });
      toast.show(editing ? 'Commitment updated' : 'Commitment added');
      setDraft(blank(now.date));
      setEditing(false);
    });
  };

  const edit = (c: Commitment) => {
    setDraft({ id: c.id, label: c.label, repeat: c.repeat, date: c.date ?? now.date, weekdays: c.weekdays ?? [], start: formatTime(c.start), end: formatTime(c.end) });
    setEditing(true);
    setErrors({});
  };

  return (
    <div className="grid-2">
      <Card title={editing ? 'Edit commitment' : 'Add a commitment'} icon="calendarClock">
        <p className="muted">Lectures, labs, commute, tuition, work — anything that blocks study time.</p>
        <form className="form" onSubmit={submit} noValidate aria-label="Commitment">
          <TextField label="Label" required value={draft.label} placeholder="e.g. Physics lecture" onChange={(e) => setDraft({ ...draft, label: e.target.value })} error={errors.label} />
          <ChoiceGroup legend="Repeats">
            <Choice type="radio" name="repeat" label="Every week" checked={draft.repeat === 'weekly'} onChange={() => setDraft({ ...draft, repeat: 'weekly' })} />
            <Choice type="radio" name="repeat" label="One date only" checked={draft.repeat === 'once'} onChange={() => setDraft({ ...draft, repeat: 'once' })} />
          </ChoiceGroup>
          {draft.repeat === 'once' ? (
            <TextField label="Date" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} error={errors.date} />
          ) : (
            <ChoiceGroup legend="On these weekdays" error={errors.weekdays}>
              {WEEK_ORDER.map((wd) => (
                <Choice key={wd} label={weekdayName(wd)} aria-label={weekdayName(wd, true)} checked={draft.weekdays.includes(wd)} onChange={() => setDraft({ ...draft, weekdays: draft.weekdays.includes(wd) ? draft.weekdays.filter((x) => x !== wd) : [...draft.weekdays, wd] })} />
              ))}
            </ChoiceGroup>
          )}
          <div className="form-grid">
            <TextField label="Start time" type="time" required value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} error={errors.start} />
            <TextField label="End time" type="time" required value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} error={errors.end} />
          </div>
          <div className="form-actions">
            {editing && (
              <Button variant="ghost" onClick={() => { setDraft(blank(now.date)); setEditing(false); setErrors({}); }}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {editing ? 'Save changes' : 'Add commitment'}
            </Button>
          </div>
        </form>
      </Card>
      <Card title="Your commitments" icon="calendar">
        {data.commitments.length === 0 ? (
          <EmptyState compact illustration="calendar" title="No commitments yet">Add your lectures, labs or commute so study sessions never clash with them.</EmptyState>
        ) : (
          <ul className="list" aria-label="Commitments">
            {data.commitments.map((c) => (
              <li key={c.id} className="list-item">
                <div className="list-main">
                  <div>
                    <p className="list-title">{c.label}</p>
                    <p className="list-meta">{describeCommitment(c)}</p>
                  </div>
                </div>
                <div className="row">
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => edit(c)} aria-label={`Edit ${c.label}`}>Edit</Button>
                  <Button size="sm" variant="ghost" icon="trash" className="btn-danger-outline" onClick={() => setToDelete(c)} aria-label={`Delete ${c.label}`}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {toDelete && (
        <ConfirmDialog
          title="Delete commitment?"
          message={<p>“{toDelete.label}” will be removed. Regenerate your plan to use the freed time.</p>}
          confirmLabel="Delete"
          destructive
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            dispatch({ type: 'deleteCommitment', id: toDelete.id });
            toast.show('Commitment deleted');
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
