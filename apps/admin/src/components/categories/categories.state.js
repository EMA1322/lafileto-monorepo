// Admin / Categories state & data layer
// Comentarios en español, código en inglés.

import { apiFetch } from '@/utils/api.js';
import { showToast } from '@/utils/snackbar.js';

import {
  MODULE_KEY,
  DEFAULT_PAGE_SIZE,
  filterItemsByActive,
  mapCategoryFromApi,
  mapErrorToMessage,
  normalizeFilterActive,
  normalizeOrder,
} from './categories.helpers.js';

const subscribers = new Set();

export const state = {
  items: [],
  meta: {
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    pageCount: 1,
  },
  filters: {
    search: '',
    filterActive: 'all',
    order: 'asc',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  },
  loading: false,
  error: null,
};

function notify() {
  const snapshot = getSnapshot();
  subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[categories] subscriber failed', err);
    }
  });
}

/** Devuelve un snapshot inmutable del estado. */
export function getSnapshot() {
  const items = Array.isArray(state.items) ? state.items.slice() : [];
  const viewItems = filterItemsByActive(items, state.filters.filterActive);
  const meta = {
    total: Number(state.meta.total) || 0,
    page: Number(state.meta.page) || 1,
    pageSize: Number(state.meta.pageSize) || DEFAULT_PAGE_SIZE,
    pageCount: Number(state.meta.pageCount) || 1,
  };
  return {
    items,
    viewItems,
    meta,
    filters: { ...state.filters },
    loading: state.loading,
    error: state.error,
  };
}

/** Permite reaccionar a cambios del estado local. */
export function subscribe(listener) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function setLoading(flag) {
  state.loading = !!flag;
}

function setError(err) {
  state.error = err || null;
}

function setItems(items, meta) {
  state.items = Array.isArray(items) ? items : [];
  sortItems();
  state.meta = {
    total: Number(meta?.total) || state.items.length,
    page: Number(meta?.page) || state.filters.page,
    pageSize: Number(meta?.pageSize) || state.filters.pageSize,
    pageCount: Math.max(1, Number(meta?.pageCount) || Math.ceil((Number(meta?.total) || state.items.length || 1) / (Number(meta?.pageSize) || state.filters.pageSize || DEFAULT_PAGE_SIZE))),
  };
  state.filters.page = state.meta.page;
}

function sortItems() {
  if (!Array.isArray(state.items)) return;
  const direction = state.filters.order === 'desc' ? -1 : 1;
  state.items.sort((a, b) => {
    const nameA = (a?.name || '').toLocaleLowerCase();
    const nameB = (b?.name || '').toLocaleLowerCase();
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' }) * direction;
  });
}

function upsertCategoryInState(category) {
  if (!category || typeof category !== 'object') return null;
  if (!category.id) return null;

  const normalized = mapCategoryFromApi(category);
  if (!normalized) return null;

  const index = state.items.findIndex((item) => String(item.id) === String(normalized.id));
  if (index >= 0) {
    state.items.splice(index, 1, normalized);
  } else {
    state.items.push(normalized);
    state.meta.total = (Number(state.meta.total) || 0) + 1;
  }

  sortItems();

  const estimatedTotal = Math.max(state.items.length, Number(state.meta.total) || 0);
  const pageSize = Number(state.filters.pageSize) || DEFAULT_PAGE_SIZE;
  state.meta.pageCount = Math.max(1, Math.ceil(estimatedTotal / pageSize));
  state.meta.pageSize = pageSize;
  state.meta.page = Number(state.filters.page) || 1;

  notify();
  return normalized;
}

function removeCategoryFromState(categoryId) {
  const index = state.items.findIndex((item) => String(item.id) === String(categoryId));
  if (index === -1) return false;

  state.items.splice(index, 1);
  state.meta.total = Math.max(0, (Number(state.meta.total) || 0) - 1);
  const estimatedTotal = Math.max(state.items.length, Number(state.meta.total) || 0);
  const pageSize = Number(state.filters.pageSize) || DEFAULT_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(Math.max(1, estimatedTotal) / pageSize));
  state.meta.pageCount = pageCount;
  if (state.filters.page > pageCount) {
    state.filters.page = pageCount;
  }
  state.meta.page = state.filters.page;

  notify();
  return true;
}

/** Construye los parámetros de consulta para la API real. */
function buildQueryParams() {
  const params = {
    page: state.filters.page,
    pageSize: state.filters.pageSize,
    order: state.filters.order,
  };
  if (state.filters.search) {
    params.search = state.filters.search;
  }
  return params;
}

