import styles from './ListSurface.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function ListSurface({ children, className = '', ...props }) {
  return (
    <div className={cx(styles.surface, className)} {...props}>
      {children}
    </div>
  );
}

export function ListSurfaceHeader({
  action,
  children,
  className = '',
  description,
  eyebrow,
  title,
  ...props
}) {
  return (
    <header className={cx(styles.header, className)} {...props}>
      <div className={styles.heading}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        {title ? <h1>{title}</h1> : null}
        {description ? <p>{description}</p> : null}
        {children}
      </div>
      {action ? <div className={styles.headerAction}>{action}</div> : null}
    </header>
  );
}

export function ListSurfaceFooter({ children, className = '', meta, metaId, ...props }) {
  return (
    <footer className={cx(styles.footer, className)} {...props}>
      {meta ? (
        <p className={styles.meta} id={metaId} aria-live="polite">
          {meta}
        </p>
      ) : null}
      {children}
    </footer>
  );
}

export function ListPagination({ children, className = '', label, ...props }) {
  return (
    <nav aria-label={label} className={cx(styles.pagination, className)} {...props}>
      {children}
    </nav>
  );
}
