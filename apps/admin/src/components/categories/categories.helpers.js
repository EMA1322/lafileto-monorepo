// Admin / Categories helpers
// Comentarios en español, código en inglés.

export const MODULE_KEY = 'categories';
export const MODULE_KEY_ALIAS = 'category';
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function renderStatusBadge(active) {
  return active
    ? '<span class="badge badge--success">Activo</span>'
    : '<span class="badge badge--muted">Inactivo</span>';
}

/** Escape seguro para inyectar texto en HTML. */
export function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Escape seguro para atributos HTML. */
export function escapeAttr(value) {
  return escapeHTML(value);
}

/** Normaliza errores con mensajes amigables. */
export function mapErrorToMessage(err, fallback = 'Ocurrió un error al procesar la solicitud.') {
  const code = String(err?.code || '').toUpperCase();
  if (code === 'CATEGORY_NAME_CONFLICT') return 'Ya existe una categoría con ese nombre.';
  if (code === 'VALIDATION_ERROR') return 'Revisá los datos: hay campos inválidos.';
  if (code === 'RBAC_FORBIDDEN' || code === 'PERMISSION_DENIED') return 'No tenés permisos para esta acción.';
  if (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') return 'Iniciá sesión / Tu sesión expiró.';
  if (code === 'RATE_LIMITED') return 'Demasiadas solicitudes. Probá en unos minutos.';
  return err?.message || fallback;
}

/**
 * Mapea la respuesta de la API a un view-model plano para la tabla.
 * - Garantiza tipos consistentes y defaults seguros.
 */
export function mapCategoryFromApi(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const id = entry.id ?? entry.categoryId ?? entry.uuid ?? null;
  const name = entry.name ?? entry.title ?? '';
  const imageUrl = entry.imageUrl ?? entry.image_url ?? entry.thumbnail ?? '';
  const active = typeof entry.active === 'boolean'
    ? entry.active
    : String(entry.status ?? '').toLowerCase() !== 'inactive';
  const productCountRaw = entry.productCount ?? entry.productsCount ?? entry.products_count ?? entry.count ?? null;
  const productCount = Number.isFinite(Number(productCountRaw)) ? Number(productCountRaw) : 0;

  return {
    id: id != null ? String(id) : '',
    name: String(name || ''),
    imageUrl: imageUrl ? String(imageUrl) : '',
    active,
    productCount,
  };
}

/**
 * Filtra los ítems según el estado activo.
 * - filterActive: 'all' | 'active' | 'inactive'.
 */
export function filterItemsByActive(items, filterActive = 'all') {
  if (!Array.isArray(items) || filterActive === 'all') {
    return Array.isArray(items) ? items.slice() : [];
  }

  const predicate = filterActive === 'active'
    ? (item) => item?.active === true
    : (item) => item?.active === false;
  return items.filter(predicate);
}

/** Calcula resumen textual de la paginación. */
export function formatSummary({ total = 0, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  if (total === 0) return 'Sin resultados';
  return `${first}–${last} de ${total}`;
}

/** Normaliza la dirección de orden. */
export function normalizeOrder(order) {
  return String(order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
}

/** Normaliza el filtro de estado. */
export function normalizeFilterActive(value) {
  const normalized = String(value || 'all').toLowerCase();
  if (normalized === 'active' || normalized === 'inactive') return normalized;
  return 'all';
}
