import styles from './State.module.css';

function BaseState({ title, message, className = '', stateClass = '', role = 'status', children }) {
  return (
    <div className={`${styles.state} ${stateClass} ${className}`.trim()} role={role}>
      {title ? <p className={styles.title}>{title}</p> : null}
      {message ? <p className={styles.message}>{message}</p> : null}
      {children}
    </div>
  );
}

export function EmptyState({
  title = 'Nothing here yet',
  message = 'No content available.',
  ...props
}) {
  return <BaseState title={title} message={message} {...props} />;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  ...props
}) {
  return (
    <BaseState title={title} message={message} stateClass={styles.error} role="alert" {...props} />
  );
}

export function LoadingState({ title = 'Loading', message = 'Please wait…', ...props }) {
  return (
    <BaseState title={title} message={message} stateClass={styles.loading} {...props}>
      <span className={styles.spinner} aria-hidden="true" />
    </BaseState>
  );
}
