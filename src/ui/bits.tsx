import type { ReactNode } from 'react';
import type { SessionStatus, TopicStatus } from '../domain/types';
import { Icon } from './Icon';

const SESSION_LABEL: Record<SessionStatus, { label: string; icon: string }> = {
  planned: { label: 'Planned', icon: 'clock' },
  in_progress: { label: 'In progress', icon: 'play' },
  completed: { label: 'Completed', icon: 'check' },
  missed: { label: 'Missed', icon: 'x' },
  rescheduled: { label: 'Rescheduled', icon: 'redo' },
};
const TOPIC_LABEL: Record<TopicStatus, { label: string; icon: string }> = {
  not_started: { label: 'Not started', icon: 'circle' },
  in_progress: { label: 'In progress', icon: 'half' },
  completed: { label: 'Completed', icon: 'check' },
};

export const sessionStatusLabel = (s: SessionStatus) => SESSION_LABEL[s].label;
export const topicStatusLabel = (s: TopicStatus) => TOPIC_LABEL[s].label;

/** Status is always conveyed by icon + text, never by colour alone. */
export function StatusPill({ status, kind = 'session' }: { status: SessionStatus | TopicStatus; kind?: 'session' | 'topic' }) {
  const meta = kind === 'session' ? SESSION_LABEL[status as SessionStatus] : TOPIC_LABEL[status as TopicStatus];
  return (
    <span className={`pill pill-${status}`}>
      <Icon name={meta.icon} size={14} />
      {meta.label}
    </span>
  );
}

export function ProgressBar({ value, label, max = 100, valueText }: { value: number; label: string; max?: number; valueText?: string }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const text = valueText ?? `${Math.round(pct)}%`;
  return (
    <div className="progress">
      <div className="progress-head">
        <span>{label}</span>
        <span className="progress-value">{text}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-valuetext={text}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name="leaf" size={28} className="empty-icon" />
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Card({ title, children, actions, className = '', headingLevel = 2 }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={`card ${className}`.trim()}>
      {(title || actions) && (
        <div className="card-head">
          {title && <H className="card-title">{title}</H>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ level = 'info', children }: { level?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  return (
    <div className={`notice notice-${level}`}>
      <Icon name={level === 'info' ? 'info' : level === 'success' ? 'check' : 'alert'} />
      <div>
        <span className="sr-only">{level === 'danger' ? 'Important: ' : level === 'warning' ? 'Warning: ' : ''}</span>
        {children}
      </div>
    </div>
  );
}

export function SubjectDot({ color }: { color: string }) {
  return <span className="subject-dot" style={{ background: color }} aria-hidden="true" />;
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
