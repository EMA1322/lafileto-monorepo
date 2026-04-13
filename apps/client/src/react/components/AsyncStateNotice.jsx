export function AsyncStateNotice({ state = 'info', message, className = '' }) {
  const role = state === 'error' ? 'alert' : 'status';
  const ariaLive = state === 'error' ? 'assertive' : 'polite';

  return (
    <p className={`ui-state ui-state--${state} ${className}`.trim()} role={role} aria-live={ariaLive}>
      {message}
    </p>
  );
}
