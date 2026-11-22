import { useState, type CSSProperties, type ReactNode } from 'react';
import type { SessionStatus, TopicStatus } from '../domain/types';
import { Icon } from './Icon';
import { Illustration, type IllustrationName } from './Illustration';

const SESSION_LABEL: Record<SessionStatus, { label: string; icon: string }> = {
  planned: { label: 'Planned', icon: 'clock' },
  in_progress: { label: 'In progress', icon: 'playCircle' },
  completed: { label: 'Completed', icon: 'checkCircle' },
  missed: { label: 'Missed', icon: 'xCircle' },
  rescheduled: { label: 'Rescheduled', icon: 'redo' },
};
const TOPIC_LABEL: Record<TopicStatus, { label: string; icon: string }> = {
  not_started: { label: 'Not started', icon: 'circle' },
  in_progress: { label: 'In progress', icon: 'half' },
  completed: { label: 'Completed', icon: 'checkCircle' },
};

export const sessionStatusLabel = (s: SessionStatus) => SESSION_LABEL[s].label;
export const sessionStatusIcon = (s: SessionStatus) => SESSION_LABEL[s].icon;
export const topicStatusLabel = (s: TopicStatus) => TOPIC_LABEL[s].label;

/** CSS variable carrying a subject colour; the stylesheet lifts it in dark mode. */
export const subjectVar = (color: string | undefined): CSSProperties => ({ ['--subject' as string]: color ?? 'var(--color-sage)' });

/**
 * Status is always conveyed by icon + text, never by colour alone. When a pill changes to
 * "completed" while on screen, its check icon plays a short pop animation.
 */
export function StatusPill({ status, kind = 'session' }: { status: SessionStatus | TopicStatus; kind?: 'session' | 'topic' }) {
  const meta = kind === 'session' ? SESSION_LABEL[status as SessionStatus] : TOPIC_LABEL[status as TopicStatus];
  const [prev, setPrev] = useState(status);
  const [pop, setPop] = useState(false);
  if (prev !== status) {
    setPrev(status);
    setPop(status === 'completed');
  }
  return (
    <span className={`pill pill-${status}${pop ? ' pill-pop' : ''}`}>
      <Icon name={meta.icon} size={14} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

export function ProgressBar({ value, label, max = 100, valueText, color, hideLabel }: { value: number; label: string; max?: number; valueText?: string; color?: string | undefined; hideLabel?: boolean }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const text = valueText ?? `${Math.round(pct)}%`;
  return (
    <div className="progress" style={color ? subjectVar(color) : undefined}>
      {!hideLabel && (
        <div className="progress-head">
          <span className="progress-label">
            {color && <SubjectDot color={color} />}
            {label}
          </span>
          <span className="progress-value">{text}</span>
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-valuetext={text}>
        <div className={`progress-fill${color ? ' progress-fill-subject' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Circular progress ring, exposed as a progressbar. The centre shows the percentage. */
export function ProgressRing({ value, size = 120, stroke = 10, label, color, children, valueTestId, valueText }: { value: number; size?: number; stroke?: number; label: string; color?: string | undefined; children?: ReactNode; valueTestId?: string; valueText?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="ring"
      style={{ width: size, height: size, ...(color ? subjectVar(color) : {}) }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText ?? `${Math.round(pct)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={`ring-fill${color ? ' ring-fill-subject' : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={pct === 0 ? { opacity: 0 } : undefined}
        />
      </svg>
      <div className="ring-center" aria-hidden="true">
        <span className="ring-value" data-testid={valueTestId} style={{ fontSize: Math.max(14, size * 0.22) }}>
          {Math.round(pct)}%
        </span>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action, illustration = 'sprout', compact }: { title: string; children?: ReactNode; action?: ReactNode; illustration?: IllustrationName; compact?: boolean }) {
  return (
    <div className={`empty${compact ? ' empty-compact' : ''}`}>
      <Illustration name={illustration} className="empty-art" />
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Card({ title, children, actions, className = '', headingLevel = 2, icon }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; headingLevel?: 2 | 3; icon?: string }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <div className="card-head">
          {title && (
            <H className="card-title">
              {icon && (
                <span className="card-title-icon">
                  <Icon name={icon} size={16} />
                </span>
              )}
              {title}
            </H>
          )}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, sub, icon, testId }: { label: string; value: ReactNode; sub?: ReactNode; icon: string; testId?: string }) {
  return (
    <div className="card metric">
      <span className="metric-icon">
        <Icon name={icon} size={20} />
      </span>
      <div className="metric-text">
        <p className="metric-label">{label}</p>
        <p className="metric-value" data-testid={testId}>
          {value}
        </p>
        {sub && <p className="metric-sub">{sub}</p>}
      </div>
    </div>
  );
}

export function Notice({ level = 'info', children }: { level?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  return (
    <div className={`notice notice-${level}`}>
      <Icon name={level === 'info' ? 'info' : level === 'success' ? 'checkCircle' : 'alert'} />
      <div>
        <span className="sr-only">{level === 'danger' ? 'Important: ' : level === 'warning' ? 'Warning: ' : ''}</span>
        {children}
      </div>
    </div>
  );
}

export function SubjectDot({ color }: { color: string }) {
  return <span className="subject-dot" style={subjectVar(color)} aria-hidden="true" />;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
