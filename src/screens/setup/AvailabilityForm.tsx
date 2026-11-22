import { useState, type FormEvent } from 'react';
import { useApp } from '../../state/store';
import type { Availability, Weekday } from '../../domain/types';
import { SESSION_LENGTH_MAX, SESSION_LENGTH_MIN } from '../../domain/types';
import { validateAvailability, hasErrors, type Errors } from '../../domain/validation';
import { formatDuration, formatTime, parseTime, weekdayName } from '../../domain/dates';
import { ChoiceGroup, Choice, TextField } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useSubmitGuard } from '../../ui/useGuard';

export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

interface Draft {
  studyDays: Weekday[];
  dayStart: string;
  dayEnd: string;
  dailyMaxMinutes: string;
  sessionLength: string;
  shortBreak: string;
  longBreak: string;
  sessionsBeforeLongBreak: string;
}

const toDraft = (a: Availability): Draft => ({
  studyDays: [...a.studyDays],
  dayStart: formatTime(a.dayStart),
  dayEnd: formatTime(a.dayEnd),
  dailyMaxMinutes: String(a.dailyMaxMinutes),
  sessionLength: String(a.sessionLength),
  shortBreak: String(a.shortBreak),
  longBreak: String(a.longBreak),
  sessionsBeforeLongBreak: String(a.sessionsBeforeLongBreak),
});

const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));

export function AvailabilityForm({ onSaved }: { onSaved?: () => void }) {
  const { data, dispatch } = useApp();
  const [d, setD] = useState<Draft>(() => toDraft(data.availability));
  const [errors, setErrors] = useState<Errors>({});
  const [busy, guard] = useSubmitGuard();
  const toast = useToast();

  const toggleDay = (wd: Weekday) => setD({ ...d, studyDays: d.studyDays.includes(wd) ? d.studyDays.filter((x) => x !== wd) : [...d.studyDays, wd] });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void guard(() => {
      const a: Availability = {
        studyDays: [...d.studyDays].sort(),
        dayStart: parseTime(d.dayStart) ?? Number.NaN,
        dayEnd: parseTime(d.dayEnd) ?? Number.NaN,
        dailyMaxMinutes: num(d.dailyMaxMinutes),
        sessionLength: num(d.sessionLength),
        shortBreak: num(d.shortBreak),
        longBreak: num(d.longBreak),
        sessionsBeforeLongBreak: num(d.sessionsBeforeLongBreak),
      };
      const errs = validateAvailability(a);
      setErrors(errs);
      if (hasErrors(errs)) return;
      dispatch({ type: 'setAvailability', availability: a });
      toast.show('Availability saved');
      onSaved?.();
    });
  };

  const maxMin = num(d.dailyMaxMinutes);
  return (
    <form className="form" onSubmit={submit} noValidate aria-label="Availability">
      <ChoiceGroup legend="Study days" error={errors.studyDays}>
        {WEEK_ORDER.map((wd) => (
          <Choice key={wd} label={weekdayName(wd)} aria-label={weekdayName(wd, true)} checked={d.studyDays.includes(wd)} onChange={() => toggleDay(wd)} />
        ))}
      </ChoiceGroup>
      <div className="form-grid">
        <TextField label="Daily start time" type="time" required value={d.dayStart} onChange={(e) => setD({ ...d, dayStart: e.target.value })} error={errors.dayStart} />
        <TextField label="Daily end time" type="time" required value={d.dayEnd} onChange={(e) => setD({ ...d, dayEnd: e.target.value })} error={errors.dayEnd} />
        <TextField label="Daily maximum focused study (minutes)" type="number" inputMode="numeric" min={1} step={5} required value={d.dailyMaxMinutes} onChange={(e) => setD({ ...d, dailyMaxMinutes: e.target.value })} error={errors.dailyMaxMinutes} hint={Number.isFinite(maxMin) && maxMin > 0 ? `= ${formatDuration(maxMin)} per day` : undefined} />
        <TextField label="Preferred session length (minutes)" type="number" inputMode="numeric" min={SESSION_LENGTH_MIN} max={SESSION_LENGTH_MAX} required value={d.sessionLength} onChange={(e) => setD({ ...d, sessionLength: e.target.value })} error={errors.sessionLength} hint={`Between ${SESSION_LENGTH_MIN} and ${SESSION_LENGTH_MAX}. 50 is a good default.`} />
        <TextField label="Short break between sessions (minutes)" type="number" inputMode="numeric" min={0} max={60} required value={d.shortBreak} onChange={(e) => setD({ ...d, shortBreak: e.target.value })} error={errors.shortBreak} />
        <TextField label="Longer break (minutes)" type="number" inputMode="numeric" min={0} max={180} required value={d.longBreak} onChange={(e) => setD({ ...d, longBreak: e.target.value })} error={errors.longBreak} />
        <TextField label="Longer break after every … sessions" type="number" inputMode="numeric" min={1} max={10} required value={d.sessionsBeforeLongBreak} onChange={(e) => setD({ ...d, sessionsBeforeLongBreak: e.target.value })} error={errors.sessionsBeforeLongBreak} />
      </div>
      <div className="form-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          Save availability
        </Button>
      </div>
    </form>
  );
}
