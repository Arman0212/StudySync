/**
 * Progress metrics derived only from saved records (pure).
 *
 * Topic completed minutes = estimate if the topic is marked completed, otherwise the
 * planned minutes of its completed sessions (capped at the estimate). Missed sessions
 * never count. Completion % = completed minutes ÷ estimated minutes.
 */
import { addDays, compareDates, dateRange, diffDays, startOfWeek } from './dates';
import type { AppData, ISODate, LocalNow, MockScore, StudySession, Subject, Topic } from './types';

export interface TopicProgress {
  topic: Topic;
  completedMinutes: number;
  remainingMinutes: number;
  actualMinutes: number;
  sessionsDone: number;
  sessionsTotal: number;
}

export interface SubjectProgress {
  subject: Subject;
  topics: TopicProgress[];
  topicsCompleted: number;
  estimatedMinutes: number;
  completedMinutes: number;
  remainingMinutes: number;
  actualMinutes: number;
  percent: number;
  daysToExam: number;
}

export function topicProgress(topic: Topic, sessions: StudySession[]): TopicProgress {
  const mine = sessions.filter((s) => s.topicId === topic.id);
  const done = mine.filter((s) => s.status === 'completed');
  const doneMinutes = done.reduce((t, s) => t + s.duration, 0);
  const completedMinutes = topic.status === 'completed' ? topic.estimatedMinutes : Math.min(topic.estimatedMinutes, doneMinutes);
  return {
    topic,
    completedMinutes,
    remainingMinutes: Math.max(0, topic.estimatedMinutes - completedMinutes),
    actualMinutes: done.reduce((t, s) => t + (s.actualMinutes ?? 0), 0),
    sessionsDone: done.length,
    sessionsTotal: mine.length,
  };
}

const pct = (part: number, whole: number) => (whole <= 0 ? 0 : Math.round((part / whole) * 100));

export function subjectProgress(subject: Subject, d: Pick<AppData, 'topics' | 'sessions'>, today: ISODate): SubjectProgress {
  const topics = d.topics.filter((t) => t.subjectId === subject.id).sort((a, b) => a.order - b.order).map((t) => topicProgress(t, d.sessions));
  const estimatedMinutes = topics.reduce((t, x) => t + x.topic.estimatedMinutes, 0);
  const completedMinutes = topics.reduce((t, x) => t + x.completedMinutes, 0);
  return {
    subject,
    topics,
    topicsCompleted: topics.filter((x) => x.topic.status === 'completed').length,
    estimatedMinutes,
    completedMinutes,
    remainingMinutes: estimatedMinutes - completedMinutes,
    actualMinutes: topics.reduce((t, x) => t + x.actualMinutes, 0),
    percent: pct(completedMinutes, estimatedMinutes),
    daysToExam: diffDays(today, subject.examDate),
  };
}

export interface Overview {
  subjects: SubjectProgress[];
  subjectCount: number;
  topicsTotal: number;
  topicsCompleted: number;
  percent: number;
  plannedMinutesThisWeek: number;
  missedCount: number;
}

export function overview(d: AppData, today: ISODate): Overview {
  const subjects = [...d.subjects].sort((a, b) => compareDates(a.examDate, b.examDate)).map((s) => subjectProgress(s, d, today));
  const est = subjects.reduce((t, s) => t + s.estimatedMinutes, 0);
  const done = subjects.reduce((t, s) => t + s.completedMinutes, 0);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  return {
    subjects,
    subjectCount: d.subjects.length,
    topicsTotal: d.topics.length,
    topicsCompleted: d.topics.filter((t) => t.status === 'completed').length,
    percent: pct(done, est),
    plannedMinutesThisWeek: d.sessions
      .filter((s) => s.status !== 'missed' && s.date >= weekStart && s.date <= weekEnd)
      .reduce((t, s) => t + s.duration, 0),
    missedCount: d.sessions.filter((s) => s.status === 'missed').length,
  };
}

export interface DayBar {
  date: ISODate;
  plannedMinutes: number;
  completedMinutes: number;
}

