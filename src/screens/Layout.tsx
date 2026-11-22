import { useEffect, useRef, type ReactNode } from 'react';
import { useApp } from '../state/store';
import { Logo } from '../ui/Logo';
import { Icon } from '../ui/Icon';
import { formatTime } from '../domain/dates';
import { localNowIn } from '../domain/dates';

export const NAV = [
  { id: 'dashboard', label: 'Dashboard', short: 'Home', icon: 'dashboard', href: '#/dashboard' },
  { id: 'setup', label: 'Plan setup', short: 'Setup', icon: 'setup', href: '#/setup' },
  { id: 'timetable', label: 'Timetable', short: 'Timetable', icon: 'calendar', href: '#/timetable' },
  { id: 'progress', label: 'Progress', short: 'Progress', icon: 'progress', href: '#/progress' },
  { id: 'mock-test', label: 'Mock test', short: 'Mock test', icon: 'test', href: '#/mock-test' },
  { id: 'settings', label: 'Settings & data', short: 'Settings', icon: 'settings', href: '#/settings' },
] as const;

export function SavedIndicator() {
  const { savedAt, saveError, timezone } = useApp();
  if (saveError) {
    return (
      <span className="saved saved-error" role="status">
        <Icon name="alert" size={16} /> {saveError}
      </span>
    );
  }
  if (!savedAt) return <span className="saved" role="status" aria-live="polite" />;
  const t = localNowIn(new Date(savedAt), timezone);
  return (
    <span className="saved" role="status" aria-live="polite" data-testid="saved-indicator">
      <Icon name="check" size={16} /> Saved {formatTime(t.minutes)}
    </span>
  );
}

export function Layout({ section, children }: { section: string; children: ReactNode }) {
  const { data } = useApp();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const label = NAV.find((n) => n.id === section)?.label ?? 'StudySync';

  useEffect(() => {
    document.title = `${label} · StudySync`;
    // Move focus to the page heading on navigation so keyboard and screen-reader users
    // land on the new screen (skipped on first load).
    if (first.current) {
      first.current = false;
      return;
    }
    const h1 = mainRef.current?.querySelector<HTMLElement>('h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: false });
    }
    window.scrollTo?.(0, 0);
  }, [section, label]);

  const links = (compact: boolean) =>
    NAV.map((n) => (
      <li key={n.id}>
        <a className={compact ? undefined : 'nav-link'} href={n.href} aria-current={n.id === section ? 'page' : undefined}>
          <Icon name={n.icon} size={compact ? 20 : 18} />
          <span>{compact ? n.short : n.label}</span>
        </a>
      </li>
    ));

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to main content
      </a>
      <aside className="sidebar" aria-label="Sidebar">
        <a href="#/dashboard" className="logo" aria-label="StudySync home">
          <Logo />
        </a>
        <nav aria-label="Main">
          <ul className="nav-list">{links(false)}</ul>
        </nav>
        <div className="sidebar-foot">
          <SavedIndicator />
          <p className="muted small" style={{ marginTop: 8 }}>Your data stays in this browser.</p>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <a href="#/dashboard" className="logo" aria-label="StudySync home">
            <Logo />
          </a>
          <SavedIndicator />
        </header>
        {data.isDemo && (
          <div className="demo-banner" role="note">
            <Icon name="info" size={16} />
            <span>
              <strong>Demo data:</strong> the subjects, topics and sessions shown are fictional examples. Reset them in Settings &amp; data when you’re ready to add your own.
            </span>
          </div>
        )}
        <main id="main" ref={mainRef} tabIndex={-1} className="content">
          {children}
        </main>
        <nav className="bottom-nav" aria-label="Main (mobile)">
          <ul>{links(true)}</ul>
        </nav>
      </div>
    </div>
  );
}
