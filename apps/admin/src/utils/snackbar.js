// snackbar.js — compatibilidad con la API legada usando el nuevo toast accesible.
// Comentarios en español, código en inglés.

import toastDefault, { toast, showToast as showToastCompat, clearToasts as clearAllToasts } from './toast.js';

function resolveVariant(type) {
  if (typeof type === 'string') {
    const normalized = type.toLowerCase();
    if (normalized === 'success' || normalized === 'error' || normalized === 'info') {
      return normalized;
    }
    if (normalized === 'warning') {
      return 'info';
    }
  }
  return 'info';
}

export function showSnackbar(message, type = 'info', duration = 3000) {
  if (type && typeof type === 'object') {
    const { type: variant = 'info', duration: customDuration } = type;
    const resolved = resolveVariant(variant);
    return toast[resolved](message, { duration: customDuration ?? duration });
  }
  const resolved = resolveVariant(type);
  return toast[resolved](message, { duration });
}

export { toast, showToastCompat as showToast, clearAllToasts as clearToasts };

export default toastDefault;
