import { useApp } from '../state/store';
import { overview, readiness, revisionSuggestions } from '../domain/progress';
import { formatDate, formatDuration, localNowIn, formatTime } from '../domain/dates';
import { Card, EmptyState, Notice, PageHeader, ProgressBar, ProgressRing, StatusPill, SubjectDot } from '../ui/bits';
import { StudyHeatmap } from './progress/StudyHeatmap';
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
        <EmptyState title="No progress to show yet" illustration="chart" action={<a className="btn btn-primary" href="#/setup/subjects">Add subjects</a>}>Add subjects and topics, then mark sessions complete to track progress.</EmptyState>
      ) : (
        <>
          <div className="progress-top">
            <Card title="Overall" icon="target" className="overall-card">
              <div className="overall-body">
                <ProgressRing value={o.percent} size={148} stroke={13} label="Overall completion" valueText={`${o.percent}% · ${o.topicsCompleted} of ${o.topicsTotal} topics completed`} />
                <dl className="overall-stats">
                  <div>
                    <dt>Topics completed</dt>
                    <dd className="num">{o.topicsCompleted} / {o.topicsTotal}</dd>
                  </div>
                  <div>
                    <dt>Studied (recorded)</dt>
                    <dd className="num">{formatDuration(o.subjects.reduce((t, sp) => t + sp.actualMinutes, 0))}</dd>
                  </div>
                  <div>
                    <dt>Estimated remaining</dt>
                    <dd className="num">{formatDuration(o.subjects.reduce((t, sp) => t + sp.remainingMinutes, 0))}</dd>
                  </div>
                </dl>
              </div>
            </Card>
            <Card title="Study activity" icon="flame" className="heatmap-card">
              <StudyHeatmap sessions={data.sessions} today={now.date} />
            </Card>
          </div>

          <div className="subject-grid section-gap">
            {o.subjects.map((sp) => {
              const r = readiness(sp, data.mockScores);
              return (
                <Card key={sp.subject.id} className="subject-progress" title={<span className="subject-card-head"><SubjectDot color={sp.subject.color} />{sp.subject.name}</span>} headingLevel={2} actions={<span className={`tag${sp.daysToExam === 0 ? ' tag-warning' : ''}`}>Exam {sp.daysToExam < 0 ? 'past' : sp.daysToExam === 0 ? 'today' : `in ${sp.daysToExam} day${sp.daysToExam === 1 ? '' : 's'}`}</span>}>
                  <div className="subject-progress-head">
                    <ProgressRing value={sp.percent} size={88} stroke={9} color={sp.subject.color} label={`${sp.subject.name} completion`} />
                    <dl className="subject-stats">
                      <div><dt>Topics</dt><dd className="num">{sp.topicsCompleted} / {sp.topics.length}</dd></div>
                      <div><dt>Remaining</dt><dd className="num">{formatDuration(sp.remainingMinutes)}</dd></div>
                      <div><dt>Studied</dt><dd className="num">{formatDuration(sp.actualMinutes)}</dd></div>
                    </dl>
                  </div>
                  <h3 className="subhead">Topic checklist</h3>
                  {sp.topics.length === 0 ? (
                    <p className="muted">No topics yet.</p>
                  ) : (
                    <ul className="list" aria-label={`${sp.subject.name} topics`}>
                      {sp.topics.map((tp) => (
                        <li key={tp.topic.id} className="list-item">
                          <label className="list-main check-row">
                            <input
                              type="checkbox"
                              className="checkbox"
                              checked={tp.topic.status === 'completed'}
                              onChange={(e) => {
                                dispatch({ type: 'setTopicStatus', topicId: tp.topic.id, status: e.target.checked ? 'completed' : tp.sessionsDone > 0 ? 'in_progress' : 'not_started' });
                                toast.show(e.target.checked ? `“${tp.topic.title}” marked complete` : `“${tp.topic.title}” reopened`);
                              }}
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
                    <div className="readiness">
                      <h3 className="subhead">Readiness indicator</h3>
                      <ProgressBar label={`${sp.subject.name} readiness indicator`} color={sp.subject.color} value={r.value} valueText={`${r.value} / 100`} />
                      <p className="muted small" style={{ marginTop: 4 }}>
                        An indicator, not a prediction of your grade. Average of: {r.components.map((c) => `${c.label.toLowerCase()} ${c.value}%`).join(', ')}.
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <div className="grid-2 section-gap">
            <Card title="Suggested for revision" icon="book">
              {revision.length === 0 ? (
                <EmptyState compact illustration="books" title="No low-confidence topics">Rate your confidence on topics (1–5) and anything rated 1 or 2 will appear here.</EmptyState>
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
            <Card title="Activity history" icon="clock">
              {data.activity.length === 0 ? (
                <EmptyState compact illustration="sprout" title="No activity yet">Completions, edits and reschedules will be listed here.</EmptyState>
              ) : (
                <ul className="list activity-list" aria-label="Activity history" tabIndex={0}>
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
            <Card title="Mock-test scores you entered" icon="test" className="section-gap">
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
          <div className="section-gap">
            <Notice>Progress is a transparent summary of your own records. StudySync never predicts grades.</Notice>
          </div>
          <div className="print-row">
            <Button variant="ghost" icon="printer" onClick={() => window.print()}>Print this page</Button>
          </div>
        </>
      )}
    </>
  );
}
