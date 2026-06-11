import styles from './Card.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Card({
  actions,
  children,
  className = '',
  description,
  header,
  title,
  variant = 'default',
  ...props
}) {
  const hasHeader = header || title || description || actions;

  return (
    <section className={cx(styles.card, styles[variant], className)} {...props}>
      {hasHeader ? (
        <header className={styles.header}>
          <div className={styles.heading}>
            {header || null}
            {title ? <h2 className={styles.title}>{title}</h2> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children ? <div className={styles.body}>{children}</div> : null}
    </section>
  );
}
