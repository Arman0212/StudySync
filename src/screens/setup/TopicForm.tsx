import { useState, type FormEvent } from 'react';
import { useApp } from '../../state/store';
import type { Topic } from '../../domain/types';
import { validateTopic, hasErrors, type Errors } from '../../domain/validation';
import { formatDuration } from '../../domain/dates';
import { newId } from '../../state/ids';
import { SelectField, TextAreaField, TextField } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useSubmitGuard } from '../../ui/useGuard';

interface Draft {
  id: string;
  title: string;
  notes: string;
  difficulty: Topic['difficulty'];
  importance: Topic['importance'];
  estimatedMinutes: string;
  status: Topic['status'];
  confidence: string;
}

export function TopicForm({ subjectId, topic, onDone }: { subjectId: string; topic?: Topic; onDone?: () => void }) {
  const { data, dispatch } = useApp();
  const fresh = (): Draft => ({ id: newId('top'), title: '', notes: '', difficulty: 'moderate', importance: 'medium', estimatedMinutes: '60', status: 'not_started', confidence: '' });
  const [d, setD] = useState<Draft>(() =>
    topic
      ? { id: topic.id, title: topic.title, notes: topic.notes, difficulty: topic.difficulty, importance: topic.importance, estimatedMinutes: String(topic.estimatedMinutes), status: topic.status, confidence: topic.confidence != null ? String(topic.confidence) : '' }
      : fresh(),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [busy, guard] = useSubmitGuard();
  const toast = useToast();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void guard(() => {
      const t: Topic = {
        id: d.id,
        subjectId,
        title: d.title.trim(),
        notes: d.notes.trim(),
        difficulty: d.difficulty,
        importance: d.importance,
        estimatedMinutes: d.estimatedMinutes.trim() === '' ? Number.NaN : Math.round(Number(d.estimatedMinutes)),
        status: d.status,
        confidence: d.confidence ? Number(d.confidence) : null,
        order: topic?.order ?? data.topics.reduce((m, x) => Math.max(m, x.order + 1), 0),
      };
      const errs = validateTopic(t);
      setErrors(errs);
      if (hasErrors(errs)) return;
      dispatch({ type: 'upsertTopic', topic: t });
      toast.show(topic ? 'Topic updated' : `Added topic “${t.title}”`);
      if (!topic) setD(fresh());
      onDone?.();
    });
  };

  const mins = Number(d.estimatedMinutes);
  return (
    <form className="form" onSubmit={submit} noValidate aria-label={topic ? `Edit topic ${topic.title}` : 'New topic'}>
      <div className="form-grid">
        <TextField label="Topic title" required value={d.title} placeholder="e.g. Eigenvalues" onChange={(e) => setD({ ...d, title: e.target.value })} error={errors.title} maxLength={120} />
        <TextField label="Estimated study time (minutes)" type="number" inputMode="numeric" min={1} step={5} required value={d.estimatedMinutes} onChange={(e) => setD({ ...d, estimatedMinutes: e.target.value })} error={errors.estimatedMinutes} hint={Number.isFinite(mins) && mins > 0 ? `= ${formatDuration(mins)}` : undefined} />
        <SelectField label="Difficulty" value={d.difficulty} onChange={(e) => setD({ ...d, difficulty: e.target.value as Topic['difficulty'] })}>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </SelectField>
        <SelectField label="Importance" value={d.importance} onChange={(e) => setD({ ...d, importance: e.target.value as Topic['importance'] })}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </SelectField>
        <SelectField label="Status" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as Topic['status'] })}>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </SelectField>
        <SelectField label="Confidence (optional)" value={d.confidence} onChange={(e) => setD({ ...d, confidence: e.target.value })} error={errors.confidence}>
          <option value="">Not rated</option>
          <option value="1">1 — very unsure</option>
          <option value="2">2 — unsure</option>
          <option value="3">3 — okay</option>
          <option value="4">4 — fairly confident</option>
          <option value="5">5 — very confident</option>
        </SelectField>
      </div>
      <TextAreaField label="Notes (optional)" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} error={errors.notes} maxLength={1000} rows={2} />
      <div className="form-actions">
        {onDone && topic && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {topic ? 'Save topic' : 'Add topic'}
        </Button>
      </div>
    </form>
  );
}
