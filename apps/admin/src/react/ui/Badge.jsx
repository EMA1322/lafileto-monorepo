import styles from './Badge.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Badge({ children, className = '', variant = 'neutral', ...props }) {
  return (
    <span className={cx(styles.badge, styles[variant], className)} {...props}>
      {children}
    </span>
  );
}
