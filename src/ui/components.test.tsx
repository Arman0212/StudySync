import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusPill, ProgressBar, EmptyState } from './bits';
import { ConfirmDialog } from './Modal';
import { TextField } from './Field';

describe('StatusPill', () => {
  it.each([
    ['planned', 'Planned'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['missed', 'Missed'], ['rescheduled', 'Rescheduled'],
  ] as const)('shows %s with text, not colour alone', (status, label) => {
    const { container } = render(<StatusPill status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
  it('supports topic statuses', () => {
    render(<StatusPill status="not_started" kind="topic" />);
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  it('is an accessible modal that confirms, cancels and closes on Escape', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Delete it?" message="Really?" destructive confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);
    const dialog = screen.getByRole('dialog', { name: 'Delete it?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger');
  });
  it('can disable confirmation', () => {
    render(<ConfirmDialog title="x" onConfirm={() => undefined} onCancel={() => undefined} confirmDisabled />);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });
});

describe('fields and bits', () => {
  it('links errors to inputs', () => {
    render(<TextField label="Name" error="Name is required." required value="" onChange={() => undefined} />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Name is required.');
  });
  it('progress bars expose numeric values', () => {
    render(<ProgressBar label="Maths" value={42} />);
    const bar = screen.getByRole('progressbar', { name: 'Maths' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByText('42%')).toBeInTheDocument();
  });
  it('empty states name the next action', () => {
    render(<EmptyState title="No subjects" action={<button>Add subject</button>}>Add one</EmptyState>);
    expect(screen.getByRole('button', { name: 'Add subject' })).toBeInTheDocument();
  });
});
