import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}

/** Visible label + input + inline error/hint, wired with aria-describedby. */
export function FieldShell({ label, error, hint, required, children, className = '' }: FieldShellProps) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`.trim()}>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="req" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && <p id={hintId} className="field-hint">{hint}</p>}
      {error && (
        <p id={errId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: string; error?: string | undefined; hint?: ReactNode; className?: string };

export function TextField({ label, error, hint, className, required, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-required={required || undefined} className="input" {...rest} />}
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, className, children, required, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className="input" {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, className, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {({ id, describedBy, invalid }) => <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className="input textarea" {...rest} />}
    </FieldShell>
  );
}

/** Group of checkboxes / radios with a legend. */
export function ChoiceGroup({ legend, error, children, className = '' }: { legend: string; error?: string | undefined; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <fieldset className={`choice-group ${error ? 'field-invalid' : ''} ${className}`.trim()} aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="field-label">{legend}</legend>
      <div className="choice-row">{children}</div>
      {error && (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function Choice({ type = 'checkbox', label, ...rest }: { type?: 'checkbox' | 'radio'; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="choice">
      <input type={type} {...rest} />
      <span>{label}</span>
    </label>
  );
}
