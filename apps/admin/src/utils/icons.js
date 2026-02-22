/**
 * Icon system for Admin panel
 * - Map of reusable SVG icons with consistent sizing.
 * - Helper to render inline SVG markup or upgrade placeholders.
 */

const VALID_SIZES = new Set(['xs', 'sm', 'md', 'lg', 'xl']);

const DEFAULT_STROKE_WIDTH = 1.5;
const ICON_NAME_PATTERN = /^[a-z0-9-]+$/;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assertValidIconName(name) {
  if (!ICON_NAME_PATTERN.test(String(name || ''))) {
    throw new Error(`[icons] Invalid icon name: ${name}`);
  }
}

export function getSpriteUrl() {
  return `${import.meta.env.BASE_URL}icons.svg`;
}

export function getIconHref(name) {
  assertValidIconName(name);
  return `${getSpriteUrl()}#i-${name}`;
}

export function renderIcon(name, className = 'icon', opts = {}) {
  const safeClassName = escapeHtml(className || 'icon');
  const href = getIconHref(name);
  const ariaLabel = typeof opts.ariaLabel === 'string' ? opts.ariaLabel.trim() : '';

  if (ariaLabel) {
    return `<svg class="${safeClassName}" role="img" aria-hidden="false" aria-label="${escapeHtml(ariaLabel)}"><use href="${href}"></use></svg>`;
  }

  return `<svg class="${safeClassName}" aria-hidden="true"><use href="${href}"></use></svg>`;
}

