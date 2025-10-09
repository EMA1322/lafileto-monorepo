// utils/snackbar.js — con cola (queue) y accesible
let snackbarEl = null;
let isShowing = false;
let queue = [];

/* Crea si no existe y devuelve el contenedor del snackbar */
function ensureContainer() {
  if (!snackbarEl) snackbarEl = document.getElementById("app-snackbar");
  if (!snackbarEl) {
    snackbarEl = document.createElement("div");
    snackbarEl.id = "app-snackbar";
    snackbarEl.setAttribute("role", "status");
    snackbarEl.setAttribute("aria-live", "polite");
    snackbarEl.setAttribute("aria-atomic", "true");
    snackbarEl.hidden = true;
    document.body.appendChild(snackbarEl);
  }
}

/* Setea clases por tipo (sin frameworks) */
function setTypeClass(type) {
  ensureContainer();
  const valid = ["success", "error", "info", "warning"];
  const t = String(type || "info");
  snackbarEl.classList.remove("success", "error", "info", "warning", "show");
  snackbarEl.classList.add(valid.includes(t) ? t : "info");
}

/* Procesa la cola (muestra 1 mensaje a la vez) */
function processQueue() {
  if (isShowing || queue.length === 0) return;
  isShowing = true;

  const { message, type, duration, code } = queue.shift();
  ensureContainer();
  setTypeClass(type);
  snackbarEl.textContent = String(message);
  if (code) {
    // Guardamos el code en un data-attribute para posibles métricas/telemetría futuras
    snackbarEl.dataset.code = String(code);
  } else {
    delete snackbarEl.dataset.code;
  }
  snackbarEl.hidden = false;

  // fuerza animación confiable
  requestAnimationFrame(() => {
    snackbarEl.classList.add("show");
  });

  const ms = Math.min(Math.max(Number(duration) || 3000, 600), 10000);
  setTimeout(() => {
    snackbarEl.classList.remove("show", "success", "error", "info", "warning");
    snackbarEl.hidden = true;
    snackbarEl.textContent = "";
    delete snackbarEl.dataset.code;
    isShowing = false;
    // Siguiente de la cola
    processQueue();
  }, ms);
}

/**
 * API pública: encola un mensaje snack y activa el procesamiento.
 * Soporta firma clásica y firma con objeto de opciones:
 *   showSnackbar('Mensaje', 'warning', 3000)
 *   showSnackbar('Mensaje', { type:'warning', duration:3000, code:'PERMISSION_DENIED' })
 *
 * @param {string} message
 * @param {'success'|'error'|'info'|'warning'|object} [type='info'|options]
 * @param {number} [duration=3000]
 */
export function showSnackbar(message, type = "info", duration = 3000) {
  // Firma flexible con options object
  if (type && typeof type === 'object') {
    const { type: t = 'info', duration: d = 3000, code = undefined } = type;
    queue.push({ message, type: t, duration: d, code });
  } else {
    queue.push({ message, type, duration, code: undefined });
  }
  processQueue();
}

/* (Opcional) limpiar cola rápidamente */
export function clearSnackQueue() {
  queue = [];
}
