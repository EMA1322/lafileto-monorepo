import { cloneElement, isValidElement } from 'react';
import styles from './IconAction.module.css';

const ALLOWED_VARIANTS = new Set(['neutral', 'primary', 'danger']);

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function assertLabel(label) {
  if (typeof label !== 'string' || label.trim().length === 0) {
    throw new Error('IconAction requires a non-empty label.');
  }
}

function assertIcon(icon) {
  if (icon === null || icon === undefined || icon === false) {
    throw new Error('IconAction requires an icon.');
  }
}

function renderIcon(icon) {
  if (isValidElement(icon)) {
    return cloneElement(icon, {
      'aria-hidden': 'true',
      focusable: 'false',
      className: cx(styles.icon, icon.props.className),
    });
  }

  return (
    <span className={styles.icon} aria-hidden="true">
      {icon}
    </span>
  );
}

export default function IconAction({
  className = '',
  disabled = false,
  icon,
  label,
  onClick,
  type = 'button',
  variant = 'neutral',
  ...props
}) {
  assertLabel(label);
  assertIcon(icon);

  const normalizedVariant = ALLOWED_VARIANTS.has(variant) ? variant : 'neutral';

  return (
    <button
      {...props}
      aria-label={label}
      className={cx(styles.action, styles[normalizedVariant], className)}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {renderIcon(icon)}
      <span className={styles.tooltip} aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
