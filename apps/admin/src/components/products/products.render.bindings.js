// ============================================================================
// /admin/src/components/products/products.render.bindings.js
// Enlaza eventos del módulo Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { can } from '../../utils/rbac.js';
import { showSnackbar } from '../../utils/snackbar.js';
import { productsApi } from '../../utils/apis.js';
import { debounce } from '../../utils/helpers.js';

import {
  state,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  fetchProducts,
  notify,
  upsertProduct,
  setStatusPending,
} from './products.state.js';
import { openProductModal, openProductViewModal, openDeleteModal } from './products.modals.js';

function getRefs(container) {
  return {
    createButton: container.querySelector('#product-create'),
    searchInput: container.querySelector('#filter-q'),
    categorySelect: container.querySelector('#filter-category'),
    statusSelect: container.querySelector('#filter-status'),
    offerSelect: container.querySelector('#products-offer-filter'),
    orderBySelect: container.querySelector('#filter-order-by'),
    orderDirSelect: container.querySelector('#filter-order-dir'),
    pageSizeSelect: container.querySelector('#filter-page-size'),
    clearButton: container.querySelector('#filter-clear'),
    retryButton: container.querySelector('#products-retry'),
    emptyClear: container.querySelector('#products-empty-clear'),
    paginationList: container.querySelector('#products-page-list'),
    pageFirst: container.querySelector('#page-first'),
    pagePrev: container.querySelector('#page-prev'),
    pageNext: container.querySelector('#page-next'),
    pageLast: container.querySelector('#page-last'),
    tableBody: container.querySelector('#products-table-body'),
  };
}

function attach(element, event, handler, listeners) {
  if (!element || typeof handler !== 'function') return;
  element.addEventListener(event, handler);
  listeners.push(() => element.removeEventListener(event, handler));
}

async function reloadProducts(container) {
  try {
    await fetchProducts();
  } catch (error) {
    console.error('[products.bindings] reload failed', error);
    showSnackbar(error?.message || 'No se pudieron cargar los productos.', { type: 'error' });
  }
}

export function bindProductsBindings(container) {
  const refs = getRefs(container);
  const listeners = [];
  const debouncedReload = debounce(() => {
    void reloadProducts(container);
  }, 300);

  attach(refs.createButton, 'click', () => {
    if (!can('products', 'w')) {
      showSnackbar('No tenés permisos para crear productos.', { type: 'warning' });
      return;
    }
    openProductModal({ mode: 'create', product: {}, container });
  }, listeners);

  attach(refs.searchInput, 'input', (event) => {
    setFilters({ q: event.target.value || '' });
    setPage(1);
    notify(container);
    debouncedReload();
  }, listeners);

  attach(refs.categorySelect, 'change', (event) => {
    setFilters({ categoryId: event.target.value || 'all' });
    setPage(1);
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.statusSelect, 'change', (event) => {
    setFilters({ status: event.target.value || 'all' });
    setPage(1);
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.offerSelect, 'change', (event) => {
    setFilters({ offer: event.target.value || 'all' });
    setPage(1);
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.orderBySelect, 'change', (event) => {
    setFilters({ orderBy: event.target.value });
    setPage(1);
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.orderDirSelect, 'change', (event) => {
    setFilters({ orderDir: event.target.value });
    setPage(1);
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.pageSizeSelect, 'change', (event) => {
    setPageSize(event.target.value);
    setPage(1);
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.clearButton, 'click', (event) => {
    event.preventDefault();
    resetFilters();
    notify(container);
    void reloadProducts(container);
  }, listeners);

  attach(refs.retryButton, 'click', () => {
    void reloadProducts(container);
  }, listeners);

  attach(refs.emptyClear, 'click', (event) => {
    event.preventDefault();
    resetFilters();
    notify(container);
    void reloadProducts(container);
  }, listeners);

  const paginationHandler = (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    const nextPage = Number(button.dataset.page);
    if (!Number.isFinite(nextPage)) return;
    setPage(nextPage);
    notify(container);
    void reloadProducts(container);
  };

  attach(refs.paginationList, 'click', paginationHandler, listeners);
  attach(refs.pageFirst, 'click', paginationHandler, listeners);
  attach(refs.pagePrev, 'click', paginationHandler, listeners);
  attach(refs.pageNext, 'click', paginationHandler, listeners);
  attach(refs.pageLast, 'click', paginationHandler, listeners);

  const actionHandler = (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;
    const product = state.items.find((item) => String(item.id) === String(id));
    if (!product) {
      showSnackbar('No encontramos el producto seleccionado.', { type: 'warning' });
      return;
    }
    if (action === 'view') {
      if (!can('products', 'r')) {
        showSnackbar('No tenés permisos para ver productos.', { type: 'warning' });
        return;
      }
      openProductViewModal(product);
      return;
    }
    if (action === 'edit') {
      if (!can('products', 'u')) {
        showSnackbar('No tenés permisos para editar productos.', { type: 'warning' });
        return;
      }
      openProductModal({ mode: 'edit', product, container });
      return;
    }
    if (action === 'delete') {
      if (!can('products', 'd')) {
        showSnackbar('No tenés permisos para eliminar productos.', { type: 'warning' });
        return;
      }
      openDeleteModal(product, container);
      return;
    }
    if (action === 'toggle-status') {
      if (!can('products', 'changeStatus')) {
        showSnackbar('No tenés permisos para cambiar el estado de productos.', { type: 'warning' });
        return;
      }
      const nextStatus = button.dataset.nextStatus || 'draft';
      if (button.disabled) return;
      button.disabled = true;
      setStatusPending(id, true);
      notify(container);
      (async () => {
        try {
          const { ok, data } = await productsApi.changeStatus(id, { status: nextStatus });
          if (!ok) throw new Error('No se pudo actualizar el estado del producto.');
          upsertProduct(data ?? { ...product, status: nextStatus, id: product.id });
          notify(container);
          showSnackbar('Estado del producto actualizado.', { type: 'success' });
        } catch (error) {
          console.error('[products.bindings] status update failed', error);
          showSnackbar(error?.message || 'No se pudo actualizar el estado del producto.', { type: 'error' });
        } finally {
          setStatusPending(id, false);
          notify(container);
        }
      })();
    }
  };

  attach(refs.tableBody, 'click', actionHandler, listeners);

  return () => {
    listeners.forEach((off) => off());
    listeners.length = 0;
  };
}
