import type { StudySession, Subject, Topic } from '../../domain/types';
import { formatDate, formatDuration, formatTime } from '../../domain/dates';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { StatusPill, subjectVar } from '../../ui/bits';
import type { SessionActions } from './useSessionActions';

export function SessionCard({ session: s, subject, topic, actions, showDate, compact }: { session: StudySession; subject?: Subject | undefined; topic?: Topic | undefined; actions: SessionActions; showDate?: boolean; compact?: boolean }) {
  const title = topic?.title ?? 'Unknown topic';
  const done = s.status === 'completed';
  const label = `${title}, ${formatDate(s.date)} ${formatTime(s.start)}`;
  return (
    <article className={`session session-${s.status}`} style={subjectVar(subject?.color)} aria-label={`Session: ${label}`}>
      <div className="session-body">
        <div className="row-between">
          <span className="session-time">
            <Icon name="clock" size={15} className="session-time-icon" />
            {showDate && `${formatDate(s.date)} · `}
            {formatTime(s.start)}–{formatTime(s.start + s.duration)}
          </span>
          <span className="row">
            {s.locked && (
              <span className="tag">
                <Icon name="lock" size={14} /> Locked
              </span>
            )}
            <StatusPill status={s.status} />
          </span>
        </div>
        <p className="session-topic">{title}</p>
        <div className="session-meta">
          <span className="session-subject">{subject?.name ?? 'Unknown subject'}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDuration(s.duration)}</span>
          {s.actualMinutes != null && done && (
            <>
              <span aria-hidden="true">·</span>
              <span>actual {formatDuration(s.actualMinutes)}</span>
            </>
          )}
          {s.rescheduleCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span title={s.history.map((h) => `${h.fromDate} ${formatTime(h.fromStart)} → ${h.toDate} ${formatTime(h.toStart)} (${h.reason})`).join('\n')}>
                moved {s.rescheduleCount}× {s.history.length > 0 && `(from ${formatDate(s.history[s.history.length - 1]!.fromDate)} ${formatTime(s.history[s.history.length - 1]!.fromStart)})`}
              </span>
            </>
          )}
        </div>
        {s.note && <p className="small muted" style={{ marginTop: 4 }}>Note: {s.note}</p>}
        {!compact && (
          <div className="session-actions">
            {!done && s.status !== 'missed' && (
              <Button size="sm" variant="primary" icon="check" onClick={() => actions.complete(s)} aria-label={`Mark complete: ${label}`}>Complete</Button>
            )}
            {s.status === 'missed' && !s.locked && (
              <Button size="sm" variant="primary" icon="redo" onClick={() => actions.reschedule(s)} aria-label={`Reschedule: ${label}`}>Reschedule</Button>
            )}
            {(s.status === 'planned' || s.status === 'rescheduled') && (
              <Button size="sm" variant="secondary" icon="play" onClick={() => actions.start(s)} aria-label={`Start: ${label}`}>Start</Button>
            )}
            {!done && s.status !== 'missed' && (
              <Button size="sm" variant="secondary" icon="x" onClick={() => actions.missed(s)} aria-label={`Mark missed: ${label}`}>Missed</Button>
            )}
            {done && <Button size="sm" variant="ghost" icon="edit" onClick={() => actions.complete(s)} aria-label={`Edit time spent: ${label}`}>Time & note</Button>}
            {!done && <Button size="sm" variant="ghost" icon="edit" onClick={() => actions.edit(s)} aria-label={`Edit time: ${label}`}>Edit</Button>}
            <Button size="sm" variant="ghost" icon={s.locked ? 'unlock' : 'lock'} onClick={() => actions.toggleLock(s)} aria-label={`${s.locked ? 'Unlock' : 'Lock'}: ${label}`} aria-pressed={s.locked}>
              {s.locked ? 'Unlock' : 'Lock'}
            </Button>
            <Button size="sm" variant="ghost" icon="trash" className="btn-danger-outline" onClick={() => actions.remove(s)} aria-label={`Delete: ${label}`}>Delete</Button>
          </div>
        )}
      </div>
    </article>
  );
}
