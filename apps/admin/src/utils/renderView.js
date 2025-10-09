// ================================
// renderView.js - ADMIN PANEL
// Renderiza vistas dinámicamente dentro del SPA
// ================================

import { ensureUiLoaderStyles, uiLoader } from './ui-templates.js';

/**
 * Renderiza el contenido HTML en el contenedor principal (#app)
 * @param {string} path - Ruta del archivo HTML a cargar
 */
export async function renderView(path) {
  const app = document.querySelector('#app'); // Contenedor principal
  if (!app) {
    console.error('Error: No se encontró el contenedor #app');
    return;
  }

  // Loader centralizado (misma UX, ahora como componente único)
  ensureUiLoaderStyles();
  app.innerHTML = uiLoader();

  try {
    // Cache-busting leve para dev (igual a comportamiento anterior implícito)
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${path}`);

    const html = await res.text();

    // Inyección de la vista
    app.innerHTML = html;

    // Marcar visualmente el final del cargado (opcional, sin cambio visible)
    app.setAttribute('data-loaded', 'true');
  } catch (error) {
    // Manejo robusto de errores (UI amigable)
    console.error('Error al cargar la vista:', error);
    app.innerHTML = `
      <section style="text-align:center; padding:2rem; color:#b71c1c;">
        <h2>¡Ups! Ocurrió un error</h2>
        <p>No pudimos cargar la vista solicitada. Intentá nuevamente.</p>
        <p><small>Detalles: ${String(error.message || error)}</small></p>
        <a href="#dashboard" style="display:inline-block; margin-top:1rem; padding:.6rem 1rem; background:#b71c1c; color:#fff; text-decoration:none; border-radius:4px;">Ir al Panel</a>
      </section>
    `;
  }
}

