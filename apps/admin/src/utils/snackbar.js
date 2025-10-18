// Snackbar helper minimalista para toasts globales.
// - Crea un contenedor fijo en la esquina inferior derecha.
// - Permite mostrar mensajes con variantes y autocierre configurable.

let toastContainer;
const timerApi = typeof window !== 'undefined' ? window : {
  setTimeout: () => 0,
  clearTimeout: () => {},
};

// Crea el contenedor solo una vez.
function ensureContainer() {
  if (toastContainer) return toastContainer;
  if (typeof document === 'undefined') return null;
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'false');
  document.body.appendChild(toastContainer);
  return toastContainer;
}

// Normaliza la variante recibida a las clases soportadas.
function normalizeType(type) {
  const fallback = 'success';
  if (!type) return fallback;
  const normalized = String(type).toLowerCase();
  const allowed = new Set(['success', 'error', 'info', 'warning']);
  return allowed.has(normalized) ? normalized : fallback;
}

// Remueve la tarjeta con animación suave.
function dismissToast(node) {
  if (!node) return;
  node.classList.remove('toast--visible');
  const remove = () => {
    node.removeEventListener('transitionend', remove);
    node.remove();
  };
  node.addEventListener('transitionend', remove);
  // Fallback por si la animación no dispara transitionend.
  timerApi.setTimeout(() => {
    node.removeEventListener('transitionend', remove);
    if (node.isConnected) node.remove();
  }, 400);
}

/**
 * Muestra un toast con mensaje amigable.
 * @param {{ message: string, type?: 'success'|'error'|'info'|'warning', timeout?: number }} options
 * @returns {{ close: () => void }} manejador para cerrar manualmente.
 */
export function showToast(options = {}) {
  const { message, type = 'success', timeout = 2500 } = options;
  if (!message) {
    console.warn('[toast] Mensaje vacío ignorado');
    return { close: () => {} };
  }

  const container = ensureContainer();
  if (!container) {
    return { close: () => {} };
  }
  const toast = document.createElement('div');
  const variant = normalizeType(type);
  toast.className = `toast toast--${variant}`;
  toast.setAttribute('role', 'status');
  toast.textContent = String(message);

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  const safeTimeout = Math.max(1000, Number(timeout) || 2500);
  const timeoutId = timerApi.setTimeout(() => dismissToast(toast), safeTimeout);

  const close = () => {
    timerApi.clearTimeout(timeoutId);
    dismissToast(toast);
  };

  // Hover pausa la salida para facilitar la lectura.
  toast.addEventListener('mouseenter', () => timerApi.clearTimeout(timeoutId));
  toast.addEventListener('mouseleave', () => {
    if (toast.isConnected) {
      timerApi.setTimeout(() => dismissToast(toast), 800);
    }
  });

  return { close };
}

// Alias retrocompatible con el helper existente en la app.
export function showSnackbar(message, type = 'info', duration = 3000) {
  if (type && typeof type === 'object') {
    const { type: variant = 'info', duration: customDuration = 3000 } = type;
    return showToast({ message, type: variant, timeout: customDuration });
  }
  return showToast({ message, type, timeout: duration });
}

// Permite limpiar el contenedor completo (p.ej. en tests o logout).
export function clearToasts() {
  if (!toastContainer) return;
  toastContainer.querySelectorAll('.toast').forEach((node) => dismissToast(node));
}
