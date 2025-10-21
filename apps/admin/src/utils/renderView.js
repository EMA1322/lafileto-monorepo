// ================================
// renderView.js - ADMIN PANEL
// Renderiza vistas dinámicamente dentro del SPA
// ================================

const LOADER_STYLE_ID = 'ui-loader-styles';

function ensureUiLoaderStyles() {
  if (document.getElementById(LOADER_STYLE_ID)) return;

  const css = `
  .ui-loader {
    display: grid;
    place-items: center;
    gap: .75rem;
    padding: 2rem;
    min-height: 180px;
    text-align: center;
  }
  .ui-loader__spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid rgba(0,0,0,.15);
    border-top-color: rgba(0,0,0,.6);
    animation: ui-spin 1s linear infinite;
    display: inline-block;
  }
  .ui-loader__text {
    font-size: .95rem;
    color: #333;
  }
  @keyframes ui-spin {
    to { transform: rotate(360deg); }
  }`;

  const style = document.createElement('style');
  style.id = LOADER_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

function uiLoader() {
  return `
    <div class="ui-loader" aria-busy="true" aria-live="polite">
      <span class="ui-loader__spinner" aria-hidden="true"></span>
      <span class="ui-loader__text">Cargando…</span>
    </div>
  `;
}

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

