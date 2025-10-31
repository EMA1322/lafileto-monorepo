// toast.js — Notificaciones accesibles y reutilizables para Admin.
// Comentarios en español, código en inglés.

const DEFAULT_DURATION = 4500;
const MAX_TOASTS = 3;

const WIN = typeof window !== 'undefined' ? window : null;
const DOC = typeof document !== 'undefined' ? document : null;
const raf = WIN?.requestAnimationFrame
  ? WIN.requestAnimationFrame.bind(WIN)
  : (cb) => setTimeout(cb, 16);

let stackContainer = null;
const queue = [];

function ensureContainer() {
  if (stackContainer || !DOC) return stackContainer;
  const el = DOC.createElement('div');
  el.className = 'toast-stack';
  el.setAttribute('role', 'region');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-label', 'Notificaciones');
  DOC.body.appendChild(el);
  stackContainer = el;
  if (DOC.addEventListener) {
    DOC.addEventListener('keydown', onKeydown, true);
  }
  return stackContainer;
}

function onKeydown(event) {
  if (event.key !== 'Escape' || queue.length === 0) return;
  const last = queue[queue.length - 1];
  if (last) {
    last.dismiss();
  }
}

function clampDuration(ms) {
  const duration = Number(ms);
  if (!Number.isFinite(duration) || duration <= 0) return DEFAULT_DURATION;
  return Math.min(duration, 20000);
}

function computeRole(type) {
  return type === 'error' ? 'alert' : 'status';
}

function removeFromQueue(record) {
  const idx = queue.indexOf(record);
  if (idx >= 0) {
    queue.splice(idx, 1);
  }
}

function scheduleDismiss(record) {
  clearTimeout(record.timerId);
  record.start = Date.now();
  record.timerId = WIN?.setTimeout
    ? WIN.setTimeout(() => record.dismiss('timeout'), record.remaining)
    : setTimeout(() => record.dismiss('timeout'), record.remaining);
}

function pauseDismiss(record) {
  if (!record.timerId) return;
  clearTimeout(record.timerId);
  record.timerId = null;
  const elapsed = Date.now() - (record.start || Date.now());
  record.remaining = Math.max(0, record.remaining - elapsed);
}

function resumeDismiss(record) {
  if (record.timerId || record.remaining <= 0) return;
  scheduleDismiss(record);
}

function buildToast(message, type, options = {}) {
  const container = ensureContainer();
  if (!container) {
    return { dismiss: () => {} };
  }

  const text = String(message || '').trim();
  if (!text) {
    if (console?.warn) {
      console.warn('[toast] Mensaje vacío ignorado');
    }
    return { dismiss: () => {} };
  }

  const variant = typeof type === 'string' ? type.toLowerCase() : 'info';
  const allowed = new Set(['success', 'error', 'info']);
  const resolved = allowed.has(variant) ? variant : 'info';
  const duration = clampDuration(options?.duration ?? DEFAULT_DURATION);

  const toast = DOC.createElement('div');
  toast.className = `toast toast--${resolved}`;
  toast.setAttribute('role', computeRole(resolved));
  toast.setAttribute('aria-live', 'polite');

  const messageEl = DOC.createElement('p');
  messageEl.className = 'toast__message';
  messageEl.textContent = text;

  const closeBtn = DOC.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast__close';
  closeBtn.setAttribute('aria-label', 'Cerrar notificación');
  closeBtn.textContent = 'Cerrar';

  toast.append(messageEl, closeBtn);
  container.appendChild(toast);

  const record = {
    element: toast,
    type: resolved,
    timerId: null,
    start: Date.now(),
    remaining: duration,
    dismiss(reason) {
      pauseDismiss(record);
      toast.classList.remove('toast--visible');
      const finalize = () => {
        toast.removeEventListener('transitionend', finalize);
        if (toast.isConnected) {
          toast.remove();
        }
        removeFromQueue(record);
        if (queue.length === 0 && stackContainer && stackContainer.childElementCount === 0) {
          stackContainer.remove();
          stackContainer = null;
          if (DOC?.removeEventListener) {
            DOC.removeEventListener('keydown', onKeydown, true);
          }
        }
        if (typeof options?.onClose === 'function') {
          options.onClose(reason || 'manual');
        }
      };
      toast.addEventListener('transitionend', finalize);
      if (WIN?.setTimeout) {
        WIN.setTimeout(finalize, 320);
      } else {
        setTimeout(finalize, 320);
      }
    },
  };

  closeBtn.addEventListener('click', () => record.dismiss('close'));
  toast.addEventListener('mouseenter', () => pauseDismiss(record));
  toast.addEventListener('mouseleave', () => resumeDismiss(record));
  toast.addEventListener('focusin', () => pauseDismiss(record));
  toast.addEventListener('focusout', () => resumeDismiss(record));

  queue.push(record);
  while (queue.length > MAX_TOASTS) {
    const oldest = queue.shift();
    oldest?.dismiss('overflow');
  }

  raf(() => {
    toast.classList.add('toast--visible');
  });

  scheduleDismiss(record);

  return { dismiss: () => record.dismiss('manual') };
}

function show(message, options = {}) {
  const { type = 'info', duration } = options || {};
  return buildToast(message, type, { duration });
}

export const toast = {
  show,
  info(message, options) {
    return buildToast(message, 'info', options);
  },
  success(message, options) {
    return buildToast(message, 'success', options);
  },
  error(message, options) {
    return buildToast(message, 'error', options);
  },
};

export function showToast(message, options) {
  return show(message, options);
}

export function clearToasts() {
  queue.slice().forEach((record) => {
    try {
      record.dismiss('clear');
    } catch {
      /* ignore */
    }
  });
}

export default toast;
