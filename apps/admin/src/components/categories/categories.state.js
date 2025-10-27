// Admin / Categories — reactive state + API
// Comentarios en español, código en inglés.

import { apiFetch } from '@/utils/api.js';
import {
  MODULE_KEY,
  DEFAULT_PAGE_SIZE,
  normalizeFilterActive,
  normalizeOrder,
  mapCategoryFromApi,
} from './categories.helpers.js';

/** Estado global (sin framework) */
export const state = {
  items: [],
  meta: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 },
  q: '',
  status: 'all', // 'all' | 'active' | 'inactive'
  orderBy: 'name',
  orderDir: 'asc', // 'asc' | 'desc'
};

const subscribers = new Set();

/** Suscripción simple para render reactivo */
export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Notifica a los suscriptores con el snapshot actual */
function notify(container) {
  for (const cb of subscribers) cb(getSnapshot(), container);
}

/** Copia inmutable del estado (para render) */
export function getSnapshot() {
  return {
    items: state.items.slice(),
    meta: { ...state.meta },
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
  state.meta.page = p < 1 ? 1 : p;
}

/** Construye querystring desde el estado */
function buildQuery() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.status && state.status !== 'all') params.set('status', state.status);
  params.set('orderBy', state.orderBy);
  params.set('orderDir', state.orderDir);
  params.set('page', String(state.meta.page));
  params.set('pageSize', String(state.meta.pageSize));
  return params;
}

/** Carga categorías desde la API y actualiza el estado */
export async function fetchCategories({ silentToast = false } = {}) {
  const qs = buildQuery().toString();
  const response = await apiFetch(`/api/v1/categories?${qs}`, {
    method: 'GET',
    showErrorToast: !silentToast,
  });

  if (!response?.ok) return getSnapshot();

  const list = Array.isArray(response.data?.items)
    ? response.data.items.map(mapCategoryFromApi)
    : [];
  const meta = response.data?.meta ?? response.meta ?? {};

  state.items = list;
  state.meta = {
    page: Number(meta.page ?? 1),
    pageSize: Number(meta.pageSize ?? DEFAULT_PAGE_SIZE),
    total: Number(meta.total ?? list.length),
  };

  notify();
  return getSnapshot();
}

/** Utilidades de búsqueda/actualización en memoria */
export function findCategoryById(id) {
  return state.items.find((c) => c.id === id) ?? null;
}

function upsertCategoryInState(raw) {
  const cat = mapCategoryFromApi(raw);
  const idx = state.items.findIndex((c) => c.id === cat.id);
  if (idx === -1) state.items.unshift(cat);
  else state.items[idx] = { ...state.items[idx], ...cat };
  notify();
  return cat;
}

/** CRUD */
export async function createCategory(payload) {
  const res = await apiFetch(`/api/v1/categories`, { method: 'POST', body: payload });
  if (!res?.ok) throw new Error(res?.error?.message || 'No se pudo crear la categoría.');
  return upsertCategoryInState(res.data?.item ?? res.data);
}

export async function updateCategory(id, payload) {
  const res = await apiFetch(`/api/v1/categories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
  if (!res?.ok) throw new Error(res?.error?.message || 'No se pudo actualizar la categoría.');
  return upsertCategoryInState(res.data?.item ?? res.data);
}

export async function deleteCategoryById(id) {
  const res = await apiFetch(`/api/v1/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res?.ok) throw new Error(res?.error?.message || 'No se pudo eliminar la categoría.');
  state.items = state.items.filter((c) => c.id !== id);
  state.meta.total = Math.max(0, state.meta.total - 1);
  notify();
  return true;
}

/** Toggle activo con actualización optimista + rollback */
export async function toggleCategoryActive(categoryId, nextActive) {
  const category = findCategoryById(categoryId);
  if (!category) {
    throw Object.assign(new Error('Categoría no encontrada.'), { code: 'RESOURCE_NOT_FOUND' });
  }

  const desired = typeof nextActive === 'boolean' ? nextActive : !category.active;
  const previous = { ...category };

  // Optimista
  upsertCategoryInState({ ...category, active: desired });

  const res = await apiFetch(`/api/v1/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    body: { active: desired },
    showErrorToast: false,
  });

  if (!res?.ok) {
    // Rollback
    upsertCategoryInState(previous);
    const msg = res?.error?.message || 'No se pudo actualizar el estado.';
    throw Object.assign(new Error(msg), { code: res?.error?.code || 'UPDATE_FAILED' });
  }

  const raw = res.data?.item ?? res.data;
  upsertCategoryInState(raw);
  return findCategoryById(categoryId);
}
