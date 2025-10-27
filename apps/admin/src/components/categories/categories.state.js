// Admin / Categories — state & data layer
// Comentarios en español, código en inglés.

import { apiFetch } from '@/utils/api.js';
import { showToast } from '@/utils/snackbar.js'; // usado sólo en errores no recuperables

import {
  MODULE_KEY,
  DEFAULT_PAGE_SIZE,
  filterItemsByActive,
  mapCategoryFromApi,
  mapErrorToMessage,
  normalizeFilterActive,
  normalizeOrder,
} from './categories.helpers.js';

// Suscriptores (render) para cambios de estado.
const subscribers = new Set();

/** Estado reactivo simple (sin framework). */
export const state = {
  items: [],
  meta: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 },

  // Filtros/orden/paginación
  q: '',
  status: 'all', // 'all' | 'active' | 'inactive'
  orderBy: 'name',
  orderDir: 'asc', // 'asc' | 'desc'
};

export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

function notify(container) {
  for (const cb of subscribers) cb(getSnapshot(), container);
}

/** Devuelve una copia inmutable del estado para render. */
export function getSnapshot() {
  return {
    items: [...state.items],
    meta: { ...state.meta },
    q: state.q,
    status: state.status,
    orderBy: state.orderBy,
    orderDir: state.orderDir,
  };
}

/** Normalizadores/Setters */
export function setSearch(v) {
  state.q = String(v ?? '').trim();
}
export function setFilterActive(v) {
  state.status = normalizeFilterActive(v);
}
export function setOrder(dir) {
  state.orderDir = normalizeOrder(dir);
}
export function setPage(p) {
  const n = Number(p || 1);
  state.meta.page = n < 1 ? 1 : n;
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
  return params.toString();
}

/** Carga categorías desde la API y actualiza el estado. */
export async function fetchCategories(options = {}) {
  const { silentToast = false } = options;
  const qs = buildQuery();
  const url = `/api/v1/categories?${qs}`;

  const response = await apiFetch(url, { method: 'GET' });
  if (!response?.ok) {
    if (!silentToast) showToast(mapErrorToMessage(response?.error));
    throw response?.error || new Error('Request failed');
  }

  // El backend retorna { ok:true, data:{ items, meta } }
  const payload = response.data || {};
  const itemsRaw = payload.items || payload.data || [];
  const metaRaw = payload.meta || {};

  // Mapeo plano a view-model
  const mapped = Array.isArray(itemsRaw) ? itemsRaw.map(mapCategoryFromApi) : [];
  state.items = filterItemsByActive(mapped, state.status);
  state.meta = {
    page: Number(metaRaw.page ?? 1),
    pageSize: Number(metaRaw.pageSize ?? DEFAULT_PAGE_SIZE),
    total: Number(metaRaw.total ?? mapped.length),
  };

  return getSnapshot();
}

/** Busca una categoría en memoria por id. */
export function findCategoryById(id) {
  return state.items.find((it) => it.id === id) || null;
}

/** Inserta/actualiza un item en el estado de forma inmutable. */
function upsertCategoryInState(entity) {
  const idx = state.items.findIndex((c) => c.id === entity.id);
  if (idx === -1) state.items = [entity, ...state.items];
  else
    state.items = [
      ...state.items.slice(0, idx),
      { ...state.items[idx], ...entity },
      ...state.items.slice(idx + 1),
    ];
}

/**
 * Toggle activo/inactivo — optimista.
 * Si la API falla, se revierte el cambio y se propaga el error.
 */
export async function toggleCategoryActive(categoryId, nextActive) {
  const category = findCategoryById(categoryId);
  if (!category) {
    const err = new Error('Categoría no encontrada.');
    err.code = 'RESOURCE_NOT_FOUND';
    throw err;
  }

  // Optimista
  const previous = { ...category };
  upsertCategoryInState({ ...category, active: !!nextActive });

  try {
    const response = await apiFetch(`/api/v1/categories/${encodeURIComponent(categoryId)}`, {
      method: 'PATCH',
      body: { active: !!nextActive },
      showErrorToast: false,
    });

    if (!response?.ok) {
      // Revertir si falla
      upsertCategoryInState(previous);
      throw response?.error || new Error('Update failed');
    }

    // Confirmar con data real si viene del servidor
    const raw = response.data?.item ?? response.data;
    const fresh = raw ? mapCategoryFromApi(raw) : { ...previous, active: !!nextActive };
    upsertCategoryInState(fresh);
    return fresh;
  } catch (err) {
    upsertCategoryInState(previous);
    throw err;
  }
}
