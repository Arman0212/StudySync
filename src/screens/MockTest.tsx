import { useMemo, useRef, useState } from 'react';
import { useApp } from '../state/store';
import type { MockDifficulty, MockTestConfig, QuestionType } from '../domain/types';
import { buildPrompt, defaultMockConfig, QUESTION_PRESETS, QUESTION_TYPE_LABEL } from '../prompts';
import { newId } from '../state/ids';
import { Button } from '../ui/Button';
import { Choice, ChoiceGroup, SelectField, TextAreaField, TextField, FieldShell } from '../ui/Field';
import { Card, EmptyState, Notice, PageHeader } from '../ui/bits';
import { useToast } from '../ui/Toast';
import { downloadText } from '../ui/download';
import { useSubmitGuard } from '../ui/useGuard';

const TYPES: QuestionType[] = ['mcq', 'short', 'long', 'numerical', 'case'];

export function MockTest() {
  const { data, dispatch } = useApp();
  const toast = useToast();
  const subjects = data.subjects;
  const initial = useMemo<MockTestConfig | null>(() => {
    if (data.mockConfig && subjects.some((s) => s.id === data.mockConfig!.subjectId)) return data.mockConfig;
    return subjects[0] ? defaultMockConfig(subjects[0], data.topics) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [config, setConfigState] = useState<MockTestConfig | null>(initial);
  // Save the configuration (not the prompt) whenever it is complete enough to reuse.
  const setConfig = (c: MockTestConfig) => {
    setConfigState(c);
    if (c.topicIds.length > 0 && c.questionTypes.length > 0 && c.questionCount > 0) dispatch({ type: 'setMockConfig', config: c });
  };
  const [customCount, setCustomCount] = useState(() => (initial && !QUESTION_PRESETS.includes(initial.questionCount as 5) ? String(initial.questionCount) : ''));
  const subject = subjects.find((s) => s.id === config?.subjectId);
  const generated = useMemo(() => (config && subject ? buildPrompt(config, subject, data.topics) : ''), [config, subject, data.topics]);
  const [text, setText] = useState(generated);
  const [manualCopy, setManualCopy] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(generated);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // When the settings change, the editable prompt text is rebuilt from them.
  if (generated !== lastGenerated) {
    setLastGenerated(generated);
    setText(generated);
    setManualCopy(false);
  }

  if (!config || !subject) {
    return (
      <>
        <PageHeader title="Mock-test prompt builder" />
        <EmptyState title="Add a subject first" illustration="exam" action={<a className="btn btn-primary" href="#/setup/subjects">Add subjects</a>}>The builder writes a prompt based on your subjects and topics.</EmptyState>
      </>
    );
  }

  const topics = data.topics.filter((t) => t.subjectId === subject.id).sort((a, b) => a.order - b.order);
  const errors = {
    topics: config.topicIds.length === 0 ? 'Choose at least one topic.' : undefined,
    types: config.questionTypes.length === 0 ? 'Choose at least one question type.' : undefined,
    count: !Number.isInteger(config.questionCount) || config.questionCount < 1 || config.questionCount > 100 ? 'Enter between 1 and 100 questions.' : undefined,
  };
  const valid = !errors.topics && !errors.types && !errors.count;

  const copy = async () => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('unavailable');
      await navigator.clipboard.writeText(text);
      setManualCopy(false);
      toast.show('Prompt copied to clipboard');
    } catch {
      setManualCopy(true);
      areaRef.current?.focus();
      areaRef.current?.select();
    }
  };

  const setSubject = (id: string) => {
    const s = subjects.find((x) => x.id === id);
    if (s) setConfig({ ...defaultMockConfig(s, data.topics), questionCount: config.questionCount, difficulty: config.difficulty, questionTypes: config.questionTypes });
  };

  const presetValue = QUESTION_PRESETS.includes(config.questionCount as 5) && customCount === '' ? String(config.questionCount) : 'custom';

  return (
    <>
      <PageHeader title="Mock-test prompt builder" subtitle="Build a prompt to paste into ChatGPT, Claude or another assistant." />
      <Notice>
        <p>
          <strong>StudySync does not generate questions or contact any AI.</strong> It only writes a prompt for you to copy into an assistant of your choice. The questions and grading come from that assistant, so check them against your course material.
        </p>
      </Notice>
      <div className="mock-layout">
        <Card title="Settings" icon="settings" className="mock-settings">
          <div className="form">
            <SelectField label="Subject" required value={config.subjectId} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </SelectField>
            <ChoiceGroup legend="Topics to cover" error={errors.topics}>
              {topics.length === 0 && <p className="muted">This subject has no topics yet.</p>}
              {topics.map((t) => (
                <Choice key={t.id} label={t.title} checked={config.topicIds.includes(t.id)} onChange={() => setConfig({ ...config, topicIds: config.topicIds.includes(t.id) ? config.topicIds.filter((x) => x !== t.id) : [...config.topicIds, t.id] })} />
              ))}
            </ChoiceGroup>
            <div className="form-grid">
              <SelectField
                label="Number of questions"
                value={presetValue}
                onChange={(e) => {
                  if (e.target.value === 'custom') setCustomCount(String(config.questionCount));
                  else {
                    setCustomCount('');
                    setConfig({ ...config, questionCount: Number(e.target.value) });
                  }
                }}
              >
                {QUESTION_PRESETS.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="custom">Custom…</option>
              </SelectField>
              {presetValue === 'custom' && (
                <TextField label="Custom number of questions" type="number" min={1} max={100} value={customCount} error={errors.count} onChange={(e) => { setCustomCount(e.target.value); setConfig({ ...config, questionCount: e.target.value === '' ? 0 : Number(e.target.value) }); }} />
              )}
              <SelectField label="Difficulty" value={config.difficulty} onChange={(e) => setConfig({ ...config, difficulty: e.target.value as MockDifficulty })}>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
                <option value="mixed">Mixed</option>
              </SelectField>
            </div>
            <ChoiceGroup legend="Question types" error={errors.types}>
              {TYPES.map((q) => (
                <Choice key={q} label={QUESTION_TYPE_LABEL[q][0]!.toUpperCase() + QUESTION_TYPE_LABEL[q].slice(1)} checked={config.questionTypes.includes(q)} onChange={() => setConfig({ ...config, questionTypes: config.questionTypes.includes(q) ? config.questionTypes.filter((x) => x !== q) : [...config.questionTypes, q] })} />
              ))}
            </ChoiceGroup>
            <div className="form-grid">
              <TextField label="Total marks (optional)" type="number" min={1} value={config.totalMarks ?? ''} onChange={(e) => setConfig({ ...config, totalMarks: e.target.value ? Number(e.target.value) : null })} />
              <TextField label="Time limit in minutes (optional)" type="number" min={1} value={config.timeLimitMinutes ?? ''} onChange={(e) => setConfig({ ...config, timeLimitMinutes: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <TextAreaField label="Marking scheme (optional)" rows={2} value={config.markingScheme} onChange={(e) => setConfig({ ...config, markingScheme: e.target.value })} placeholder="e.g. +4 / −1 for multiple choice" />
            <TextAreaField label="Exam-style instructions (optional)" rows={2} value={config.examInstructions} onChange={(e) => setConfig({ ...config, examInstructions: e.target.value })} placeholder="e.g. Answer any 5 of 7 long questions" />
            <p className="muted small">Your settings are saved automatically for next time.</p>
          </div>
        </Card>
        <Card title="Your prompt" icon="file" className="prompt-card">
          <div className="paper">
            <div className="paper-head" aria-hidden="true">
              <span className="paper-chip">{subject.name}</span>
              <span className="paper-meta">
                {config.questionCount || '–'} questions · {config.difficulty}
                {config.timeLimitMinutes ? ` · ${config.timeLimitMinutes} min` : ''}
              </span>
            </div>
            <FieldShell label="Prompt text (you can edit it)" hint={valid ? undefined : 'Fix the settings to get a complete prompt.'}>
              {({ id, describedBy }) => <textarea ref={areaRef} id={id} aria-describedby={describedBy} className="input textarea prompt-area" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />}
            </FieldShell>
          </div>
          <div className="row prompt-actions">
            <Button variant="primary" icon="copy" onClick={() => void copy()} disabled={!valid}>Copy</Button>
            <Button variant="secondary" icon="download" disabled={!valid} onClick={() => { downloadText(`studysync-mock-test-${subject.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`, text); toast.show('Prompt downloaded'); }}>Download .txt</Button>
            <Button variant="ghost" icon="redo" onClick={() => { setText(generated); setManualCopy(false); toast.show('Prompt reset', 'info'); }}>Reset</Button>
          </div>
          {manualCopy && (
            <div style={{ marginTop: 12 }}>
              <Notice level="warning">
                <p>
                  <strong>Copying isn’t available in this browser.</strong> The prompt text is selected — press <kbd>Ctrl</kbd>+<kbd>C</kbd> (or <kbd>⌘</kbd>+<kbd>C</kbd> on Mac) to copy it, or long-press and choose Copy on a phone.
                </p>
              </Notice>
            </div>
          )}
        </Card>
      </div>
      <ScoreEntry subjectId={subject.id} />
    </>
  );
}

function ScoreEntry({ subjectId }: { subjectId: string }) {
  const { data, dispatch, now } = useApp();
  const toast = useToast();
  const [score, setScore] = useState('');
  const [topicScores, setTopicScores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [busy, guard] = useSubmitGuard();
  const topics = data.topics.filter((t) => t.subjectId === subjectId);
  const subject = data.subjects.find((s) => s.id === subjectId);

  const save = () =>
    void guard(() => {
      const n = Number(score);
      if (score.trim() === '' || !Number.isFinite(n) || n < 0 || n > 100) {
        setError('Enter your score as a percentage from 0 to 100.');
        return false;
      }
      const ts: Record<string, number> = {};
      for (const [k, v] of Object.entries(topicScores)) {
        const x = Number(v);
        if (v.trim() !== '' && Number.isFinite(x) && x >= 0 && x <= 100) ts[k] = x;
      }
      setError(undefined);
      dispatch({ type: 'addMockScore', score: { id: newId('m'), subjectId, date: now.date, scorePercent: n, topicScores: ts, note: '' } });
      toast.show('Score saved');
      setScore('');
      setTopicScores({});
    });

  return (
    <Card title={`Record a mock-test score${subject ? ` for ${subject.name}` : ''} (optional)`} icon="target" className="section-gap">
      <p className="muted">After you’ve taken the test elsewhere, paste the score the assistant gave you. It feeds the optional readiness indicator.</p>
      <div className="form-grid">
        <TextField label="Overall score (%)" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} error={error} />
        {topics.map((t) => (
          <TextField key={t.id} label={`${t.title} score (%) — optional`} type="number" min={0} max={100} value={topicScores[t.id] ?? ''} onChange={(e) => setTopicScores({ ...topicScores, [t.id]: e.target.value })} />
        ))}
      </div>
      <div className="form-actions" style={{ marginTop: 12 }}>
        <Button variant="primary" icon="check" onClick={save} disabled={busy}>Save score</Button>
      </div>
    </Card>
  );
}