/** Carga categorías desde la API. */
export async function fetchCategories({ silentToast = false } = {}) {
  setLoading(true);
  setError(null);
  notify();

  try {
    const params = buildQueryParams();
    const response = await apiFetch('/categories', {
      method: 'GET',
      params,
      showErrorToast: false,
    });

    if (!response?.ok) {
      throw response?.error || { code: 'UNKNOWN', message: 'No se pudo cargar el listado.' };
    }

    const data = response.data || {};
    const meta = data.meta || response.meta || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const mapped = items.map(mapCategoryFromApi).filter(Boolean);

    setItems(mapped, {
      total: meta.total ?? meta.count ?? mapped.length,
      page: meta.page ?? params.page,
      pageSize: meta.pageSize ?? params.pageSize,
      pageCount: meta.pageCount,
    });
    setLoading(false);
    notify();
    return getSnapshot();
  } catch (err) {
    console.error('[categories] fetchCategories failed', err);
    setItems([], { total: 0, page: state.filters.page, pageSize: state.filters.pageSize, pageCount: 1 });
    setLoading(false);
    setError(err);
    notify();
    if (!silentToast) {
      showToast({ message: mapErrorToMessage(err, 'No se pudo cargar el listado.'), type: 'error', code: err?.code });
    }
    throw err;
  }
}

/** Normaliza el término de búsqueda y actualiza filtros. */
export function setSearch(search) {
  state.filters.search = String(search || '').trim();
  state.filters.page = 1;
  notify();
}

export function setFilterActive(filter) {
  state.filters.filterActive = normalizeFilterActive(filter);
  state.filters.page = 1;
  notify();
}

export function setOrder(order) {
  state.filters.order = normalizeOrder(order);
  state.filters.page = 1;
  notify();
}

export function setPage(page) {
  const pageNumber = Math.max(1, Number(page) || 1);
  state.filters.page = pageNumber;
  notify();
}

export function setPageSize(pageSize) {
  const size = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE);
  state.filters.pageSize = size;
  state.meta.pageSize = size;
  state.filters.page = 1;
  notify();
}

export function getModuleKey() {
  return MODULE_KEY;
}

export function findCategoryById(categoryId) {
  if (!categoryId) return null;
  return state.items.find((item) => String(item.id) === String(categoryId)) || null;
}

export async function createCategory(payload) {
  const body = {
    name: String(payload?.name || '').trim(),
  };
  if (payload?.imageUrl) {
    body.imageUrl = String(payload.imageUrl).trim();
  }

  const response = await apiFetch('/categories', {
    method: 'POST',
    body,
    showErrorToast: false,
  });

  if (!response?.ok) {
    throw response?.error || { code: 'UNKNOWN', message: 'No se pudo crear la categoría.' };
  }

  const raw = response.data?.item ?? response.data?.category ?? response.data ?? null;
  const created = upsertCategoryInState(raw || body);

  try {
    await fetchCategories({ silentToast: true });
  } catch (err) {
    console.warn('[categories] refresh after create failed', err);
  }

  return created;
}

export async function updateCategory(categoryId, payload) {
  const id = encodeURIComponent(categoryId);
  const body = {};
  if (typeof payload?.name !== 'undefined') {
    body.name = String(payload.name || '').trim();
  }
  if (typeof payload?.imageUrl !== 'undefined') {
    body.imageUrl = payload.imageUrl ? String(payload.imageUrl).trim() : '';
  }

  const response = await apiFetch(`/categories/${id}`, {
    method: 'PATCH',
    body,
    showErrorToast: false,
  });

  if (!response?.ok) {
    throw response?.error || { code: 'UNKNOWN', message: 'No se pudo actualizar la categoría.' };
  }

  const raw = response.data?.item ?? response.data?.category ?? response.data ?? { id: categoryId, ...payload };
  const updated = upsertCategoryInState({ id: categoryId, ...raw });

  try {
    await fetchCategories({ silentToast: true });
  } catch (err) {
    console.warn('[categories] refresh after update failed', err);
  }

  return updated;
}

export async function deleteCategory(categoryId) {
  const id = encodeURIComponent(categoryId);
  const response = await apiFetch(`/categories/${id}`, {
    method: 'DELETE',
    showErrorToast: false,
  });

  if (!response?.ok) {
    throw response?.error || { code: 'UNKNOWN', message: 'No se pudo eliminar la categoría.' };
  }

  removeCategoryFromState(categoryId);

  try {
    await fetchCategories({ silentToast: true });
  } catch (err) {
    console.warn('[categories] refresh after delete failed', err);
  }

  return true;
}

export async function toggleCategoryActive(categoryId, nextActive) {
  const category = findCategoryById(categoryId);
  if (!category) {
    throw Object.assign(new Error('Categoría no encontrada.'), {
      code: 'RESOURCE_NOT_FOUND',
    });
  }

  const desiredState = typeof nextActive === 'boolean' ? nextActive : !category.active;
  const previous = { ...category };

  upsertCategoryInState({ ...category, active: desiredState });

  const response = await apiFetch(`/categories/${encodeURIComponent(categoryId)}`, {
    method: 'PATCH',
    body: { active: desiredState },
    showErrorToast: false,
  });

  if (!response?.ok) {
    upsertCategoryInState(previous);
    throw response?.error || { code: 'UNKNOWN', message: 'No se pudo actualizar el estado.' };
  }

  const raw = response.data?.item ?? response.data?.category ?? response.data ?? { id: categoryId, active: desiredState };
  upsertCategoryInState({ id: categoryId, ...raw });
  return findCategoryById(categoryId);
}
