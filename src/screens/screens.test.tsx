import { describe, it, expect, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, seeded } from '../test/renderApp';
import { loadData, memoryStore, DATA_KEY } from '../storage/storage';
import { session, subject, topic } from '../test/factories';

describe('onboarding and profile', () => {
  it('welcome → create profile → availability, saved to storage', async () => {
    const user = userEvent.setup();
    const { store } = renderApp('#/');
    expect(screen.getByRole('heading', { name: 'Welcome to StudySync' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create my plan' }));
    await user.type(screen.getByLabelText('Display name (optional)'), 'Ravi');
    await user.click(screen.getByRole('button', { name: 'Create profile and continue' }));
    expect(await screen.findByRole('heading', { name: 'When can you study?' })).toBeInTheDocument();
    const r = loadData(store);
    expect(r.status === 'ok' && r.data.profile?.displayName).toBe('Ravi');
    expect(r.status === 'ok' && r.data.profile?.planStart).toBe('2026-01-05');
  });

  it('availability validation shows inline messages', async () => {
    const user = userEvent.setup();
    renderApp('#/setup/availability', seeded());
    const end = screen.getByLabelText(/Daily end time/);
    await user.clear(end);
    await user.type(end, '08:00');
    const len = screen.getByLabelText(/Preferred session length/);
    await user.clear(len);
    await user.type(len, '200');
    await user.click(screen.getByRole('button', { name: 'Save availability' }));
    expect(screen.getByText('End time must be after the start time.')).toBeInTheDocument();
    expect(screen.getByText(/Session length must be between 25 and 120/)).toBeInTheDocument();
  });
});

describe('subjects and topics forms', () => {
  it('empty subject form shows helpful messages and adds nothing', async () => {
    const user = userEvent.setup();
    const { store } = renderApp('#/setup/subjects', seeded());
    const form = screen.getByRole('form', { name: 'New subject' });
    await user.click(within(form).getByRole('button', { name: 'Add subject' }));
    expect(within(form).getByText('Subject name is required.')).toBeInTheDocument();
    expect(within(form).getByText('Choose the exam date.')).toBeInTheDocument();
    const r = loadData(store);
    expect(r.status === 'ok' && r.data.subjects).toEqual([]);
    expect(screen.getByText('No subjects yet')).toBeInTheDocument();
  });

  it('exam before plan start requires confirmation', async () => {
    const user = userEvent.setup();
    const { store } = renderApp('#/setup/subjects', seeded());
    const form = screen.getByRole('form', { name: 'New subject' });
    await user.type(within(form).getByLabelText(/Subject name/), 'History');
    await user.type(within(form).getByLabelText(/Exam date/), '2026-01-01');
    await user.click(within(form).getByRole('button', { name: 'Add subject' }));
    const dialog = screen.getByRole('dialog', { name: 'Exam date is before your plan start' });
    await user.click(within(dialog).getByRole('button', { name: 'Go back and fix' }));
    let r = loadData(store);
    expect(r.status === 'ok' && r.data.subjects).toEqual([]);
    await user.click(within(form).getByRole('button', { name: 'Add subject' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save anyway' }));
    r = loadData(store);
    expect(r.status === 'ok' && r.data.subjects.map((s) => s.name)).toEqual(['History']);
    expect(screen.getByText(/This exam is before your plan start/)).toBeInTheDocument();
  });

  it('empty topic form shows messages; double submit adds a topic only once', async () => {
    const user = userEvent.setup();
    const { store } = renderApp('#/setup/subjects', seeded((d) => { d.subjects = [subject('s1', '2026-02-01', { name: 'Maths' })]; }));
    await user.click(screen.getByRole('button', { name: 'Add topic' }));
    const dialog = screen.getByRole('dialog');
    const est = within(dialog).getByLabelText(/Estimated study time/);
    await user.clear(est);
    await user.click(within(dialog).getByRole('button', { name: 'Add topic' }));
    expect(within(dialog).getByText('Topic title is required.')).toBeInTheDocument();
    expect(within(dialog).getByText(/more than 0 minutes/)).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Topic title/), 'Limits');
    await user.type(est, '90');
    const btn = within(dialog).getByRole('button', { name: 'Add topic' });
    await user.dblClick(btn);
    const r = loadData(store);
    expect(r.status === 'ok' && r.data.topics.map((t) => t.title)).toEqual(['Limits']);
  });
});

describe('commitments form', () => {
  it('validates and adds a weekly commitment', async () => {
    const user = userEvent.setup();
    renderApp('#/setup/commitments', seeded());
    const form = screen.getByRole('form', { name: 'Commitment' });
    await user.click(within(form).getByRole('button', { name: 'Add commitment' }));
    expect(within(form).getByText(/Give this commitment a name/)).toBeInTheDocument();
    expect(within(form).getByText('Pick at least one weekday.')).toBeInTheDocument();
    await user.type(within(form).getByLabelText(/Label/), 'Lab');
    await user.click(within(form).getByRole('checkbox', { name: 'Tuesday' }));
    await user.click(within(form).getByRole('button', { name: 'Add commitment' }));
    expect(within(screen.getByRole('list', { name: 'Commitments' })).getByText('Lab')).toBeInTheDocument();
  });
});

describe('session completion', () => {
  it('asks whether the topic is done and does not auto-complete multi-session topics', async () => {
    const user = userEvent.setup();
    const store = seeded((d) => {
      d.subjects = [subject('s1', '2026-02-01', { name: 'Maths' })];
      d.topics = [topic('t1', 's1', 100, { title: 'Limits' })];
      d.sessions = [session('a', { topicId: 't1', subjectId: 's1', date: '2026-01-05', start: 660 }), session('b', { topicId: 't1', subjectId: 's1', date: '2026-01-06', start: 660 })];
    });
    renderApp('#/dashboard', store);
    await user.click(screen.getByRole('button', { name: /Mark complete: Limits/ }));
    const dialog = screen.getByRole('dialog', { name: 'Mark session complete' });
    expect(within(dialog).getByRole('group', { name: /Is “Limits” now completely done/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Not yet' })).toBeChecked();
    const actual = within(dialog).getByLabelText('Actual minutes studied');
    await user.clear(actual);
    await user.type(actual, '45');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    const r = loadData(store);
    expect(r.status === 'ok' && r.data.sessions[0]).toMatchObject({ status: 'completed', actualMinutes: 45, duration: 50 });
    expect(r.status === 'ok' && r.data.topics[0]!.status).toBe('in_progress');
    expect(screen.getByTestId('metric-topics')).toHaveTextContent('0 / 1');
  });
});

describe('mock test clipboard fallback', () => {
  it('selects the text and shows manual-copy instructions when the Clipboard API is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    renderApp('#/mock-test', seeded((d) => { d.subjects = [subject('s1', '2026-02-01', { name: 'Maths' })]; d.topics = [topic('t1', 's1', 100, { title: 'Limits' })]; }));
    const area = screen.getByLabelText(/Prompt text/) as HTMLTextAreaElement;
    expect(area.value).toContain('Subject: Maths');
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByText(/Copying isn’t available in this browser/)).toBeInTheDocument();
    expect(area).toHaveFocus();
    expect(area.selectionEnd - area.selectionStart).toBe(area.value.length);
  });

  it('copies with the Clipboard API and confirms', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderApp('#/mock-test', seeded((d) => { d.subjects = [subject('s1', '2026-02-01', { name: 'Maths' })]; d.topics = [topic('t1', 's1', 100, { title: 'Limits' })]; }));
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Limits'));
    expect(await screen.findByText('Prompt copied to clipboard')).toBeInTheDocument();
  });
});

describe('recovery', () => {
  it('shows the recovery screen for corrupted data and never overwrites it', async () => {
    const store = memoryStore();
    store.setItem(DATA_KEY, '{broken');
    renderApp('#/dashboard', store);
    expect(screen.getByRole('heading', { name: 'We couldn’t read your saved data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download raw backup' })).toBeInTheDocument();
    await waitFor(() => expect(store.getItem(DATA_KEY)).toBe('{broken'));
  });
});
