import { useEffect, useRef } from 'react';
import { createFocusTrap } from 'focus-trap';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isFocusable(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  return document.contains(element);
}

function getInitialFocus(container, selector) {
  if (!container) return null;

  const selected = selector ? container.querySelector(selector) : null;
  if (isFocusable(selected)) return selected;

  const firstFocusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).find(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );

  return isFocusable(firstFocusable) ? firstFocusable : container;
}

export default function useDialogFocusTrap({
  closeOnEscape = true,
  containerRef,
  initialFocus,
  onClose,
  open,
}) {
  const closeOnEscapeRef = useRef(closeOnEscape);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef(null);
  const trapRef = useRef(null);

  useEffect(() => {
    closeOnEscapeRef.current = closeOnEscape;
  }, [closeOnEscape]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (!trapRef.current) {
      trapRef.current = createFocusTrap(container, {
        fallbackFocus: container,
        allowOutsideClick: true,
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: false,
      });
    }

    const handleKeydown = (event) => {
      if (event.key !== 'Escape' || !closeOnEscapeRef.current) return;
      event.preventDefault();
      onCloseRef.current?.();
    };

    document.addEventListener('keydown', handleKeydown);

    const focusFrame = window.requestAnimationFrame(() => {
      const target = getInitialFocus(container, initialFocus);
      trapRef.current?.activate({ initialFocus: target || container });
      target?.focus?.({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeydown);
      trapRef.current?.deactivate();

      if (
        container.contains(document.activeElement) &&
        document.activeElement instanceof HTMLElement
      ) {
        document.activeElement.blur();
      }

      const previous = previousFocusRef.current;
      window.requestAnimationFrame(() => {
        if (isFocusable(previous)) {
          previous.focus({ preventScroll: true });
        }
      });
    };
  }, [containerRef, initialFocus, open]);

  useEffect(
    () => () => {
      trapRef.current?.deactivate();
      trapRef.current = null;
    },
    [],
  );
}
