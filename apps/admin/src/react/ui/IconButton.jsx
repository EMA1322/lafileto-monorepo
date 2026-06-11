import styles from './IconButton.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function IconButton({
  children,
  className = '',
  disabled = false,
  size = 'md',
  type = 'button',
  variant = 'ghost',
  ...props
}) {
  if (!props['aria-label'] && !props['aria-labelledby']) {
    throw new Error('IconButton requires aria-label or aria-labelledby.');
  }

  return (
    <button
      className={cx(styles.button, styles[variant], styles[size], className)}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
