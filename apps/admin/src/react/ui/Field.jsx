import { useId } from 'react';
import styles from './Field.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function renderFieldFrame({ children, className = '', error, hint, id, label, required }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cx(styles.field, className)}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}
      {children({ describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined })}
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className = '', error, hint, id, label, required = false, ...props }) {
  const generatedId = useId();
  const inputId = id || `admin-react-input-${generatedId}`;

  return renderFieldFrame({
    className,
    error,
    hint,
    id: inputId,
    label,
    required,
    children: ({ describedBy }) => (
      <input
        className={cx(styles.control, error && styles.invalid)}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
    ),
  });
}

export function Select({
  children,
  className = '',
  error,
  hint,
  id,
  label,
  required = false,
  ...props
}) {
  const generatedId = useId();
  const selectId = id || `admin-react-select-${generatedId}`;

  return renderFieldFrame({
    className,
    error,
    hint,
    id: selectId,
    label,
    required,
    children: ({ describedBy }) => (
      <select
        className={cx(styles.control, styles.select, error && styles.invalid)}
        id={selectId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
    ),
  });
}
