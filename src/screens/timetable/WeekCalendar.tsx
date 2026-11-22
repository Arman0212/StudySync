import type { CSSProperties } from 'react';
import type { Availability, ISODate, StudySession, Subject, Topic } from '../../domain/types';
import { formatDate, formatDuration, formatTime, weekdayName, weekdayOf } from '../../domain/dates';
import { Icon } from '../../ui/Icon';
import { sessionStatusIcon, sessionStatusLabel, subjectVar } from '../../ui/bits';

const HOUR_PX = 60;

/** Visible hour range: the study window, widened to fit every session shown this week. */
export function hourRange(sessions: StudySession[], availability: Availability): [number, number] {
  let lo = availability.dayStart;
  let hi = availability.dayEnd;
  if (hi <= lo || hi - lo > 14 * 60) {
    // Very wide windows (e.g. 00:00–23:55) would make a tall, mostly empty grid.
    lo = sessions.length ? Infinity : 8 * 60;
    hi = sessions.length ? -Infinity : 20 * 60;
  }
  for (const s of sessions) {
    lo = Math.min(lo, s.start);
    hi = Math.max(hi, s.start + s.duration);
  }
  let start = Math.floor(lo / 60);
  let end = Math.ceil(hi / 60);
  if (end - start < 6) end = Math.min(24, start + 6);
  if (end - start < 6) start = Math.max(0, end - 6);
  return [start, end];
}

export function WeekCalendar({
  days,
  sessions,
  subjectById,
  topicById,
  today,
  nowMinutes,
  availability,
  onOpen,
}: {
  days: ISODate[];
  sessions: StudySession[];
  subjectById: Map<string, Subject>;
  topicById: Map<string, Topic>;
  today: ISODate;
  nowMinutes: number;
  availability: Availability;
  onOpen: (s: StudySession) => void;
}) {
  const inWeek = sessions.filter((s) => days.includes(s.date));
  const [startH, endH] = hourRange(inWeek, availability);
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);
  const top = (min: number) => ((min - startH * 60) / 60) * HOUR_PX;
  const height = (endH - startH) * HOUR_PX;
  const showNow = days.includes(today) && nowMinutes >= startH * 60 && nowMinutes <= endH * 60;

  return (
    <div className="cal" role="region" aria-label="Week calendar" tabIndex={0}>
      <div className="cal-inner" style={{ '--cal-hour': `${HOUR_PX}px` } as CSSProperties}>
        <div className="cal-head">
          <div className="cal-corner" aria-hidden="true" />
          {days.map((d) => {
            const planned = sessions.filter((s) => s.date === d && s.status !== 'missed').reduce((t, s) => t + s.duration, 0);
            const over = planned > availability.dailyMaxMinutes;
            return (
              <div key={d} className={`cal-dayhead${d === today ? ' cal-today' : ''}`}>
                <h3 className="cal-dayname">
                  <span className="cal-wd">{weekdayName(weekdayOf(d))}</span>
                  <span className="cal-dn">{Number(d.slice(8))}</span>
                  <span className="sr-only">{formatDate(d, { weekday: false })}{d === today ? ', today' : ''}</span>
                </h3>
                <span className={`cal-total${over ? ' day-total-over' : ''}`}>
                  {planned ? formatDuration(planned) : '—'}
                  <span className="sr-only"> of {formatDuration(availability.dailyMaxMinutes)} daily max{over ? ' — over the limit' : ''}</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className="cal-body" style={{ height }}>
          <div className="cal-gutter" aria-hidden="true">
            {hours.map((h) => (
              <span key={h} className="cal-hour" style={{ top: (h - startH) * HOUR_PX }}>
                {formatTime(h * 60)}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={`cal-col${d === today ? ' cal-today' : ''}`}>
              {inWeek
                .filter((s) => s.date === d)
                .map((s) => {
                  const subject = subjectById.get(s.subjectId);
                  const title = topicById.get(s.topicId)?.title ?? 'Topic';
                  const h = (s.duration / 60) * HOUR_PX;
                  const size = h < 44 ? 'xs' : h < 64 ? 'sm' : 'md';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`cal-block cal-block-${size} cal-${s.status}`}
                      style={{ ...subjectVar(subject?.color), top: top(s.start) + 1, height: Math.max(22, h - 3) }}
                      onClick={() => onOpen(s)}
                      title={`${formatTime(s.start)}–${formatTime(s.start + s.duration)} · ${title} · ${subject?.name ?? ''} · ${sessionStatusLabel(s.status)}`}
                    >
                      <span className="cal-block-time">
                        {formatTime(s.start)}
                        <span className="sr-only">–{formatTime(s.start + s.duration)}</span>
                      </span>
                      <span className="cal-block-title">{title}</span>
                      <span className="sr-only">
                        , {subject?.name}, {sessionStatusLabel(s.status)}
                        {s.locked ? ', locked' : ''}
                      </span>
                      <span className="cal-block-icons" aria-hidden="true">
                        {s.locked && <Icon name="lock" size={12} />}
                        {s.status !== 'planned' && <Icon name={sessionStatusIcon(s.status)} size={12} strokeWidth={2.5} />}
                      </span>
                    </button>
                  );
                })}
              {d === today && showNow && (
                <div className="cal-now" style={{ top: top(nowMinutes) }} aria-hidden="true">
                  <span className="cal-now-dot" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
