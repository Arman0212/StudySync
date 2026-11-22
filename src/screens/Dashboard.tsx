import { useApp } from '../state/store';
import { navigate } from '../state/router';
import { alerts, overview, weeklyBars } from '../domain/progress';
import { diffDays, formatDate, formatDuration, formatTime, weekdayName, weekdayOf } from '../domain/dates';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Card, EmptyState, MetricCard, Notice, ProgressBar, ProgressRing, StatusPill, SubjectDot, subjectVar } from '../ui/bits';
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
  const todayActive = today.filter((s) => s.status !== 'missed');
  const todayDone = today.filter((s) => s.status === 'completed').length;
  const subjectById = new Map(data.subjects.map((s) => [s.id, s]));
  const topicById = new Map(data.topics.map((t) => [t.id, t]));
  const exams = [...data.subjects].sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : (a.examStart ?? 0) - (b.examStart ?? 0)));
  const next = exams.find((s) => diffDays(now.date, s.examDate) >= 0);
  const nextDays = next ? diffDays(now.date, next.examDate) : 0;
  const alertList = alerts(data, now);
  const longDate = `${weekdayName(weekdayOf(now.date), true)}, ${formatDate(now.date, { weekday: false, year: true })}`;

  return (
    <>
      <div className="dash-top">
        <section className="hero" aria-labelledby="dash-greeting">
          <div className="hero-main">
            <p className="hero-eyebrow">
              <Icon name="calendar" size={16} /> {longDate}
            </p>
            <h1 id="dash-greeting" className="hero-title">
              {name ? `${greeting(now.minutes)}, ${name}` : `${greeting(now.minutes)}`}
            </h1>
            <p className="hero-sub">
              {todayActive.length > 0
                ? `${todayActive.length} session${todayActive.length === 1 ? '' : 's'} today · ${formatDuration(todayActive.reduce((t, s) => t + s.duration, 0))} · one step at a time.`
                : 'One step at a time.'}
            </p>
          </div>
          <div className="hero-countdown" data-testid="next-exam">
            {next ? (
              <>
                <p className="hero-count-label">Next exam</p>
                <p className="hero-count">
                  <span className="hero-count-num">{nextDays === 0 ? 'Today' : nextDays}</span>
                  {nextDays > 0 && <span className="hero-count-unit">day{nextDays === 1 ? '' : 's'}</span>}
                </p>
                <p className="hero-count-subject">
                  <SubjectDot color={next.color} />
                  {next.name}
                </p>
                <p className="hero-count-date">
                  {formatDate(next.examDate)}
                  {next.examStart != null ? ` · ${formatTime(next.examStart)}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="hero-count-label">Next exam</p>
                <p className="hero-count-subject">{exams.length ? 'All exams are behind you' : 'No exams added yet'}</p>
              </>
            )}
          </div>
        </section>

        <section className="card completion-card" aria-labelledby="completion-title">
          <h2 id="completion-title" className="card-title">
            Overall completion
          </h2>
          <div className="completion-body">
            <ProgressRing value={o.percent} size={132} stroke={12} label="Overall completion" valueTestId="metric-completion" />
            <div className="completion-stats">
              <p className="completion-stat">
                <span className="num">{o.topicsCompleted}</span>
                <span className="completion-of">of {o.topicsTotal} topics done</span>
              </p>
              <p className="muted small">Measured against your estimated study time.</p>
            </div>
          </div>
        </section>
      </div>

      {data.subjects.length === 0 && (
        <EmptyState title="Let’s set up your plan" illustration="books" action={<Button variant="primary" icon="plus" onClick={() => navigate('/setup/subjects')}>Add your first subject</Button>}>
          Add your subjects, exam dates and topics, and StudySync will build your timetable.
        </EmptyState>
      )}

      {alertList.length > 0 && (
        <section aria-label="Alerts" className="stack section-gap">
          {alertList.map((a) => (
            <Notice key={a.id} level={a.level}>
              <span>{a.message}</span> {a.action && <a href={a.action.href}>{a.action.label}</a>}
            </Notice>
          ))}
        </section>
      )}

      <section aria-label="Summary" className="metrics section-gap">
        <MetricCard icon="layers" label="Subjects" value={o.subjectCount} testId="metric-subjects" sub={next ? `next: ${next.name}` : undefined} />
        <MetricCard icon="checkCircle" label="Topics completed" value={`${o.topicsCompleted} / ${o.topicsTotal}`} testId="metric-topics" />
        <MetricCard icon="todo" label="Sessions today" value={`${todayDone} / ${todayActive.length}`} sub={todayActive.length ? `${formatDuration(todayActive.reduce((t, s) => t + s.duration, 0))} planned` : 'nothing planned'} />
        <MetricCard icon="timer" label="Planned this week" value={formatDuration(o.plannedMinutesThisWeek)} testId="metric-week" />
      </section>

      <div className="dash-grid section-gap">
        <Card title="Today’s agenda" icon="todo" actions={<a className="link-action" href="#/timetable">Open timetable <Icon name="chevronRight" size={16} /></a>}>
          {today.length === 0 ? (
            <EmptyState compact illustration="rest" title="Nothing planned today">
              {data.sessions.length === 0 ? 'Generate your timetable to see sessions here.' : 'Enjoy the breather, or check upcoming days in the timetable.'}
            </EmptyState>
          ) : (
            <ul className="agenda" aria-label="Today’s sessions">
              {today.map((s) => {
                const topic = topicById.get(s.topicId);
                const subject = subjectById.get(s.subjectId);
                const label = `${topic?.title ?? 'Topic'} at ${formatTime(s.start)}`;
                return (
                  <li key={s.id} className={`agenda-item agenda-${s.status}`} style={subjectVar(subject?.color)}>
                    <div className="agenda-time">
                      <span className="agenda-start">{formatTime(s.start)}</span>
                      <span className="agenda-dur">{formatDuration(s.duration)}</span>
                    </div>
                    <div className="agenda-body">
                      <p className="list-title">{topic?.title}</p>
                      <p className="list-meta">{subject?.name}</p>
                    </div>
                    <div className="agenda-actions">
                      <StatusPill status={s.status} />
                      {s.status !== 'completed' && s.status !== 'missed' && (
                        <>
                          <Button size="sm" variant="primary" icon="check" onClick={() => actions.complete(s)} aria-label={`Mark complete: ${label}`}>Complete</Button>
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

        <Card title="Upcoming exams" icon="graduation">
          {exams.length === 0 ? (
            <EmptyState compact illustration="exam" title="No exams yet">Add a subject with its exam date in Plan setup.</EmptyState>
          ) : (
            <ul className="exam-list" aria-label="Exams by date">
              {exams.map((s) => {
                const days = diffDays(now.date, s.examDate);
                return (
                  <li key={s.id} className="exam-item" style={subjectVar(s.color)}>
                    <span className={`exam-days${days < 0 ? ' exam-days-past' : ''}`} aria-hidden="true">
                      <span className="exam-days-num">{days < 0 ? '–' : days === 0 ? '0' : days}</span>
                      <span className="exam-days-unit">{days === 1 ? 'day' : 'days'}</span>
                    </span>
                    <div className="exam-body">
                      <p className="list-title">{s.name}</p>
                      <p className="list-meta">
                        {formatDate(s.examDate, { year: true })}
                        {s.examStart != null ? ` at ${formatTime(s.examStart)}` : ''}
                      </p>
                    </div>
                    {days < 0 ? <span className="tag">Exam past</span> : days === 0 ? <span className="tag tag-warning">Exam today</span> : <span className="sr-only">{days} day{days === 1 ? '' : 's'} to go</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid-2 section-gap">
        <Card title="This week" icon="progress">
          <figure style={{ margin: 0 }}>
            <div className="bars" aria-hidden="true">
              {bars.map((b) => (
                <div key={b.date} className={`bar-col${b.date === now.date ? ' bar-col-today' : ''}`}>
                  <span className="bar-value">{Math.round(b.completedMinutes / 6) / 10}h</span>
                  <div className="bar-stack" style={{ height: `${Math.max(4, (b.plannedMinutes / maxBar) * 110)}px` }}>
                    <div className="bar-done" style={{ height: `${b.plannedMinutes ? (b.completedMinutes / b.plannedMinutes) * 100 : 0}%` }} />
                  </div>
                  <span className="bar-label">{weekdayName(weekdayOf(b.date))}</span>
                </div>
              ))}
            </div>
            <div className="legend" aria-hidden="true">
              <span><span className="legend-swatch" style={{ background: 'var(--color-accent)' }} />Completed</span>
              <span><span className="legend-swatch" style={{ background: 'var(--color-track)' }} />Planned</span>
            </div>
            <figcaption className="sr-only">Study time this week (completed of planned):</figcaption>
            <div className="sr-only">
              <table>
              <thead><tr><th>Day</th><th>Completed</th><th>Planned</th></tr></thead>
              <tbody>{bars.map((b) => <tr key={b.date}><td>{formatDate(b.date)}</td><td>{formatDuration(b.completedMinutes)}</td><td>{formatDuration(b.plannedMinutes)}</td></tr>)}</tbody>
              </table>
            </div>
          </figure>
        </Card>
        <Card title="Progress by subject" icon="target" actions={<a className="link-action" href="#/progress">Details <Icon name="chevronRight" size={16} /></a>}>
          {o.subjects.length === 0 ? (
            <EmptyState compact illustration="chart" title="No subjects yet" />
          ) : (
            <div className="stack">
              {o.subjects.map((sp) => (
                <ProgressBar key={sp.subject.id} label={sp.subject.name} color={sp.subject.color} value={sp.percent} valueText={`${sp.percent}% · ${sp.topicsCompleted}/${sp.topics.length} topics`} />
              ))}
            </div>
          )}
        </Card>
      </div>
      {actions.dialogs}
    </>
  );
}
