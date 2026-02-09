// // Admin / Categorías — reactive state + API
// // Comentarios en español, código en inglés.

import { apiFetch } from '../../utils/api.js';
import { computePageCount } from '../../utils/helpers.js';
import {
  MODULE_KEY,
  DEFAULT_PAGE_SIZE,
  normalizeFilterActive,
  normalizeOrder,
  mapCategoryFromApi,
  filterItemsByActive,
} from './categories.helpers.js';

/** Estado global (sin framework) */
export const state = {
  items: [],
  meta: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, pageCount: 1 },
  q: '',
  status: 'all', // 'all' | 'active' | 'inactive'
  orderBy: 'name', // por ahora ordenamos por nombre
  orderDir: 'asc', // 'asc' | 'desc'
  loading: false,
  loaded: false,
  error: null,
};

const subscribers = new Set();

/** Expone la key del módulo (util para RBAC y data-* en el contenedor). */
export function getModuleKey() {
  return MODULE_KEY;
}

/** Suscripción simple para render reactivo. */
export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Notifica a los subs con el snapshot actual. */
export function notify(container) {
  for (const cb of subscribers) cb(getSnapshot(), container);
}

/** Copia inmutable del estado (para render). */
export function getSnapshot() {
  const items = state.items.slice();
  const viewItems = filterItemsByActive(items, state.status);
  const meta = { ...state.meta };
  return {
    items,
    viewItems,
    meta: {
      page: meta.page ?? 1,
      pageSize: meta.pageSize ?? DEFAULT_PAGE_SIZE,
      total: meta.total ?? items.length,
      pageCount: meta.pageCount ?? 1,
    },
    loading: Boolean(state.loading),
    loaded: Boolean(state.loaded),
    error: state.error,
    q: state.q,
    status: state.status,
    orderBy: state.orderBy,
    orderDir: state.orderDir,
  };
}

/** Mutadores de filtros/paginación */
export function setSearch(v) {
  state.q = String(v ?? '').trim();
}
export function setFilterActive(v) {
  state.status = normalizeFilterActive(v);
}
export function setOrder(dir) {
  state.orderDir = normalizeOrder(dir);
}
export function setPage(n) {
  const p = Number(n || 1);
  const minPage = 1;
  const maxPage = Number.isFinite(Number(state.meta?.pageCount))
    ? Math.max(minPage, Number(state.meta.pageCount))
    : null;
  const normalized = Number.isFinite(p) ? Math.floor(p) : minPage;
  if (maxPage !== null) {
    state.meta.page = Math.min(Math.max(minPage, normalized), maxPage);
  } else {
    state.meta.page = normalized < minPage ? minPage : normalized;
  }
}

/** Construye los query params actuales. */
function buildQuery() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.status && state.status !== 'all') params.set('status', state.status);
  if (state.orderBy) params.set('orderBy', state.orderBy);
  if (state.orderDir) params.set('orderDir', state.orderDir);
  params.set('page', String(state.meta.page));
  params.set('pageSize', String(state.meta.pageSize));
  return params;
}

/** GET categorías y actualiza estado. */
export async function fetchCategories({ silentToast = false } = {}) {
  const params = buildQuery();
  params.set('_', Date.now().toString(36));

  state.loading = true;
  state.error = null;
  notify();

  try {
    const res = await apiFetch(`/categories?${params.toString()}`, {
      showErrorToast: !silentToast,
    });

    const raw = res?.data?.items ?? res?.items ?? res?.data ?? [];
    const list = Array.isArray(raw) ? raw : null;
    const items = list ? list.map(mapCategoryFromApi).filter(Boolean) : state.items.slice();

    const prevMeta = state.meta;
    const apiMeta = (res?.data && res.data.meta) || res?.meta;

    const pickNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const nextMeta = { ...prevMeta };
    let metaTotal = null;
    if (apiMeta && typeof apiMeta === 'object') {
      const metaPage = pickNumber(apiMeta.page);
      const metaPageSize = pickNumber(apiMeta.pageSize);
      metaTotal = pickNumber(apiMeta.total);

      if (metaPage !== null) nextMeta.page = metaPage;
      if (metaPageSize !== null) nextMeta.pageSize = metaPageSize;
      if (metaTotal !== null) nextMeta.total = metaTotal;
    }

    if (metaTotal === null) {
      if (list) {
        nextMeta.total = items.length;
      } else if (!Number.isFinite(nextMeta.total)) {
        nextMeta.total = prevMeta.total;
      }
    }

    if (!Number.isFinite(nextMeta.total)) {
      nextMeta.total = items.length;
    }

    nextMeta.pageCount = computePageCount(nextMeta.total, nextMeta.pageSize, DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(Number(nextMeta.page)) || Number(nextMeta.page) < 1) {
      nextMeta.page = 1;
    }
    if (nextMeta.page > nextMeta.pageCount) {
      nextMeta.page = nextMeta.pageCount;
    }

    state.items = items;
    state.meta = nextMeta;
    state.loading = false;
    state.loaded = true;
    state.error = null;

    notify();

    return getSnapshot();
  } catch (err) {
    if (err && (err.code === 'PERMISSION_DENIED' || err.code === 'RBAC_FORBIDDEN')) {
      err.message = 'No tenés permisos para ver esta sección.';
    }
    state.loading = false;
    state.loaded = true;
    state.error = err;
    notify();
    throw err;
  }
}

