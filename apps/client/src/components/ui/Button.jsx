import styles from './Button.module.css';

export function Button({ variant = 'primary', className = '', ...props }) {
  const variantClass = styles[variant] || styles.primary;
  return (
    <button
      type="button"
      className={`${styles.button} ${variantClass} ${className}`.trim()}
      {...props}
    />
  );
}

export function IconButton({ ariaLabel, className = '', ...props }) {
  return (
    <Button
      {...props}
      aria-label={ariaLabel}
      className={`${styles.iconButton} ${className}`.trim()}
    />
  );
}
