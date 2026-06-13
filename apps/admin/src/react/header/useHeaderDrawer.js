import { useCallback, useEffect, useRef, useState } from 'react';
import { createFocusTrap } from 'focus-trap';

const BODY_SCROLL_LOCK_DATA_ATTR = 'adminHeaderDrawerScrollLock';
const BODY_SCROLL_PREV_OVERFLOW_ATTR = 'adminHeaderDrawerPrevOverflow';

function setBodyScrollLock(locked) {
  const bodyEl = document.body;
  if (!bodyEl) return;

  if (locked) {
    if (bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR] === 'true') return;
    bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR] = 'true';
    bodyEl.dataset[BODY_SCROLL_PREV_OVERFLOW_ATTR] = bodyEl.style.overflow || '';
    bodyEl.style.overflow = 'hidden';
    return;
  }

  if (bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR] !== 'true') return;
  bodyEl.style.overflow = bodyEl.dataset[BODY_SCROLL_PREV_OVERFLOW_ATTR] || '';
  delete bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR];
  delete bodyEl.dataset[BODY_SCROLL_PREV_OVERFLOW_ATTR];
}

function getFocusableElements(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(container.querySelectorAll(selectors)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export default function useHeaderDrawer() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const toggleButtonRef = useRef(null);
  const drawerRef = useRef(null);
  const trapRef = useRef(null);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((current) => !current);
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) {
      setBodyScrollLock(false);
      if (trapRef.current) {
        trapRef.current.deactivate();
      }
      return undefined;
    }

    const drawerEl = drawerRef.current;
    setBodyScrollLock(true);

    if (drawerEl && !trapRef.current) {
      trapRef.current = createFocusTrap(drawerEl, {
        fallbackFocus: drawerEl,
        allowOutsideClick: true,
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: false,
      });
    }

    const onKeydown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeDrawer();
    };

    document.addEventListener('keydown', onKeydown);

    requestAnimationFrame(() => {
      const first = getFocusableElements(drawerEl)[0] || drawerEl;
      trapRef.current?.activate({ initialFocus: first });
      first?.focus?.({ preventScroll: true });
    });

    return () => {
      document.removeEventListener('keydown', onKeydown);
      trapRef.current?.deactivate();
      setBodyScrollLock(false);
      requestAnimationFrame(() => {
        toggleButtonRef.current?.focus?.({ preventScroll: true });
      });
    };
  }, [closeDrawer, isDrawerOpen]);

  useEffect(
    () => () => {
      trapRef.current?.deactivate();
      trapRef.current = null;
      setBodyScrollLock(false);
    },
    [],
  );

  return {
    closeDrawer,
    drawerRef,
    isDrawerOpen,
    openDrawer,
    toggleButtonRef,
    toggleDrawer,
  };
}
