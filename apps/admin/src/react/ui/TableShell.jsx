import styles from './TableShell.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function TableShell({ children, className = '', ...props }) {
  return (
    <section className={cx(styles.shell, className)} {...props}>
      {children}
    </section>
  );
}

export function TableToolbar({ children, className = '', ...props }) {
  return (
    <div className={cx(styles.toolbar, className)} {...props}>
      {children}
    </div>
  );
}

export function TableScroll({ children, className = '', ...props }) {
  return (
    <div className={cx(styles.scroll, className)} {...props}>
      {children}
    </div>
  );
}

export function TableEmpty({ children, className = '', ...props }) {
  return (
    <div className={cx(styles.empty, className)} role="status" {...props}>
      {children}
    </div>
  );
}
