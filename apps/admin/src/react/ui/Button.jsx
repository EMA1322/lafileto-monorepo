import styles from './Button.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Button({
  children,
  className = '',
  disabled = false,
  loading = false,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        loading && styles.loading,
        className,
      )}
      disabled={isDisabled}
      type={type}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.content}>{children}</span>
    </button>
  );
}
