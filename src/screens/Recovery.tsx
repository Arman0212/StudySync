import { useEffect, useState } from 'react';
import { useApp } from '../state/store';
import { navigate } from '../state/router';
import { Button } from '../ui/Button';
import { Card, Notice } from '../ui/bits';
import { ConfirmDialog } from '../ui/Modal';
import { TextField } from '../ui/Field';
import { Logo } from '../ui/Logo';
import { downloadText } from '../ui/download';
import { ImportExport } from './Settings';

/** Shown when saved data is damaged or from an unsupported version. Nothing is overwritten until the student chooses. */
export function Recovery() {
  const { recovery, resetAll, now } = useApp();
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  useEffect(() => {
    document.title = 'Data recovery · StudySync';
  }, []);
  if (!recovery) return null;
  return (
    <main id="main" className="welcome">
      <Logo />
      <h1 style={{ marginTop: 24 }}>We couldn’t read your saved data</h1>
      <Notice level="warning">
        <p>{recovery.error}</p>
        <p>Your saved data has <strong>not</strong> been changed or deleted. A raw copy has also been kept as a backup in this browser.</p>
      </Notice>
      <div className="stack" style={{ marginTop: 16 }}>
        <Card title="1. Download the raw data">
          <p className="muted">Keep a copy of exactly what was stored, so nothing is lost. You (or a helper) may be able to fix it by hand.</p>
          <Button variant="primary" icon="download" onClick={() => downloadText(`studysync-raw-backup-${now.date}.json`, recovery.raw, 'application/json')}>Download raw backup</Button>
        </Card>
        <ImportExport importOnly />
        <Card title="Start fresh">
          <p className="muted">Clears the damaged data so you can set up StudySync again. The raw backup copy is kept.</p>
          <Button variant="danger" onClick={() => { setTyped(''); setConfirm(true); }}>Reset and start fresh…</Button>
        </Card>
      </div>
      {confirm && (
        <ConfirmDialog
          title="Reset and start fresh?"
          destructive
          confirmLabel="Reset data"
          confirmDisabled={typed.trim().toUpperCase() !== 'RESET'}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            resetAll();
            setConfirm(false);
            navigate('/');
          }}
        >
          <p>Make sure you’ve downloaded the raw backup if you might need it.</p>
          <TextField label="Type RESET to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </ConfirmDialog>
      )}
    </main>
  );
}
