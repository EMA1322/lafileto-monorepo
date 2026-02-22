// snackbar.js — wrapper deprecado. Usar notify.js.
// Comentarios en español, código en inglés.

import notify from './notify.js';
import toastDefault, { toast, showToast as showToastCompat, clearToasts as clearAllToasts } from './toast.js';

export function showSnackbar(...args) {
  return notify(...args);
}

export { toast, showToastCompat as showToast, clearAllToasts as clearToasts };

export default toastDefault;
