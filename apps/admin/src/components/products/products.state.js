// ============================================================================
// /admin/src/components/products/products.state.js
// Estado y operaciones de datos del módulo Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { productsApi, categoriesApi } from '@/utils/apis.js';
import { showSnackbar } from '@/utils/snackbar.js';

import {
  DEFAULT_FILTERS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  ORDER_FIELDS,
  ORDER_DIRECTIONS,
  STATUS_VALUES,
  buildQuery,
  mapProductFromApi,
} from './products.helpers.js';

const subscribers = new Set();

export const REQUEST_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error',
};

let activeProductsController = null;
let requestSequence = 0;

function normalizeBoolean(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  return 'all';
}

function sanitizeFilters(input = {}) {
  const source = { ...DEFAULT_FILTERS, ...(input || {}) };
  const filters = { ...DEFAULT_FILTERS };

  filters.q = typeof source.q === 'string' ? source.q.trim() : '';
  filters.categoryId = source.categoryId && source.categoryId !== 'all' ? String(source.categoryId) : 'all';

  const statusValue = typeof source.status === 'string' ? source.status : DEFAULT_FILTERS.status;
  filters.status = STATUS_VALUES.includes(statusValue) ? statusValue : 'all';

  filters.isFeatured = normalizeBoolean(source.isFeatured);

  const priceMinRaw = source.priceMin;
  if (priceMinRaw !== '' && priceMinRaw !== null && priceMinRaw !== undefined) {
    const priceMinNum = Number(priceMinRaw);
    filters.priceMin = Number.isFinite(priceMinNum) && priceMinNum >= 0 ? priceMinNum : '';
  } else {
    filters.priceMin = '';
  }

  const priceMaxRaw = source.priceMax;
  if (priceMaxRaw !== '' && priceMaxRaw !== null && priceMaxRaw !== undefined) {
    const priceMaxNum = Number(priceMaxRaw);
    filters.priceMax = Number.isFinite(priceMaxNum) && priceMaxNum >= 0 ? priceMaxNum : '';
  } else {
    filters.priceMax = '';
  }

  const orderBy = typeof source.orderBy === 'string' ? source.orderBy : DEFAULT_FILTERS.orderBy;
  filters.orderBy = ORDER_FIELDS.includes(orderBy) ? orderBy : DEFAULT_FILTERS.orderBy;

  const orderDir = typeof source.orderDir === 'string' ? source.orderDir : DEFAULT_FILTERS.orderDir;
  filters.orderDir = ORDER_DIRECTIONS.includes(orderDir) ? orderDir : DEFAULT_FILTERS.orderDir;

  const pageValue = Number(source.page);
  filters.page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : DEFAULT_FILTERS.page;

  const pageSizeValue = Number(source.pageSize);
  filters.pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeValue)
    ? pageSizeValue
    : DEFAULT_PAGE_SIZE;

  filters.all = source.all === 1 || source.all === true || source.all === '1' ? 1 : 0;

  return filters;
}

export const state = {
  items: [],
  meta: { page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0, pageCount: 1 },
  filters: sanitizeFilters(DEFAULT_FILTERS),
  categories: [],
  loading: false,
  error: null,
  selectedId: null,
  status: REQUEST_STATUS.IDLE,
};

function computePageCount(total, pageSize) {
  const safeTotal = Number.isFinite(Number(total)) ? Number(total) : 0;
  const size = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.ceil(safeTotal / size));
}

