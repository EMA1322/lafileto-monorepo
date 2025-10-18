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

<<<<<<< HEAD
import { icon } from './icons.js';

function escapeLabel(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
=======
import { STATUS } from './status.enum.js';
>>>>>>> 31282 (feat(admin/users): adopt ui kit and shared utilities)

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

<<<<<<< HEAD
/** Composición rápida de ícono + label accesible. */
export function withIcon(name, label, opts) {
  const svg = icon(name, opts);
  const safeLabel = escapeLabel(label);
  if (!svg) return safeLabel;
  return `${svg}<span class="icon-label">${safeLabel}</span>`;
=======
function resolveButtonVariant(variant = 'primary') {
  const base = 'btn';
  const map = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    success: 'btn--success',
    danger: 'btn--danger',
    ghost: 'btn--ghost',
  };
  return `${base} ${map[variant] || map.primary}`.trim();
}

function resolveButtonSize(size = 'md') {
  const map = {
    sm: 'btn--sm',
    lg: 'btn--lg',
  };
  return map[size] || '';
}

/** Construye el markup para un botón del UI kit. */
export function createButtonTemplate({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  attributes = {},
} = {}) {
  if (!label && !icon) return '';
  const classes = [resolveButtonVariant(variant)];
  const sizeClass = resolveButtonSize(size);
  if (sizeClass) classes.push(sizeClass);
  const attr = { type: 'button', ...attributes };
  const classAttr = String(attr.class || attr.className || '').trim();
  if (classAttr) classes.push(classAttr);
  attr.class = classes.join(' ');
  delete attr.className;
  const attrs = Object.entries(attr)
    .filter(([key, value]) => value != null && value !== false)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ');
  const iconMarkup = icon ? `<span class="btn__icon" aria-hidden="true">${icon}</span>` : '';
  const textMarkup = label ? `<span class="btn__label">${label}</span>` : '';
  return `<button ${attrs}>${iconMarkup}${textMarkup}</button>`;
}

/** Construye un botón circular sólo-icono. */
export function createIconButtonTemplate({
  icon,
  label,
  variant = 'ghost',
  size = 'sm',
  attributes = {},
} = {}) {
  const attr = {
    'aria-label': label || 'Acción',
    ...attributes,
    class: `${resolveButtonVariant(variant)} btn--icon ${resolveButtonSize(size)}`,
  };
  return createButtonTemplate({ label: '', icon, variant, size, attributes: attr });
}

/** Badge según estado activo/inactivo. */
export function createStatusBadgeTemplate(status) {
  const normalized = String(status || '').toUpperCase();
  const isActive = normalized === STATUS.ACTIVE;
  const className = isActive ? 'badge badge--success' : 'badge badge--muted';
  const label = isActive ? 'Activo' : 'Inactivo';
  return `<span class="${className}">${label}</span>`;
}

/** Switch accesible compatible con el UI kit. */
export function createSwitchTemplate({ checked = false, label, attributes = {} } = {}) {
  const attr = {
    role: 'switch',
    'aria-checked': checked,
    ...attributes,
  };
  const classes = ['switch'];
  const classAttr = String(attr.class || attr.className || '').trim();
  if (classAttr) classes.push(classAttr);
  attr.class = classes.join(' ');
  delete attr.className;
  const attrs = Object.entries(attr)
    .filter(([key, value]) => value != null && value !== false)
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ');
  const text = label ? `<span class="switch__label">${label}</span>` : '';
  return `<button ${attrs}><span class="switch__dot" aria-hidden="true"></span>${text}</button>`;
>>>>>>> 31282 (feat(admin/users): adopt ui kit and shared utilities)
}
