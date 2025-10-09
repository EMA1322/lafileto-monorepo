// ======================================================
// showSnackbar.js — Cliente
// Muestra un snackbar flotante accesible (A11y)
// ======================================================

let hideTimer = null; // ⏱️ Mantiene referencia al timeout para evitar cierres anticipados

/**
 * Muestra un snackbar flotante con mensaje
 * - Accesible: role="status", aria-live="polite", aria-atomic="true"
 * - Un solo contenedor en toda la app
 * - Mantiene la misma duración (2.5s) y estilo visual
 * @param {string} message - Texto a mostrar (se usa textContent para evitar inyecciones)
 */
export function showSnackbar(message) {
  // Busca un contenedor existente
  let snackbar = document.querySelector(".snackbar");

  // Si no existe, lo crea con atributos de accesibilidad
  if (!snackbar) {
    snackbar = document.createElement("div");
    snackbar.classList.add("snackbar");
    // Atributos de accesibilidad para lectores de pantalla
    snackbar.setAttribute("role", "status");
    snackbar.setAttribute("aria-live", "polite");
    snackbar.setAttribute("aria-atomic", "true");
    snackbar.setAttribute("aria-hidden", "true"); // se actualizará al mostrar
    document.body.appendChild(snackbar);
  }

  // Actualiza el mensaje de forma segura (sin HTML)
  snackbar.textContent = message;

  // Asegura estado visible y accesible
  snackbar.classList.add("visible");
  snackbar.setAttribute("aria-hidden", "false");

  // Limpia cualquier timer anterior para evitar "parpadeos" si llegan mensajes seguidos
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  // Oculta el snackbar después de 2.5s (misma UX)
  hideTimer = setTimeout(() => {
    snackbar.classList.remove("visible");
    snackbar.setAttribute("aria-hidden", "true");
  }, 2500);
}