/** Monday–Sunday of the current week: planned vs completed minutes per day. */
export function weeklyBars(d: AppData, today: ISODate): DayBar[] {
  const start = startOfWeek(today);
  return dateRange(start, addDays(start, 6)).map((date) => {
    const day = d.sessions.filter((s) => s.date === date && s.status !== 'missed');
    return {
      date,
      plannedMinutes: day.reduce((t, s) => t + s.duration, 0),
      completedMinutes: day.filter((s) => s.status === 'completed').reduce((t, s) => t + s.duration, 0),
    };
  });
}

/** Topics rated 1–2 (and not completed), lowest first: suggested for revision. */
export function revisionSuggestions(d: AppData): Topic[] {
  return d.topics
    .filter((t) => t.confidence != null && t.confidence <= 2)
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0) || a.order - b.order);
}

export interface ReadinessIndicator {
  value: number;
  components: { label: string; value: number }[];
}

/**
 * Optional readiness INDICATOR (not a prediction). Equal-weight average of whichever
 * inputs actually exist: completion %, average confidence (1→0 %, 5→100 %) and the
 * latest mock-test score. Returns null when there are no inputs at all.
 */
export function readiness(sp: SubjectProgress, scores: MockScore[]): ReadinessIndicator | null {
  const components: { label: string; value: number }[] = [];
  if (sp.estimatedMinutes > 0) components.push({ label: 'Study completion', value: sp.percent });
  const rated = sp.topics.filter((t) => t.topic.confidence != null);
  if (rated.length > 0) {
    const avg = rated.reduce((t, x) => t + (x.topic.confidence as number), 0) / rated.length;
    components.push({ label: 'Average confidence', value: Math.round(((avg - 1) / 4) * 100) });
  }
  const latest = scores.filter((s) => s.subjectId === sp.subject.id).sort((a, b) => compareDates(b.date, a.date))[0];
  if (latest) components.push({ label: 'Latest mock-test score', value: Math.round(latest.scorePercent) });
  if (components.length === 0) return null;
  return { value: Math.round(components.reduce((t, c) => t + c.value, 0) / components.length), components };
}

export interface Alert {
  id: string;
  level: 'warning' | 'danger' | 'info';
  message: string;
  action?: { label: string; href: string };
}

export function alerts(d: AppData, now: LocalNow): Alert[] {
  const out: Alert[] = [];
  if (d.conflicts.length > 0) {
    const mins = d.conflicts.reduce((t, c) => t + c.neededMinutes, 0);
    out.push({ id: 'capacity', level: 'danger', message: `${d.conflicts.length} topic${d.conflicts.length === 1 ? '' : 's'} could not fully fit before ${d.conflicts.length === 1 ? 'its exam' : 'their exams'} (${Math.round(mins / 6) / 10} h unscheduled).`, action: { label: 'See capacity conflicts', href: '#/timetable' } });
  }
  const missed = d.sessions.filter((s) => s.status === 'missed').length;
  if (missed > 0) out.push({ id: 'missed', level: 'warning', message: `${missed} missed session${missed === 1 ? '' : 's'} waiting to be rescheduled.`, action: { label: 'Reschedule', href: '#/timetable' } });
  for (const s of d.subjects) {
    const days = diffDays(now.date, s.examDate);
    const open = d.topics.filter((t) => t.subjectId === s.id && t.status !== 'completed').length;
    if (days >= 0 && days <= 3 && open > 0) out.push({ id: `soon-${s.id}`, level: 'warning', message: `${s.name} exam ${days === 0 ? 'is today' : `in ${days} day${days === 1 ? '' : 's'}`} with ${open} topic${open === 1 ? '' : 's'} not yet completed.` });
  }
  if (d.subjects.length > 0 && d.sessions.length === 0) out.push({ id: 'noplan', level: 'info', message: 'You have subjects but no timetable yet.', action: { label: 'Generate a plan', href: '#/timetable' } });
  return out;
}
