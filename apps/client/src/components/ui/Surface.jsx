import styles from './Surface.module.css';

export function Surface({ as: Tag = 'div', children, className = '', ...props }) {
  return (
    <Tag className={`${styles.surface} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export function Card(props) {
  return <Surface {...props} className={`${styles.card} ${props.className || ''}`.trim()} />;
}
