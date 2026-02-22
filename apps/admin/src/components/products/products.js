// ============================================================================
// /admin/src/components/products/products.js
// Coordinador principal del módulo Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { ensureRbacLoaded, can } from '../../utils/rbac.js';
import notifyToast from '../../utils/notify.js';
import { replaceHash } from '../../utils/helpers.js';

import { renderProductsView } from './products.render.table.js';
import { bindProductsBindings } from './products.render.bindings.js';
import {
  subscribe,
  getSnapshot,
  fetchProducts,
  fetchCategories,
  notify,
  parseFiltersFromHash,
  replaceFilters,
  getFiltersQuery,
} from './products.state.js';

let unsubscribe = null;
let cleanupBindings = null;
let hashChangeHandler = null;
let skipHashSync = false;
let lastHashValue = null;

function scheduleRetry(attempt) {
  setTimeout(() => {
    void initModule(attempt + 1);
  }, 50);
}

function syncHashWithState(snapshot) {
  if (typeof window === 'undefined') return;
  const filtersQuery = getFiltersQuery(snapshot?.filters);
  const target = filtersQuery ? `#products?${filtersQuery}` : '#products';
  if (window.location.hash === target || lastHashValue === target) {
    lastHashValue = target;
    return;
  }
  lastHashValue = replaceHash('products', filtersQuery) || target;
  skipHashSync = true;
  queueMicrotask(() => {
    skipHashSync = false;
  });
}

function handleHashChange(container) {
  if (typeof window === 'undefined') return;
  if (skipHashSync) return;
  const next = parseFiltersFromHash(window.location.hash);
  if (!next) return;
  lastHashValue = window.location.hash;
  replaceFilters(next, { emit: false });
  notify(container);
  void fetchProducts({ silentToast: true });
}

export async function initModule(attempt = 0) {
  const container = document.querySelector('#products-module');
  if (!container) {
    if (attempt < 10) scheduleRetry(attempt);
    return;
  }

  if (container.dataset.productsInit === 'true') {
    renderProductsView(getSnapshot(), container);
    return;
  }

  container.dataset.productsInit = 'true';

  const initialFilters = parseFiltersFromHash(typeof window !== 'undefined' ? window.location.hash : '');
  if (initialFilters) {
    replaceFilters(initialFilters, { emit: false });
  }

  await ensureRbacLoaded();
  if (!can('products', 'r')) {
    notifyToast('No tenés permisos para ver productos.', { type: 'warning' });
    window.location.hash = '#not-authorized';
    return;
  }

  renderProductsView(getSnapshot(), container);

  unsubscribe = subscribe((snapshot) => {
    renderProductsView(snapshot, container);
    syncHashWithState(snapshot);
  });

  cleanupBindings = bindProductsBindings(container);

  if (typeof window !== 'undefined') {
    hashChangeHandler = () => handleHashChange(container);
    window.addEventListener('hashchange', hashChangeHandler);
    syncHashWithState(getSnapshot());
  }

  try {
    await fetchCategories();
  } catch (error) {
    console.error('[products] categories fetch failed', error);
  } finally {
    notify(container);
  }

  try {
    await fetchProducts();
  } catch (error) {
    console.error('[products] initial fetch failed', error);
    notifyToast(error?.message || 'No se pudieron cargar los productos.', { type: 'error' });
  }
}

export function destroyModule() {
  if (cleanupBindings) {
    cleanupBindings();
    cleanupBindings = null;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (typeof window !== 'undefined' && hashChangeHandler) {
    window.removeEventListener('hashchange', hashChangeHandler);
    hashChangeHandler = null;
  }
}

export default {
  initModule,
  destroyModule,
};
