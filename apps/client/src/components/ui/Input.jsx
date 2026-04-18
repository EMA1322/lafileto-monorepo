import styles from './Input.module.css';

export function Input({ label, hint, error, id, className = '', inputClassName = '', ...props }) {
  const resolvedId = id || props.name;

  return (
    <label className={`${styles.field} ${className}`.trim()} htmlFor={resolvedId}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <input
        id={resolvedId}
        className={`${styles.input} ${error ? styles.inputError : ''} ${inputClassName}`.trim()}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </label>
  );
}

export function SearchInput({ className = '', inputClassName = '', ...props }) {
  return (
    <div className={`${styles.searchWrap} ${className}`.trim()}>
      <span aria-hidden="true" className={styles.searchIcon}>
        ⌕
      </span>
      <input
        type="search"
        className={`${styles.input} ${styles.searchInput} ${inputClassName}`.trim()}
        {...props}
      />
    </div>
  );
}
