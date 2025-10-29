// // Admin / Categorías — reactive state + API
// // Comentarios en español, código en inglés.

import { apiFetch } from '@/utils/api.js';
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
  meta: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 },
  q: '',
  status: 'all', // 'all' | 'active' | 'inactive'
  orderBy: 'name', // por ahora ordenamos por nombre
  orderDir: 'asc', // 'asc' | 'desc'
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
  // Ensure the table renderer gets filtered rows via snapshot.viewItems
  return {
    items: state.items.slice(),
    meta: { ...state.meta },
    q: state.q,
    status: state.status,
    orderBy: state.orderBy,
    orderDir: state.orderDir,
    viewItems: filterItemsByActive(state.items, state.status),
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
  state.meta.page = p < 1 ? 1 : p;
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

  const res = await apiFetch(`/categories?${params.toString()}`, {
    showErrorToast: !silentToast,
  });

  const raw = res?.data?.items ?? res?.items ?? res?.data ?? [];
  const list = Array.isArray(raw) ? raw : null;
  const items = list ? list.map(mapCategoryFromApi) : state.items.slice();

  const prevItems = state.items;
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

  const prevIds = prevItems.map((it) => String(it.id));
  const nextIds = items.map((it) => String(it.id));
  const itemsChanged =
    prevIds.length !== nextIds.length || prevIds.some((id, idx) => id !== nextIds[idx]);
  const metaChanged =
    prevMeta.page !== nextMeta.page ||
    prevMeta.pageSize !== nextMeta.pageSize ||
    prevMeta.total !== nextMeta.total;
  const changed = itemsChanged || metaChanged;

  state.items = items;
  state.meta = nextMeta;

  if (changed) notify();

  return getSnapshot();
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
  state.items.unshift(created);
  state.meta.total = (state.meta.total || 0) + 1;
  return created;
}

/** Actualiza categoría y sincroniza estado. */
export async function updateCategory(id, payload) {
  const res = await apiFetch(`/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
    showErrorToast: true,
    showSuccessToast: true,
  });

  const raw = res?.data?.item ?? res?.data;
  const updated = mapCategoryFromApi(raw);

  const idx = state.items.findIndex((x) => String(x.id) === String(id));
  if (idx >= 0) state.items[idx] = updated;

  return updated;
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
    state.meta.total = Math.max(0, (state.meta.total || 1) - 1);
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
    const res = await apiFetch(`/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      body: { active: Boolean(nextActive) },
      showErrorToast: !silentToast,
    });

    // Si backend devuelve la entidad, normalizamos y dejamos exacto
    const raw = res?.data?.item ?? res?.data ?? state.items[idx];
    state.items[idx] = mapCategoryFromApi(raw);
    notify();
    return state.items[idx];
  } catch (err) {
    // rollback
    state.items[idx] = before;
    notify();
    throw err;
  }
}
