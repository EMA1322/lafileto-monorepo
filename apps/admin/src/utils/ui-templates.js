/**
 * Utilidades mínimas de UI reutilizables (sin dependencias externas).
 */

import { ensureUiLoaderStyles, uiLoader, uiNotFound } from './renderView.js';

const VALID_ICON_SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSize(size) {
  return VALID_ICON_SIZES.has(size) ? size : 'sm';
}

/**
 * Devuelve el contenido interno de un botón con ícono opcional.
 * @param {object} options
 * @param {string} [options.label] Texto visible del botón.
 * @param {string} [options.iconName] Nombre del ícono (usa data-icon para mountIcons).
 * @param {('xs'|'sm'|'md'|'lg'|'xl')} [options.iconSize='sm'] Tamaño visual del ícono.
 * @param {string} [options.iconTitle] Texto accesible para el ícono.
 * @param {string} [options.labelClass='icon-label'] Clase usada para el span del label.
 * @param {string} [options.srLabel] Texto solo para lectores de pantalla.
 * @param {boolean} [options.showLabel=true] Permite ocultar el label visible.
 * @returns {string} Markup listo para inyectar en innerHTML.
 */
export function createButtonTemplate({
  label = '',
  iconName,
  iconSize = 'sm',
  iconTitle,
  labelClass = 'icon-label',
  srLabel,
  showLabel = true,
} = {}) {
  const normalizedSize = normalizeSize(iconSize);
  const hasIcon = Boolean(iconName);
  const iconTitleAttr = iconTitle ? ` data-icon-title="${escapeHtml(iconTitle)}"` : '';
  const iconMarkup = hasIcon
    ? `<span class="icon icon--${normalizedSize}" data-icon="${escapeHtml(iconName)}"${iconTitleAttr} aria-hidden="true"></span>`
    : '';
  const visibleLabel = showLabel && label
    ? `<span class="${labelClass}">${escapeHtml(label)}</span>`
    : '';
  const srOnly = srLabel ? `<span class="sr-only">${escapeHtml(srLabel)}</span>` : '';

  return `${iconMarkup}${visibleLabel}${srOnly}`.trim();
}

export { ensureUiLoaderStyles, uiLoader, uiNotFound };