export const ICONS = {
  plus: {
    viewBox: '0 0 24 24',
    body: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  },
  edit: {
    viewBox: '0 0 24 24',
    body: '<path d="M4 17.5V20h2.5L17.81 8.69a2 2 0 0 0-2.83-2.83L4 17.5z"/><path d="M14.88 6.12l2.99 2.99"/>',
  },
  trash: {
    viewBox: '0 0 24 24',
    body:
      '<path d="M5 7h14"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-12"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  },
  user: {
    viewBox: '0 0 24 24',
    body: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  },
  users: {
    viewBox: '0 0 24 24',
    body:
      '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0"/><path d="M10.5 20a5.5 5.5 0 0 1 11 0"/>',
  },
  eye: {
    viewBox: '0 0 24 24',
    body: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  },
  phone: {
    viewBox: '0 0 24 24',
    body: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 18h4"/>',
  },
  mail: {
    viewBox: '0 0 24 24',
    body: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 7 8-7"/>',
  },
  search: {
    viewBox: '0 0 24 24',
    body: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/>',
  },
  settings: {
    viewBox: '0 0 24 24',
    body: '<circle cx="12" cy="12" r="3.25"/><path d="M12 4V2"/><path d="M12 22v-2"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="M5.64 5.64l-1.3-1.3"/><path d="M19.66 19.66l-1.3-1.3"/><path d="M5.64 18.36l-1.3 1.3"/><path d="M19.66 4.34l-1.3 1.3"/>',
  },
  'shield-check': {
    viewBox: '0 0 24 24',
    body: '<path d="M12 3l7 3v5.5c0 4.55-2.82 8.7-7 10.5-4.18-1.8-7-5.95-7-10.5V6l7-3z"/><path d="M9 12.5l2.3 2.3 3.7-3.7"/>',
    strokeLinejoin: 'round',
  },
  lock: {
    viewBox: '0 0 24 24',
    body: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  },
  unlock: {
    viewBox: '0 0 24 24',
    body: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v2"/><path d="M16 11V8a4 4 0 0 0-8 0"/>',
  },
  x: {
    viewBox: '0 0 24 24',
    body: '<path d="M6 6l12 12"/><path d="M18 6l-12 12"/>',
  },
  check: {
    viewBox: '0 0 24 24',
    body: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    body: '<path d="M6 9l6 6 6-6"/>',
  },
  'chevron-left': {
    viewBox: '0 0 24 24',
    body: '<path d="M15 6l-6 6 6 6"/>',
  },
  'chevron-right': {
    viewBox: '0 0 24 24',
    body: '<path d="M9 6l6 6-6 6"/>',
  },
  refresh: {
    viewBox: '0 0 24 24',
    body:
      '<path d="M21 3v6h-6"/><path d="M3 21v-6h6"/><path d="M5.64 8.51a9 9 0 0 1 14.36 3.49"/><path d="M18.36 15.49A9 9 0 0 1 4 12"/>',
  },
  'alert-circle': {
    viewBox: '0 0 24 24',
    body: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  },
};

/**
 * Generates inline SVG markup for a registered icon.
 * @param {string} name Icon identifier.
 * @param {object} [options]
 * @param {('xs'|'sm'|'md'|'lg'|'xl')} [options.size='md'] Visual size based on tokens.
 * @param {string} [options.className] Extra classes to append to the SVG element.
 * @param {string} [options.title] Accessible title (sets aria-labelledby).
 * @returns {string} SVG string or empty string if icon is missing.
 */
export function icon(name, { size = 'md', className = '', title } = {}) {
  const data = ICONS[name];
  if (!data) {
    console.warn(`[icons] Unknown icon: ${name}`);
    return '';
  }

  const normalizedSize = VALID_SIZES.has(size) ? size : 'md';
  const extraClass = className.trim();
  const svgClass = `icon icon--${normalizedSize}${extraClass ? ` ${extraClass}` : ''}`;
  const strokeWidth = data.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const viewBox = data.viewBox || '0 0 24 24';
  const fill = data.fill ?? 'none';
  const stroke = data.stroke ?? 'currentColor';
  const strokeLinecap = data.strokeLinecap ?? 'round';
  const strokeLinejoin = data.strokeLinejoin ?? 'round';
  const label = typeof title === 'string' && title.trim() ? title.trim() : '';
  const safeLabel = label ? escapeHtml(label) : '';
  const titleId = safeLabel ? `icon-${name}-${Math.random().toString(36).slice(2, 10)}` : '';
  const accessibility = safeLabel
    ? `role="img" aria-labelledby="${titleId}"`
    : 'aria-hidden="true" focusable="false"';
  const titleMarkup = safeLabel ? `<title id="${titleId}">${safeLabel}</title>` : '';

  return `<svg class="${svgClass}" viewBox="${viewBox}" stroke-width="${strokeWidth}" stroke="${stroke}" fill="${fill}" stroke-linecap="${strokeLinecap}" stroke-linejoin="${strokeLinejoin}" ${accessibility}>${titleMarkup}${data.body}</svg>`;
}

/**
 * Resolves sprite hrefs for declarative icons ([data-icon]) in a BASE_URL-safe way.
 * Supports:
 * - <svg data-icon="name"><use></use></svg>
 * - <svg><use data-icon="name"></use></svg>
 * - legacy placeholders (e.g. <span data-icon="plus">) via inline fallback.
 * @param {ParentNode} [root=document] Root element to scan.
 */
export function mountIcons(root = document) {
  const scope = root instanceof Element || root instanceof DocumentFragment ? root : document;
  const placeholders = scope.querySelectorAll('[data-icon]');
  if (!placeholders.length) return;

  placeholders.forEach((el) => {
    const elementName = el.getAttribute('data-icon');
    const isSvg = el instanceof SVGElement && el.tagName.toLowerCase() === 'svg';
    const isUse = el instanceof SVGElement && el.tagName.toLowerCase() === 'use';

    if (isSvg || isUse) {
      const name = (elementName || '').trim();
      if (!name) return;
      const href = getIconHref(name);
      const useEl = isUse ? el : (el.querySelector('use') || el.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'use')));

      if (useEl.getAttribute('href') !== href) {
        useEl.setAttribute('href', href);
      }
      if (useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') !== href) {
        useEl.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
      }
      return;
    }

    const name = elementName;
    if (!name) return;

    const sizeClass = Array.from(el.classList || []).find((cls) => cls.startsWith('icon--'));
    const size = sizeClass ? sizeClass.replace('icon--', '') : 'md';
    const additional = Array.from(el.classList || []).filter((cls) => cls !== 'icon' && !cls.startsWith('icon--')).join(' ');

    const dataTitle = el.getAttribute('data-icon-title');
    const isDecorative = el.getAttribute('aria-hidden') === 'true';
    const fallbackTitle = !isDecorative ? (el.getAttribute('aria-label') || el.getAttribute('title') || '') : '';
    const svgString = icon(name, {
      size,
      className: additional,
      title: dataTitle || fallbackTitle || undefined,
    });

    if (!svgString) return;

    const template = document.createElement('template');
    template.innerHTML = svgString.trim();
    const svgEl = template.content.firstElementChild;
    if (!svgEl) return;

    if (isDecorative && !svgEl.hasAttribute('aria-hidden')) {
      svgEl.setAttribute('aria-hidden', 'true');
      svgEl.removeAttribute('aria-labelledby');
    }

    el.replaceWith(svgEl);
  });
}

export default icon;