/** Utilidades de lectura */
export function findCategoryById(id) {
  const needle = String(id);
  return state.items.find((it) => String(it.id) === needle) || null;
}

/** Crea categoría y refresca estado en memoria. */
export async function createCategory(payload) {
  const res = await apiFetch('/categories', {
    method: 'POST',
    body: payload,
    showErrorToast: true,
    showSuccessToast: true,
  });

  const raw = res?.data?.item ?? res?.data;
  const created = mapCategoryFromApi(raw);
  if (created) {
    state.items.unshift(created);
  }
  const total = Number(state.meta.total || 0) + 1;
  state.meta.total = total;
  state.meta.pageCount = computePageCount(total, state.meta.pageSize, DEFAULT_PAGE_SIZE);
  return created;
}

/** Actualiza categoría y sincroniza estado. */
function applyUpdatedCategory(id, updated) {
  if (!updated) return updated;
  const idx = state.items.findIndex((x) => String(x.id) === String(id));
  if (idx >= 0) {
    state.items[idx] = updated;
  }
  return updated;
}

export async function updateCategoryDetails(id, payload) {
  const body = {};
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'name')) {
    body.name = payload.name;
  }
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'imageUrl')) {
    body.imageUrl = payload.imageUrl;
  }

  const res = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body,
    showErrorToast: true,
    showSuccessToast: true,
  });

  const raw = res?.data?.item ?? res?.data;
  const updated = mapCategoryFromApi(raw);

  return applyUpdatedCategory(id, updated);
}

export async function patchCategoryActive(
  id,
  active,
  { silentToast = false, notifyListeners = true } = {},
) {
  const res = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: { active: Boolean(active) },
    showErrorToast: !silentToast,
    showSuccessToast: !silentToast,
  });

  const raw = res?.data?.item ?? res?.data;
  const updated = mapCategoryFromApi(raw);

  const result = applyUpdatedCategory(id, updated);
  if (notifyListeners) {
    notify();
  }
  return result;
}

/** Elimina categoría y sincroniza estado. */
export async function deleteCategory(id) {
  await apiFetch(`/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    showErrorToast: true,
    showSuccessToast: true,
  });

  const idx = state.items.findIndex((x) => String(x.id) === String(id));
  if (idx >= 0) {
    state.items.splice(idx, 1);
    const total = Math.max(0, (state.meta.total || 1) - 1);
    state.meta.total = total;
    state.meta.pageCount = computePageCount(total, state.meta.pageSize, DEFAULT_PAGE_SIZE);
  }
  return true;
}

/** Toggle activo/inactivo con optimismo + rollback ante error. */
export async function toggleCategoryActive(categoryId, nextActive, { silentToast = true } = {}) {
  // snapshot previo para poder revertir si falla
  const prev = findCategoryById(categoryId);
  if (!prev)
    throw Object.assign(new Error('Categoría no encontrada.'), { code: 'RESOURCE_NOT_FOUND' });

  // Optimista: aplicamos en memoria y notificamos
  const idx = state.items.findIndex((x) => String(x.id) === String(categoryId));
  const before = { ...prev };
  state.items[idx] = { ...prev, active: Boolean(nextActive) };
  notify();

  try {
    const updated = await patchCategoryActive(categoryId, nextActive, {
      silentToast,
      notifyListeners: false,
    });
    state.items[idx] = updated ?? state.items[idx];
    notify();
    return state.items[idx];
  } catch (err) {
    // rollback
    state.items[idx] = before;
    notify();
    throw err;
  }
}
