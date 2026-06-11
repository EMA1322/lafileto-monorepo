import styles from './StateBlock.module.css';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function StateBlock({
  action,
  className = '',
  description,
  status = 'empty',
  title,
  ...props
}) {
  const isLoading = status === 'loading';
  const role = status === 'error' ? 'alert' : 'status';

  return (
    <section className={cx(styles.block, styles[status], className)} role={role} {...props}>
      {isLoading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {title ? <h2 className={styles.title}>{title}</h2> : null}
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
