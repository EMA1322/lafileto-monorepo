/**
 * /admin/src/utils/ui-templates.js
 *
 * Mini utilidades de UI reutilizables (sin dependencias de frameworks).
 * Objetivo: centralizar plantillas pequeñas sin cambiar el comportamiento actual.
 *
 * Convenciones:
 * - Nombres de funciones/variables en INGLÉS.
 * - Comentarios en ESPAÑOL.
 */

import { icon } from './icons.js';

function escapeLabel(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inyecta una sola vez los estilos del loader (si no existen). */
export function ensureUiLoaderStyles() {
  if (document.getElementById('ui-loader-styles')) return;

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
  style.id = 'ui-loader-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/** Devuelve el markup del loader accesible (misma intención visual que el existente). */
export function uiLoader() {
  return `
    <div class="ui-loader" aria-busy="true" aria-live="polite">
      <span class="ui-loader__spinner" aria-hidden="true"></span>
      <span class="ui-loader__text">Cargando…</span>
    </div>
  `;
}

/** Plantilla 404 unificada (se usa desde el router). */
export function uiNotFound(hash) {
  const safe = String(hash || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <section style="text-align:center; padding:2rem;">
      <h2>404 | Página no encontrada</h2>
      <p>La ruta <strong>#${safe}</strong> no existe.</p>
      <a href="#dashboard" style="text-decoration:underline;">Volver al panel</a>
    </section>
  `;
}

/** Composición rápida de ícono + label accesible. */
export function withIcon(name, label, opts) {
  const svg = icon(name, opts);
  const safeLabel = escapeLabel(label);
  if (!svg) return safeLabel;
  return `${svg}<span class="icon-label">${safeLabel}</span>`;
}
