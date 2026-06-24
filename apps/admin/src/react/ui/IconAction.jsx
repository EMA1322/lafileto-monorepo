import {
  cloneElement,
  isValidElement,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
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

function mergeRefs(...refs) {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }
  };
}

function callHandler(handler, event) {
  if (typeof handler === 'function') {
    handler(event);
  }
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
  const tooltipId = useId();
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState(null);
  const [tooltipPlacement, setTooltipPlacement] = useState('top');
  const { onBlur, onFocus, onMouseEnter, onMouseLeave, ref, ...buttonProps } = props;

  const updateTooltipPosition = useCallback(() => {
    const buttonEl = buttonRef.current;
    const tooltipEl = tooltipRef.current;

    if (!buttonEl || !tooltipEl || typeof window === 'undefined') {
      return;
    }

    const viewportPadding = 8;
    const gap = 8;
    const buttonRect = buttonEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const preferredTop = buttonRect.top - tooltipRect.height - gap;
    const hasTopSpace = preferredTop >= viewportPadding;
    const placement = hasTopSpace ? 'top' : 'bottom';
    const top = hasTopSpace
      ? preferredTop
      : Math.min(
          buttonRect.bottom + gap,
          window.innerHeight - tooltipRect.height - viewportPadding,
        );
    const centeredLeft = buttonRect.left + buttonRect.width / 2 - tooltipRect.width / 2;
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      window.innerWidth - tooltipRect.width - viewportPadding,
    );

    setTooltipPlacement(placement);
    setTooltipStyle({
      left: `${left}px`,
      top: `${Math.max(viewportPadding, top)}px`,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isTooltipVisible) {
      return undefined;
    }

    updateTooltipPosition();

    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  const showTooltip = useCallback(() => {
    if (!disabled) {
      setIsTooltipVisible(true);
    }
  }, [disabled]);

  const hideTooltip = useCallback(() => {
    setIsTooltipVisible(false);
  }, []);

  return (
    <>
      <button
        {...buttonProps}
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        aria-label={label}
        className={cx(styles.action, styles[normalizedVariant], className)}
        disabled={disabled}
        onBlur={(event) => {
          hideTooltip();
          callHandler(onBlur, event);
        }}
        onClick={onClick}
        onFocus={(event) => {
          showTooltip();
          callHandler(onFocus, event);
        }}
        onMouseEnter={(event) => {
          showTooltip();
          callHandler(onMouseEnter, event);
        }}
        onMouseLeave={(event) => {
          hideTooltip();
          callHandler(onMouseLeave, event);
        }}
        ref={mergeRefs(buttonRef, ref)}
        type={type}
      >
        {renderIcon(icon)}
      </button>
      {isTooltipVisible && typeof document !== 'undefined'
        ? createPortal(
            <span
              className={styles.tooltip}
              data-icon-action-tooltip=""
              data-placement={tooltipPlacement}
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              style={tooltipStyle ?? undefined}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