export function subscribe(callback) {
  if (typeof callback !== 'function') return () => {};
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function notify(container) {
  const snapshot = getSnapshot();
  for (const callback of subscribers) {
    callback(snapshot, container);
  }
}

export function getSnapshot() {
  return {
    items: state.items.slice(),
    meta: { ...state.meta },
    filters: { ...state.filters },
    categories: state.categories.slice(),
    loading: state.loading,
    error: state.error,
    selectedId: state.selectedId,
    status: state.status,
  };
}

export function setFilters(partial) {
  state.filters = sanitizeFilters({ ...state.filters, ...(partial || {}) });
  state.meta.page = state.filters.page;
  state.meta.pageSize = state.filters.pageSize;
}

export function resetFilters() {
  state.filters = sanitizeFilters(DEFAULT_FILTERS);
  state.meta.page = state.filters.page;
  state.meta.pageSize = state.filters.pageSize;
}

export function replaceFilters(nextFilters, { emit = true } = {}) {
  state.filters = sanitizeFilters(nextFilters);
  state.meta.page = state.filters.page;
  state.meta.pageSize = state.filters.pageSize;
  if (emit) notify();
}

export function parseFiltersFromHash(hashString = '') {
  if (typeof hashString !== 'string') return null;
  const trimmed = hashString.replace(/^#/, '');
  const [path, query = ''] = trimmed.split('?');
  if (path && path !== 'products') return null;
  const params = new URLSearchParams(query);
  const raw = { ...DEFAULT_FILTERS };

  if (params.has('q')) raw.q = params.get('q') || '';
  if (params.has('categoryId')) raw.categoryId = params.get('categoryId') || 'all';
  if (params.has('status')) raw.status = params.get('status') || 'all';
  if (params.has('isFeatured')) raw.isFeatured = params.get('isFeatured');
  if (params.has('priceMin')) raw.priceMin = params.get('priceMin');
  if (params.has('priceMax')) raw.priceMax = params.get('priceMax');
  if (params.has('orderBy')) raw.orderBy = params.get('orderBy');
  if (params.has('orderDir')) raw.orderDir = params.get('orderDir');
  if (params.has('page')) raw.page = params.get('page');
  if (params.has('pageSize')) raw.pageSize = params.get('pageSize');
  if (params.has('all')) raw.all = params.get('all');

  return sanitizeFilters(raw);
}

export function getFiltersQuery(filters = state.filters) {
  const data = sanitizeFilters(filters);
  const params = new URLSearchParams();

  if (data.q) params.set('q', data.q);
  if (data.categoryId && data.categoryId !== 'all') params.set('categoryId', data.categoryId);
  if (data.status && data.status !== 'all') params.set('status', data.status);
  if (data.isFeatured === true) params.set('isFeatured', 'true');
  if (data.priceMin !== '' && data.priceMin !== null && data.priceMin !== undefined) {
    params.set('priceMin', String(data.priceMin));
  }
  if (data.priceMax !== '' && data.priceMax !== null && data.priceMax !== undefined) {
    params.set('priceMax', String(data.priceMax));
  }
  if (data.orderBy && data.orderBy !== DEFAULT_FILTERS.orderBy) params.set('orderBy', data.orderBy);
  if (data.orderDir && data.orderDir !== DEFAULT_FILTERS.orderDir) params.set('orderDir', data.orderDir);
  if (Number(data.page) > 1) params.set('page', String(data.page));
  if (Number(data.pageSize) !== DEFAULT_FILTERS.pageSize) params.set('pageSize', String(data.pageSize));
  if (data.all === 1) params.set('all', '1');

  return params.toString();
}

export function setPage(page) {
  setFilters({ page });
}

export function setPageSize(pageSize) {
  setFilters({ pageSize });
}

export function setSelectedId(id) {
  state.selectedId = id ? String(id) : null;
}

export function upsertProduct(product) {
  const normalized = mapProductFromApi(product);
  if (!normalized) return;
  const existingIndex = state.items.findIndex((item) => String(item.id) === String(normalized.id));
  if (existingIndex >= 0) {
    state.items.splice(existingIndex, 1, normalized);
  } else {
    state.items.unshift(normalized);
    state.meta.total += 1;
    state.meta.pageCount = computePageCount(state.meta.total, state.meta.pageSize);
  }
}

export function removeProduct(id) {
  const identifier = String(id);
  const nextItems = state.items.filter((item) => String(item.id) !== identifier);
  if (nextItems.length === state.items.length) return;
  state.items = nextItems;
  state.meta.total = Math.max(0, state.meta.total - 1);
  state.meta.pageCount = computePageCount(state.meta.total, state.meta.pageSize);
}

function deriveMeta(meta, totalFallback = 0) {
  const result = {
    page: Number(meta?.page) || state.filters.page || 1,
    pageSize: Number(meta?.pageSize) || state.filters.pageSize || DEFAULT_PAGE_SIZE,
    total: Number(meta?.total) ?? totalFallback,
    pageCount: Number(meta?.pageCount) || 1,
  };

  if (!Number.isFinite(result.total) || result.total < 0) {
    result.total = totalFallback;
  }

  if (!Number.isFinite(result.pageCount) || result.pageCount <= 0) {
    result.pageCount = computePageCount(result.total, result.pageSize);
  }

  const maxPage = Math.max(1, result.pageCount);
  const page = Number(result.page);
  if (!Number.isFinite(page) || page < 1) {
    result.page = 1;
  } else if (page > maxPage) {
    result.page = maxPage;
  } else {
    result.page = Math.floor(page);
  }

  if (!PAGE_SIZE_OPTIONS.includes(result.pageSize)) {
    result.pageSize = DEFAULT_PAGE_SIZE;
  }

  return result;
}

export async function fetchCategories() {
  try {
    const { ok, data } = await categoriesApi.listAll({ all: 1, pageSize: 100 });
    if (!ok) throw new Error('No se pudieron cargar las categorías.');
    const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    state.categories = list
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: item.id ?? item.value ?? '',
        name: item.name ?? item.label ?? 'Sin nombre',
        status: item.status ?? item.active ?? 'active',
      }));
  } catch (error) {
    state.categories = [];
    console.error('[products.state] fetchCategories failed', error);
    showSnackbar('No se pudieron cargar las categorías.', { type: 'warning' });
  }
}

