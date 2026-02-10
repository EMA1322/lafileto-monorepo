// src/utils/helpers.js
//
// Funciones utilitarias de propósito general.  Se pueden reutilizar
// en diferentes módulos del proyecto Menú Digital.  Las funciones
// ofrecen formato de números, generación de IDs, sanitización de
// texto y cálculo de precios con descuento.

import {
  formatCurrency as sharedFormatCurrency,
  normalizeText as sharedNormalizeText,
} from '../../../../packages/shared-utils/src/index.js';

/**
 * Devuelve un número formateado como moneda según la localización.
 * @param {number} value - Valor numérico a formatear
 * @param {string} [locale='es-AR'] - Código de localización
 * @param {string} [currency='ARS'] - Código de moneda
 * @returns {string} - Valor formateado
 *  @param {string|null} jsonString
 * @param {*} fallback - valor por defecto si JSON.parse falla
 */

export function safeParse(jsonString, fallback = null) {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (err) {
    console.warn('[helpers.safeParse] JSON inválido. Se usa fallback.', err);
    return fallback;
  }
}

export const formatCurrency = (value, locale = 'es-AR', currency = 'ARS') =>
  sharedFormatCurrency(value, { locale, currency });

/**
 * Devuelve un número formateado como porcentaje con símbolo %.
 * @param {number} value - Valor porcentual
 * @returns {string}
 */
export function formatPercent(value) {
  const num = Number(value);
  if (isNaN(num)) return '';
  return `${num}%`;
}

/**
 * Calcula la cantidad de páginas para paginación.
 * @param {number} total
 * @param {number} pageSize
 * @param {number} [fallbackPageSize=10]
 * @returns {number}
 */
export function computePageCount(total, pageSize, fallbackPageSize = 10) {
  const safeTotal = Number.isFinite(Number(total)) && Number(total) >= 0 ? Number(total) : 0;
  const sizeNumber = Number(pageSize);
  const safeSize = Number.isFinite(sizeNumber) && sizeNumber > 0 ? sizeNumber : fallbackPageSize;
  return Math.max(1, Math.ceil(safeTotal / safeSize));
}

/**
 * Escapa caracteres especiales HTML para prevenir XSS al
 * inyectar contenido de usuario en innerHTML.
 * @param {string} str - Texto potencialmente inseguro
 * @returns {string} - Texto sanitizado
 */
export function safeText(str) {
  return String(str).replace(/[&<>"]/g, (char) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    };
    return map[char] || char;
  });
}

/**
 * Genera un identificador único con prefijo.
 * @param {string} [prefix='id'] - Prefijo opcional
 * @returns {string} - ID único
 */
export function createId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Calcula el precio con descuento si el producto está en oferta.
 * @param {{ price: number, isOffer: boolean, discount: number }} product
 * @returns {number} - Precio final con descuento aplicado
 */
export function getOfferPrice(product) {
  if (!product || !product.isOffer || !product.discount) return Number(product?.price) || 0;
  const price = Number(product.price);
  const discount = Number(product.discount);
  if (isNaN(price) || isNaN(discount)) return price;
  return price * (1 - discount / 100);
}

/** Normaliza texto: minúsculas y sin acentos (útil para búsquedas) */
export const normalizeText = sharedNormalizeText;

/** Slugify seguro (coherente con módulos) */
export function slugify(str) {
  return normalizeText(str)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

/** Valida slug: sólo minúsculas, números y guiones, 3–40 caracteres */
export function isValidSlug(str) {
  if (!str) return true; // slug es opcional
  return /^[-a-z0-9]{3,40}$/.test(String(str));
}

/** Valida longitud no vacía en rango [min, max] */
export function isNonEmptyLength(str, min = 1, max = 255) {
  const s = String(str || '').trim();
  return s.length >= min && s.length <= max;
}

/**
 * Devuelve un mensaje de error amigable para UI según error.code.
 * No obliga a usarlo: es un helper “opt-in”.
 * @param {string|undefined} code
 * @returns {string}
 */
export function getErrorMessage(code) {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Revisá los datos: hay campos inválidos.';
    case 'RESOURCE_NOT_FOUND':
      return 'El recurso no existe o fue eliminado.';
    case 'CONFLICT':
      return 'Operación en conflicto. Revisá los datos.';
    case 'CATEGORY_REASSIGN_REQUIRED':
      return 'No podés eliminar: hay productos asociados.';
    case 'PERMISSION_DENIED':
      return 'No tenés permisos para esta acción.';
    case 'AUTH_REQUIRED':
    case 'AUTH_INVALID':
      return 'Iniciá sesión o tu sesión expiró.';
    case 'RATE_LIMITED':
      return 'Demasiadas solicitudes. Probá en unos minutos.';
    default:
      return 'Ocurrió un error. Intentá nuevamente.';
  }
}

/**
 * Serializa un objeto plano a querystring.
 * - Ignora claves con valores undefined, null o string vacío.
 * - Convierte booleanos a 'true'/'false'.
 * - Acepta arrays para parámetros repetidos.
 */
export function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  if (!params || typeof params !== 'object') return '';

  const appendValue = (key, value) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      searchParams.append(key, trimmed);
      return;
    }
    if (typeof value === 'boolean') {
      searchParams.append(key, value ? 'true' : 'false');
      return;
    }
    if (Number.isFinite(value)) {
      searchParams.append(key, String(value));
      return;
    }
    searchParams.append(key, String(value));
  };

  for (const [key, rawValue] of Object.entries(params)) {
    if (!key) continue;
    const value = rawValue;
    if (Array.isArray(value)) {
      value.forEach((entry) => appendValue(key, entry));
    } else {
      appendValue(key, value);
    }
  }

  const query = searchParams.toString();
  return query;
}

/** Formatea montos monetarios en ARS (sin decimales innecesarios). */
export function formatMoney(value, { locale = 'es-AR', currency = 'ARS', minimumFractionDigits = 0 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
  }).format(number);
}

/** Debounce básico para inputs y scroll. */
export function debounce(fn, delay = 300) {
  if (typeof fn !== 'function') {
    throw new TypeError('debounce: fn must be a function');
  }
  let timer = null;
  return (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, Math.max(0, delay));
  };
}

/**
 * Actualiza el hash sin disparar navegación SPA (si history.replaceState está disponible).
 * Devuelve el hash final objetivo (ej: #products?q=cola).
 */
export function replaceHash(route, query = '') {
  if (typeof window === 'undefined') return '';

  const normalizedRoute = String(route || '').replace(/^#/, '').trim();
  if (!normalizedRoute) return '';

  const normalizedQuery = String(query || '').replace(/^\?/, '').trim();
  const targetHash = normalizedQuery ? `#${normalizedRoute}?${normalizedQuery}` : `#${normalizedRoute}`;

  if (window.location.hash === targetHash) {
    return targetHash;
  }

  if (window.history?.replaceState) {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state ?? null, '', `${pathname}${search}${targetHash}`);
    return targetHash;
  }

  window.location.hash = targetHash;
  return targetHash;
}
