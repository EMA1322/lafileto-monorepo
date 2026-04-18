import styles from './Badge.module.css';

export function Badge({ tone = 'info', className = '', children }) {
  const toneClass = styles[tone] || styles.info;
  return <span className={`${styles.badge} ${toneClass} ${className}`.trim()}>{children}</span>;
}

export function StatusBadge({ isActive, activeText = 'Open', inactiveText = 'Closed', ...props }) {
  return (
    <Badge tone={isActive ? 'success' : 'danger'} {...props}>
      {isActive ? activeText : inactiveText}
    </Badge>
  );
}
