import { useMemo, useState, type FormEvent } from 'react';
import { useApp, browserTimezone } from '../../state/store';
import type { Profile } from '../../domain/types';
import { validateProfile, hasErrors, type Errors } from '../../domain/validation';
import { TextField, SelectField } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useSubmitGuard } from '../../ui/useGuard';

function timezones(current: string): string[] {
  let list: string[];
  try {
    const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    list = intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : [];
  } catch {
    list = [];
  }
  const set = new Set([...list, current, 'UTC']);
  return [...set].sort();
}

export function ProfileForm({ onSaved, submitLabel = 'Save profile' }: { onSaved?: () => void; submitLabel?: string }) {
  const { data, dispatch, now } = useApp();
  const [form, setForm] = useState<Profile>(() => data.profile ?? { displayName: '', institution: '', timezone: browserTimezone(), planStart: now.date });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, guard] = useSubmitGuard();
  const toast = useToast();
  const zones = useMemo(() => timezones(form.timezone), [form.timezone]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void guard(() => {
      const clean = { ...form, displayName: form.displayName.trim(), institution: form.institution.trim() };
      const errs = validateProfile(clean);
      setErrors(errs);
      if (hasErrors(errs)) return false;
      dispatch({ type: 'setProfile', profile: clean });
      toast.show('Profile saved');
      onSaved?.();
    });
  };

  return (
    <form className="form" onSubmit={submit} noValidate aria-label="Profile">
      <div className="form-grid">
        <TextField label="Display name (optional)" value={form.displayName} maxLength={60} autoComplete="given-name" onChange={(e) => setForm({ ...form, displayName: e.target.value })} error={errors.displayName} hint="Used for your greeting." />
        <TextField label="Institution or course (optional)" value={form.institution} maxLength={100} onChange={(e) => setForm({ ...form, institution: e.target.value })} error={errors.institution} />
        <SelectField label="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} error={errors.timezone} hint="Defaults to your browser’s timezone.">
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </SelectField>
        <TextField label="Plan start date" type="date" required value={form.planStart} onChange={(e) => setForm({ ...form, planStart: e.target.value })} error={errors.planStart} />
      </div>
      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
