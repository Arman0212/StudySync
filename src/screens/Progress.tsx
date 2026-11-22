import { useApp } from '../state/store';
import { overview, readiness, revisionSuggestions } from '../domain/progress';
import { formatDate, formatDuration, localNowIn, formatTime } from '../domain/dates';
import { Card, EmptyState, Notice, PageHeader, ProgressBar, StatusPill, SubjectDot } from '../ui/bits';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export function Progress() {
  const { data, dispatch, now, timezone } = useApp();
  const toast = useToast();
  const o = overview(data, now.date);
  const revision = revisionSuggestions(data);
  const subjectById = new Map(data.subjects.map((s) => [s.id, s]));

  return (
    <>
      <PageHeader title="Progress" subtitle="Based only on what you’ve recorded — no guesses." />
      {data.subjects.length === 0 ? (
        <EmptyState title="No progress to show yet" action={<a className="btn btn-primary" href="#/setup/subjects">Add subjects</a>}>Add subjects and topics, then mark sessions complete to track progress.</EmptyState>
      ) : (
        <>
          <Card title="Overall">
            <ProgressBar label="Overall completion" value={o.percent} valueText={`${o.percent}% · ${o.topicsCompleted} of ${o.topicsTotal} topics completed`} />
          </Card>

          <div className="grid-2" style={{ marginTop: 16 }}>
            {o.subjects.map((sp) => {
              const r = readiness(sp, data.mockScores);
              return (
                <Card key={sp.subject.id} title={<span className="subject-card-head"><SubjectDot color={sp.subject.color} />{sp.subject.name}</span>} headingLevel={2}>
                  <ProgressBar label={`${sp.subject.name} completion`} value={sp.percent} valueText={`${sp.percent}%`} />
                  <p className="muted small" style={{ marginTop: 8 }}>
                    {formatDuration(sp.remainingMinutes)} estimated remaining · {formatDuration(sp.actualMinutes)} actually studied · exam {sp.daysToExam < 0 ? 'past' : sp.daysToExam === 0 ? 'today' : `in ${sp.daysToExam} days`}
                  </p>
                  <h3 style={{ marginTop: 16 }}>Topic checklist</h3>
                  {sp.topics.length === 0 ? (
                    <p className="muted">No topics yet.</p>
                  ) : (
                    <ul className="list" aria-label={`${sp.subject.name} topics`}>
                      {sp.topics.map((tp) => (
                        <li key={tp.topic.id} className="list-item">
                          <label className="list-main" style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={tp.topic.status === 'completed'}
                              onChange={(e) => {
                                dispatch({ type: 'setTopicStatus', topicId: tp.topic.id, status: e.target.checked ? 'completed' : tp.sessionsDone > 0 ? 'in_progress' : 'not_started' });
                                toast.show(e.target.checked ? `“${tp.topic.title}” marked complete` : `“${tp.topic.title}” reopened`);
                              }}
                              style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                            />
                            <span>
                              <span className="list-title">{tp.topic.title}</span>
                              <span className="list-meta" style={{ display: 'block' }}>
                                {tp.sessionsDone}/{tp.sessionsTotal} sessions · {formatDuration(tp.remainingMinutes)} left
                                {tp.topic.confidence != null ? ` · confidence ${tp.topic.confidence}/5` : ''}
                              </span>
                            </span>
                          </label>
                          <StatusPill status={tp.topic.status} kind="topic" />
                        </li>
                      ))}
                    </ul>
                  )}
                  {r && (
                    <div style={{ marginTop: 16 }}>
                      <h3>Readiness indicator</h3>
                      <ProgressBar label={`${sp.subject.name} readiness indicator`} value={r.value} valueText={`${r.value} / 100`} />
                      <p className="muted small" style={{ marginTop: 4 }}>
                        An indicator, not a prediction of your grade. Average of: {r.components.map((c) => `${c.label.toLowerCase()} ${c.value}%`).join(', ')}.
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="grid-2" style={{ marginTop: 16 }}>
            <Card title="Suggested for revision">
              {revision.length === 0 ? (
                <EmptyState title="No low-confidence topics">Rate your confidence on topics (1–5) and anything rated 1 or 2 will appear here.</EmptyState>
              ) : (
                <ul className="list" aria-label="Revision suggestions">
                  {revision.map((t) => (
                    <li key={t.id} className="list-item">
                      <div className="list-main">
                        <SubjectDot color={subjectById.get(t.subjectId)?.color ?? '#888'} />
                        <div>
                          <p className="list-title">{t.title}</p>
                          <p className="list-meta">{subjectById.get(t.subjectId)?.name} · confidence {t.confidence}/5</p>
                        </div>
                      </div>
                      <div className="row">
                        <label className="small">
                          <span className="sr-only">Update confidence for {t.title}</span>
                          <select className="input" value={t.confidence ?? ''} onChange={(e) => dispatch({ type: 'setTopicConfidence', topicId: t.id, confidence: e.target.value ? Number(e.target.value) : null })}>
                            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Confidence {n}</option>)}
                          </select>
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Activity history">
              {data.activity.length === 0 ? (
                <EmptyState title="No activity yet">Completions, edits and reschedules will be listed here.</EmptyState>
              ) : (
                <ul className="list" aria-label="Activity history" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {data.activity.slice(0, 100).map((a) => {
                    const t = localNowIn(new Date(a.at), timezone);
                    return (
                      <li key={a.id} className="list-item">
                        <span>{a.message}</span>
                        <span className="muted small nowrap">{formatDate(t.date)} {formatTime(t.minutes)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
          {data.mockScores.length > 0 && (
            <Card title="Mock-test scores you entered">
              <ul className="list">
                {data.mockScores.map((m) => (
                  <li key={m.id} className="list-item">
                    <span>{subjectById.get(m.subjectId)?.name ?? 'Subject'} · {formatDate(m.date, { year: true })}</span>
                    <strong>{m.scorePercent}%</strong>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Notice>Progress is a transparent summary of your own records. StudySync never predicts grades.</Notice>
          <div style={{ marginTop: 8 }}>
            <Button variant="ghost" onClick={() => window.print()}>Print this page</Button>
          </div>
        </>
      )}
    </>
  );
}
