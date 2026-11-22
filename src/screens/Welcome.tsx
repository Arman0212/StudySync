import { useEffect, useState } from 'react';
import { useApp } from '../state/store';
import { navigate } from '../state/router';
import { buildDemoData } from '../state/demo';
import { newId } from '../state/ids';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';
import { Illustration } from '../ui/Illustration';
import { ConfirmDialog } from '../ui/Modal';
import { useToast } from '../ui/Toast';

export function Welcome() {
  const { dispatch, now, timezone } = useApp();
  const toast = useToast();
  const [confirmDemo, setConfirmDemo] = useState(false);
  useEffect(() => {
    document.title = 'Welcome · StudySync';
  }, []);

  const loadDemo = () => {
    dispatch({ type: 'replaceAll', reason: 'demo', data: buildDemoData(now, timezone, () => newId('s')) });
    setConfirmDemo(false);
    toast.show('Demo data loaded. Everything shown is fictional.', 'info');
    navigate('/dashboard');
  };

  return (
    <main id="main" className="welcome">
      <div className="welcome-hero">
        <div className="welcome-top">
          <div>
            <Logo />
            <h1 className="welcome-title">Welcome to StudySync</h1>
            <p className="welcome-lead">Turn a busy exam season into a calm, realistic day-by-day study plan.</p>
          </div>
          <Illustration name="calendar" className="welcome-art" />
        </div>
        <ul className="welcome-points">
          <li><span className="welcome-point-icon"><Icon name="layers" /></span> Tell us your subjects, exam dates and topics, and when you can study.</li>
          <li><span className="welcome-point-icon"><Icon name="calendar" /></span> Get a timetable that respects your hours, breaks and commitments — and adapts when you miss a session.</li>
          <li><span className="welcome-point-icon"><Icon name="progress" /></span> See honest progress and build mock-test prompts to paste into ChatGPT or Claude.</li>
          <li><span className="welcome-point-icon"><Icon name="offline" /></span> Works offline. No account, no login — your data stays in this browser.</li>
        </ul>
        <div className="row">
          <Button variant="primary" icon="plus" onClick={() => navigate('/setup/profile')}>
            Create my plan
          </Button>
          <Button variant="secondary" icon="sparkles" onClick={() => setConfirmDemo(true)}>
            Load demo data
          </Button>
        </div>
        <p className="muted small welcome-foot">Demo data is fictional and clearly labelled. You can reset it at any time.</p>
      </div>
      {confirmDemo && (
        <ConfirmDialog
          title="Load demo data?"
          message={<p>This fills StudySync with a <strong>fictional</strong> student, subjects and timetable so you can explore. It is labelled as demo data everywhere, and you can reset it from Settings.</p>}
          confirmLabel="Load demo data"
          onConfirm={loadDemo}
          onCancel={() => setConfirmDemo(false)}
        />
      )}
    </main>
  );
}
