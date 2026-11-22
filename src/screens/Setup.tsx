import { useApp } from '../state/store';
import { navigate } from '../state/router';
import { Card, Notice, PageHeader } from '../ui/bits';
import { ProfileForm } from './setup/ProfileForm';
import { AvailabilityForm } from './setup/AvailabilityForm';
import { Commitments } from './setup/Commitments';
import { Subjects } from './setup/Subjects';
import { Button } from '../ui/Button';

const TABS = [
  { id: 'profile', label: '1. Profile' },
  { id: 'availability', label: '2. Availability' },
  { id: 'commitments', label: '3. Commitments' },
  { id: 'subjects', label: '4. Subjects & topics' },
] as const;

export function Setup({ tab }: { tab?: string | undefined }) {
  const { data } = useApp();
  const active = data.profile ? (TABS.find((t) => t.id === tab)?.id ?? 'profile') : 'profile';
  return (
    <>
      <PageHeader
        title="Plan setup"
        subtitle="Tell StudySync what you’re studying and when you can study."
        actions={data.subjects.length > 0 ? <Button variant="primary" icon="calendar" onClick={() => navigate('/timetable')}>Go to timetable</Button> : undefined}
      />
      <nav aria-label="Setup steps">
        <div className="tabs">
          {TABS.map((t) => (
            <a key={t.id} className="tab" href={`#/setup/${t.id}`} aria-current={active === t.id ? 'page' : undefined} aria-disabled={!data.profile && t.id !== 'profile' ? true : undefined} onClick={(e) => { if (!data.profile && t.id !== 'profile') e.preventDefault(); }}>
              {t.label}
            </a>
          ))}
        </div>
      </nav>
      {active === 'profile' && (
        <Card title="Your profile" icon="graduation">
          {!data.profile && <Notice>Start by creating a profile. Only the plan start date is required.</Notice>}
          <div style={{ marginTop: 16 }}>
            <ProfileForm submitLabel={data.profile ? 'Save profile' : 'Create profile and continue'} onSaved={() => navigate('/setup/availability')} />
          </div>
        </Card>
      )}
      {active === 'availability' && (
        <Card title="When can you study?" icon="clock">
          <AvailabilityForm onSaved={() => navigate('/setup/commitments')} />
        </Card>
      )}
      {active === 'commitments' && (
        <>
          <Commitments />
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={() => navigate('/setup/subjects')}>Continue to subjects</Button>
          </div>
        </>
      )}
      {active === 'subjects' && <Subjects />}
    </>
  );
}
