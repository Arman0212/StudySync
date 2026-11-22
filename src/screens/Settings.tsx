import { useRef, useState } from 'react';
import { useApp } from '../state/store';
import { navigate } from '../state/router';
import type { AppData } from '../domain/types';
import { exportJson, parseJsonText } from '../storage/storage';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Modal';
import { Card, Notice, PageHeader } from '../ui/bits';
import { TextField } from '../ui/Field';
import { useToast } from '../ui/Toast';
import { downloadText } from '../ui/download';
import { Icon } from '../ui/Icon';
import { useTheme, type ThemePref } from '../ui/theme';
import { ProfileForm } from './setup/ProfileForm';
import { AvailabilityForm } from './setup/AvailabilityForm';

export function ImportExport({ importOnly = false }: { importOnly?: boolean } = {}) {
  const { data, dispatch, clock, now } = useApp();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImportError('That file is too large to be a StudySync export (over 5 MB).');
      return;
    }
    const text = await file.text();
    const r = parseJsonText(text);
    if (fileRef.current) fileRef.current.value = '';
    if (!r.ok) {
      setImportError(`Import failed: ${r.error} Your current data has not been changed.`);
      toast.show('Import failed — nothing was changed', 'error');
      return;
    }
    setPending(r.data);
  };

  return (
    <Card title={importOnly ? 'Import a backup file' : 'Export and import'} icon="drive">
      <p className="muted">{importOnly ? 'If you have an exported StudySync file, you can restore it instead.' : 'Download everything as a JSON file to back it up or move it to another browser.'}</p>
      <div className="row">
        {!importOnly && <Button variant="secondary" icon="download" onClick={() => { downloadText(`studysync-backup-${now.date}.json`, exportJson(data, clock().toISOString()), 'application/json'); toast.show('Export downloaded'); }}>
          Export data (.json)
        </Button>}
        <Button variant="secondary" icon="upload" onClick={() => fileRef.current?.click()}>Import from file…</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a StudySync JSON file to import" data-testid="import-file" tabIndex={-1} onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {importError && (
        <div style={{ marginTop: 12 }} role="alert">
          <Notice level="danger"><p>{importError}</p></Notice>
        </div>
      )}
      {pending && (
        <ConfirmDialog
          title="Replace your current data?"
          message={<p>The file contains {pending.subjects.length} subject(s), {pending.topics.length} topic(s) and {pending.sessions.length} session(s). Importing replaces everything currently in StudySync. Consider exporting your current data first.</p>}
          confirmLabel="Replace with imported data"
          destructive
          onCancel={() => setPending(null)}
          onConfirm={() => {
            dispatch({ type: 'replaceAll', data: pending, reason: 'import' });
            setPending(null);
            toast.show('Data imported');
            navigate('/dashboard');
          }}
        />
      )}
    </Card>
  );
}

export function ResetData() {
  const { resetAll } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  return (
    <Card title="Reset all data" icon="trash">
      <p className="muted">Permanently deletes your profile, subjects, topics, sessions and progress from this browser.</p>
      <Button variant="danger" icon="trash" onClick={() => { setTyped(''); setOpen(true); }}>Reset all data…</Button>
      {open && (
        <ConfirmDialog
          title="Reset all StudySync data?"
          destructive
          confirmLabel="Delete everything"
          confirmDisabled={typed.trim().toUpperCase() !== 'RESET'}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            resetAll();
            setOpen(false);
            toast.show('All data was reset', 'info');
            navigate('/');
          }}
        >
          <Notice level="danger"><p>This can’t be undone. Export your data first if you might need it.</p></Notice>
          <div style={{ marginTop: 12 }}>
            <TextField label="Type RESET to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        </ConfirmDialog>
      )}
    </Card>
  );
}

const THEMES: { id: ThemePref; label: string; icon: string; hint: string }[] = [
  { id: 'system', label: 'System', icon: 'monitor', hint: 'Match your device' },
  { id: 'light', label: 'Light', icon: 'sun', hint: 'Always light' },
  { id: 'dark', label: 'Dark', icon: 'moon', hint: 'Always dark' },
];

export function Appearance() {
  const { store } = useApp();
  const [theme, setTheme] = useTheme(store);
  return (
    <Card title="Appearance" icon="palette">
      <fieldset className="choice-group">
        <legend className="field-label">Theme</legend>
        <div className="theme-options">
          {THEMES.map((t) => (
            <label key={t.id} className="theme-option">
              <input type="radio" name="theme" value={t.id} checked={theme === t.id} onChange={() => setTheme(t.id)} />
              <span className="theme-option-icon">
                <Icon name={t.icon} size={20} />
              </span>
              <span className="theme-option-text">
                <span className="theme-option-label">{t.label}</span>
                <span className="theme-option-hint">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted small" style={{ marginTop: 12 }}>Saved in this browser only.</p>
    </Card>
  );
}

export function Settings() {
  return (
    <>
      <PageHeader title="Settings & data" subtitle="Your profile, preferences and data." />
      <div className="grid-2">
        <Card title="Profile" icon="graduation">
          <ProfileForm />
        </Card>
        <div className="stack-cards">
          <Appearance />
          <Card title="Privacy" icon="shield">
            <p>Your data stays in this browser. StudySync has no account, no server and no analytics, and it never sends your data or prompts anywhere.</p>
            <p className="muted small">Clearing your browser’s site data will delete it, so export a backup now and then.</p>
          </Card>
        </div>
      </div>
      <Card title="Study preferences" icon="clock" className="section-gap">
        <AvailabilityForm />
      </Card>
      <div className="grid-2 section-gap">
        <ImportExport />
        <ResetData />
      </div>
    </>
  );
}
