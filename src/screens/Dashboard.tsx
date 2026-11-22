import { useApp } from '../state/store';
import { navigate } from '../state/router';
import { alerts, overview, weeklyBars } from '../domain/progress';
import { diffDays, formatDate, formatDuration, formatTime, weekdayName, weekdayOf } from '../domain/dates';
import { Button } from '../ui/Button';
import { Card, EmptyState, Notice, PageHeader, ProgressBar, StatusPill, SubjectDot } from '../ui/bits';
import { useSessionActions } from './timetable/useSessionActions';

function greeting(minutes: number): string {
  if (minutes < 12 * 60) return 'Good morning';
  if (minutes < 17 * 60) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { data, now } = useApp();
  const actions = useSessionActions();
  const o = overview(data, now.date);
  const bars = weeklyBars(data, now.date);
  const maxBar = Math.max(60, ...bars.map((b) => b.plannedMinutes));
  const name = data.profile?.displayName.trim();
  const today = data.sessions.filter((s) => s.date === now.date).sort((a, b) => a.start - b.start);
  const subjectById = new Map(data.subjects.map((s) => [s.id, s]));
  const topicById = new Map(data.topics.map((t) => [t.id, t]));
  const exams = [...data.subjects].sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : (a.examStart ?? 0) - (b.examStart ?? 0)));
  const alertList = alerts(data, now);

  return (
    <>
      <PageHeader title={name ? `${greeting(now.minutes)}, ${name}` : `${greeting(now.minutes)}`} subtitle={`${formatDate(now.date, { year: true })} · one step at a time.`} />

      {data.subjects.length === 0 && (
        <EmptyState title="Let’s set up your plan" action={<Button variant="primary" onClick={() => navigate('/setup/subjects')}>Add your first subject</Button>}>
          Add your subjects, exam dates and topics, and StudySync will build your timetable.
        </EmptyState>
      )}

      {alertList.length > 0 && (
        <section aria-label="Alerts" className="stack" style={{ marginBottom: 16 }}>
          {alertList.map((a) => (
            <Notice key={a.id} level={a.level}>
              <span>{a.message}</span>{' '}
              {a.action && <a href={a.action.href}>{a.action.label}</a>}
            </Notice>
          ))}
        </section>
      )}

      <section aria-label="Summary" className="grid-4" style={{ marginBottom: 16 }}>
        <div className="card metric">
          <p className="metric-label">Subjects</p>
          <p className="metric-value" data-testid="metric-subjects">{o.subjectCount}</p>
        </div>
        <div className="card metric">
          <p className="metric-label">Topics completed</p>
          <p className="metric-value" data-testid="metric-topics">{o.topicsCompleted} / {o.topicsTotal}</p>
        </div>
        <div className="card metric">
          <p className="metric-label">Overall completion</p>
          <p className="metric-value" data-testid="metric-completion">{o.percent}%</p>
          <p className="metric-sub">of estimated study time</p>
        </div>
        <div className="card metric">
          <p className="metric-label">Planned this week</p>
          <p className="metric-value" data-testid="metric-week">{formatDuration(o.plannedMinutesThisWeek)}</p>
        </div>
      </section>

      <div className="grid-2">
        <Card title="Today’s agenda" actions={<a href="#/timetable">Open timetable</a>}>
          {today.length === 0 ? (
            <EmptyState title="Nothing planned today">{data.sessions.length === 0 ? 'Generate your timetable to see sessions here.' : 'Enjoy the breather, or check upcoming days in the timetable.'}</EmptyState>
          ) : (
            <ul className="list" aria-label="Today’s sessions">
              {today.map((s) => {
                const topic = topicById.get(s.topicId);
                const subject = subjectById.get(s.subjectId);
                const label = `${topic?.title ?? 'Topic'} at ${formatTime(s.start)}`;
                return (
                  <li key={s.id} className="list-item">
                    <div className="list-main">
                      {subject && <SubjectDot color={subject.color} />}
                      <div>
                        <p className="list-title">{formatTime(s.start)} · {topic?.title}</p>
                        <p className="list-meta">{subject?.name} · {formatDuration(s.duration)}</p>
                      </div>
                    </div>
                    <div className="row">
                      <StatusPill status={s.status} />
                      {s.status !== 'completed' && s.status !== 'missed' && (
                        <>
                          <Button size="sm" variant="primary" icon="check" onClick={() => actions.complete(s)} aria-label={`Mark complete: ${label}`}>Done</Button>
                          <Button size="sm" variant="secondary" icon="x" onClick={() => actions.missed(s)} aria-label={`Mark missed: ${label}`}>Missed</Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Upcoming exams">
          {exams.length === 0 ? (
            <EmptyState title="No exams yet">Add a subject with its exam date in Plan setup.</EmptyState>
          ) : (
            <ul className="list" aria-label="Exams by date">
              {exams.map((s) => {
                const days = diffDays(now.date, s.examDate);
                return (
                  <li key={s.id} className="list-item">
                    <div className="list-main">
                      <SubjectDot color={s.color} />
                      <div>
                        <p className="list-title">{s.name}</p>
                        <p className="list-meta">{formatDate(s.examDate, { year: true })}{s.examStart != null ? ` at ${formatTime(s.examStart)}` : ''}</p>
                      </div>
                    </div>
                    {days < 0 ? <span className="tag">Exam past</span> : days === 0 ? <span className="tag tag-warning">Exam today</span> : <span className="tag">{days} day{days === 1 ? '' : 's'} to go</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card title="This week">
          <figure style={{ margin: 0 }}>
            <div className="bars" aria-hidden="true">
              {bars.map((b) => (
                <div key={b.date} className="bar-col">
                  <span className="bar-value">{Math.round(b.completedMinutes / 6) / 10}h</span>
                  <div className="bar-stack" style={{ height: `${Math.max(4, (b.plannedMinutes / maxBar) * 110)}px` }}>
                    <div className="bar-done" style={{ height: `${b.plannedMinutes ? (b.completedMinutes / b.plannedMinutes) * 100 : 0}%` }} />
                  </div>
                  <span className="bar-label">{weekdayName(weekdayOf(b.date))}</span>
                </div>
              ))}
            </div>
            <div className="legend" aria-hidden="true">
              <span><span className="legend-swatch" style={{ background: 'var(--color-primary)' }} />Completed</span>
              <span><span className="legend-swatch" style={{ background: '#e5ece7' }} />Planned</span>
            </div>
            <figcaption className="sr-only">Study time this week (completed of planned):</figcaption>
            <table className="sr-only">
              <thead><tr><th>Day</th><th>Completed</th><th>Planned</th></tr></thead>
              <tbody>{bars.map((b) => <tr key={b.date}><td>{formatDate(b.date)}</td><td>{formatDuration(b.completedMinutes)}</td><td>{formatDuration(b.plannedMinutes)}</td></tr>)}</tbody>
            </table>
          </figure>
        </Card>
        <Card title="Progress by subject" actions={<a href="#/progress">Details</a>}>
          {o.subjects.length === 0 ? (
            <EmptyState title="No subjects yet" />
          ) : (
            <div className="stack">
              {o.subjects.map((sp) => (
                <ProgressBar key={sp.subject.id} label={sp.subject.name} value={sp.percent} valueText={`${sp.percent}% · ${sp.topicsCompleted}/${sp.topics.length} topics`} />
              ))}
            </div>
          )}
        </Card>
      </div>
      {actions.dialogs}
    </>
  );
}