export async function fetchProducts({ silentToast = false } = {}) {
  if (activeProductsController) {
    activeProductsController.abort();
  }

  const controller = new AbortController();
  activeProductsController = controller;
  const currentRequest = ++requestSequence;

  state.loading = true;
  state.status = REQUEST_STATUS.LOADING;
  state.error = null;
  notify();

  const params = buildQuery(state.filters);

  try {
    const response = await productsApi.list(params, { signal: controller.signal });

    if (!response?.ok) {
      throw new Error('No se pudieron cargar los productos.');
    }

    const raw = response?.data?.items ?? response?.data ?? [];
    const list = Array.isArray(raw) ? raw : [];
    const items = list.map(mapProductFromApi).filter(Boolean);

    const metaPayload = response?.meta || response?.data?.meta || {};
    const meta = deriveMeta(metaPayload, Array.isArray(list) ? list.length : 0);

    if (controller.signal.aborted || currentRequest !== requestSequence) {
      return null;
    }

    state.items = items;
    state.meta = meta;
    state.filters.page = meta.page;
    state.filters.pageSize = meta.pageSize;
    state.loading = false;
    state.error = null;
    state.status = items.length > 0 ? REQUEST_STATUS.SUCCESS : REQUEST_STATUS.EMPTY;

    notify();
    return getSnapshot();
  } catch (error) {
    if (controller.signal.aborted || currentRequest !== requestSequence) {
      return null;
    }

    state.loading = false;
    state.error = error;
    state.status = REQUEST_STATUS.ERROR;
    state.items = [];
    notify();
    if (!silentToast) {
      console.error('[products.state] fetchProducts failed', error);
    }
    throw error;
  } finally {
    if (currentRequest === requestSequence && activeProductsController === controller) {
      activeProductsController = null;
    }
  }
}

export function setError(error) {
  state.error = error;
  state.status = error ? REQUEST_STATUS.ERROR : state.status;
  notify();
}
