import styles from './AppShell.module.css';

export function AppShell({ as: Tag = 'section', children, className = '', ...props }) {
  return (
    <Tag className={`${styles.appShell} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function PageContainer({ as: Tag = 'div', children, className = '' }) {
  return <Tag className={`${styles.pageContainer} ${className}`.trim()}>{children}</Tag>;
}

export function Section({ as: Tag = 'section', children, className = '', ...props }) {
  return (
    <Tag className={`${styles.section} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function SectionHeader({ title, description, children, className = '' }) {
  return (
    <header className={`${styles.sectionHeader} ${className}`.trim()}>
      <div>
        {title ? <h2 className={styles.sectionTitle}>{title}</h2> : null}
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {children}
    </header>
  );
}
