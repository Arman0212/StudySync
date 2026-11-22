import { useSyncExternalStore } from 'react';
import type { ISODate, StudySession } from '../../domain/types';
import { addDays, formatDate, formatDuration } from '../../domain/dates';
import { heatmapWeeks } from '../../ui/heatmap';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 18;

const NARROW = '(max-width: 599px)';
function useNarrow(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = globalThis.matchMedia?.(NARROW);
      mq?.addEventListener('change', cb);
      return () => mq?.removeEventListener('change', cb);
    },
    () => globalThis.matchMedia?.(NARROW).matches ?? false,
    () => false,
  );
}

/** GitHub-style calendar of completed study time per day (fewer weeks on phones so cells stay legible). */
export function StudyHeatmap({ sessions, today }: { sessions: StudySession[]; today: ISODate }) {
  const weeks = useNarrow() ? 15 : 24;
  const cols = heatmapWeeks(sessions, today, weeks);
  const cells = cols.flat().filter((c) => !c.future);
  const total = cells.reduce((t, c) => t + c.minutes, 0);
  const activeDays = cells.filter((c) => c.minutes > 0).length;
  let streak = 0;
  // Current streak counts back from today (or from yesterday if nothing is done yet today).
  for (let d = cells.at(-1)?.minutes ? today : addDays(today, -1); ; d = addDays(d, -1)) {
    const c = cells.find((x) => x.date === d);
    if (!c || c.minutes === 0) break;
    streak++;
  }
  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;
  const summary = `${formatDuration(total)} of completed study over ${activeDays} day${activeDays === 1 ? '' : 's'} in the last ${weeks} weeks`;

  return (
    <figure className="heatmap">
      <div className="heatmap-stats">
        <p>
          <span className="num">{Math.round(total / 6) / 10}</span>
          <span className="heatmap-unit">hours studied</span>
        </p>
        <p>
          <span className="num">{activeDays}</span>
          <span className="heatmap-unit">active days</span>
        </p>
        <p>
          <span className="num">{streak}</span>
          <span className="heatmap-unit">day streak</span>
        </p>
      </div>
      <svg className="heatmap-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Study heatmap: ${summary}.`}>
        {cols.map((col, w) => {
          const month = Number(col[0]!.date.slice(5, 7)) - 1;
          const prev = w > 0 ? Number(cols[w - 1]![0]!.date.slice(5, 7)) - 1 : -1;
          return month !== prev && w < weeks - 1 ? (
            <text key={`m${w}`} className="heatmap-label" x={LEFT + w * STEP} y={11}>
              {MONTHS[month]}
            </text>
          ) : null;
        })}
        {['Mon', 'Wed', 'Fri'].map((l, i) => (
          <text key={l} className="heatmap-label" x={0} y={TOP + i * 2 * STEP + CELL - 2}>
            {l}
          </text>
        ))}
        {cols.map((col, w) =>
          col.map((c, d) =>
            c.future ? null : (
              <rect key={c.date} className={`heat heat-${c.level}${c.date === today ? ' heat-today' : ''}`} x={LEFT + w * STEP} y={TOP + d * STEP} width={CELL} height={CELL} rx={3}>
                <title>{`${formatDate(c.date, { year: true })}: ${c.minutes ? formatDuration(c.minutes) : 'no study recorded'}`}</title>
              </rect>
            ),
          ),
        )}
      </svg>
      <figcaption className="heatmap-foot">
        <span className="muted small">{activeDays === 0 ? 'Complete a session and it will show up here.' : 'Completed sessions per day, using the time you recorded.'}</span>
        <span className="heatmap-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heat-swatch heat-${l}`} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
