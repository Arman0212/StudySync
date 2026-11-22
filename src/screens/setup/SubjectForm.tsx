import { useState, type FormEvent } from 'react';
import { useApp } from '../../state/store';
import type { Subject } from '../../domain/types';
import { SUBJECT_COLORS } from '../../domain/types';
import { SUBJECT_OPTIONS } from '../../ui/subjectColors';
import { validateSubject, subjectWarnings, hasErrors, type Errors } from '../../domain/validation';
import { formatTime, parseTime } from '../../domain/dates';
import { newId } from '../../state/ids';
import { Choice, ChoiceGroup, TextField } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import { useSubmitGuard } from '../../ui/useGuard';

interface Draft {
  id: string;
  name: string;
  examDate: string;
  examStart: string;
  priority: Subject['priority'];
  color: string;
}

export function SubjectForm({ subject, onDone }: { subject?: Subject; onDone?: () => void }) {
  const { data, dispatch } = useApp();
  const fresh = (): Draft => ({ id: newId('sub'), name: '', examDate: '', examStart: '', priority: 'normal', color: SUBJECT_COLORS[data.subjects.length % SUBJECT_COLORS.length]!.value });
  const [d, setD] = useState<Draft>(() =>
    subject ? { id: subject.id, name: subject.name, examDate: subject.examDate, examStart: subject.examStart != null ? formatTime(subject.examStart) : '', priority: subject.priority, color: subject.color } : fresh(),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<{ subject: Subject; warnings: string[] } | null>(null);
  const [busy, guard] = useSubmitGuard();
  const toast = useToast();

  const save = (s: Subject) => {
    dispatch({ type: 'upsertSubject', subject: s });
    toast.show(subject ? 'Subject updated' : `Added ${s.name}`);
    setPending(null);
    if (!subject) setD(fresh());
    onDone?.();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void guard(() => {
      const s: Subject = {
        id: d.id,
        name: d.name.trim(),
        examDate: d.examDate,
        examStart: d.examStart ? (parseTime(d.examStart) ?? Number.NaN) : null,
        priority: d.priority,
        color: d.color,
      };
      const errs = validateSubject(s, data.subjects);
      setErrors(errs);
      if (hasErrors(errs)) return false;
      const warnings = subjectWarnings(s, data.profile?.planStart);
      if (warnings.length > 0) {
        setPending({ subject: s, warnings });
        return false;
      }
      save(s);
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-label={subject ? `Edit subject ${subject.name}` : 'New subject'}>
      <div className="form-grid">
        <TextField label="Subject name" required value={d.name} placeholder="e.g. Linear Algebra" onChange={(e) => setD({ ...d, name: e.target.value })} error={errors.name} maxLength={80} />
        <TextField label="Exam date" type="date" required value={d.examDate} onChange={(e) => setD({ ...d, examDate: e.target.value })} error={errors.examDate} />
        <TextField label="Exam start time (optional)" type="time" value={d.examStart} onChange={(e) => setD({ ...d, examStart: e.target.value })} error={errors.examStart} hint="Without a time, no study is planned on the exam day." />
      </div>
      <ChoiceGroup legend="Priority">
        <Choice type="radio" name={`priority-${d.id}`} label="Normal" checked={d.priority === 'normal'} onChange={() => setD({ ...d, priority: 'normal' })} />
        <Choice type="radio" name={`priority-${d.id}`} label="High" checked={d.priority === 'high'} onChange={() => setD({ ...d, priority: 'high' })} />
      </ChoiceGroup>
      <fieldset className="choice-group">
        <legend className="field-label">Colour</legend>
        <div className="choice-row" role="radiogroup" aria-label="Subject colour">
          {SUBJECT_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={d.color === c.value}
              aria-label={c.name}
              title={c.name}
              className="color-swatch"
              style={{ background: c.color }}
              onClick={() => setD({ ...d, color: c.value })}
            >
              {d.color === c.value && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-actions">
        {onDone && subject && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {subject ? 'Save subject' : 'Add subject'}
        </Button>
      </div>
      {pending && (
        <ConfirmDialog
          title="Exam date is before your plan start"
          message={
            <>
              {pending.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
              <p>If you save it anyway, its topics will appear as a capacity conflict instead of being scheduled. You can also change the exam date or move your plan start earlier.</p>
            </>
          }
          confirmLabel="Save anyway"
          cancelLabel="Go back and fix"
          onCancel={() => setPending(null)}
          onConfirm={() => save(pending.subject)}
        />
      )}
    </form>
  );
}
