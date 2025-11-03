// ============================================================================
// /admin/src/components/products/products.render.table.js
// Renderizado de tabla y tarjetas del módulo Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { applyRBAC } from '@/utils/rbac.js';

import {
  STATUS_LABELS,
  DEFAULT_PAGE_SIZE,
  escapeHTML,
  formatMoney,
  formatStatusLabel,
} from './products.helpers.js';

function getRefs(container) {
  return {
    headerButton: container.querySelector('#product-create'),
    filtersForm: container.querySelector('#products-filters'),
    searchInput: container.querySelector('#filter-q'),
    categorySelect: container.querySelector('#filter-category'),
    statusSelect: container.querySelector('#filter-status'),
    featuredToggle: container.querySelector('#filter-featured'),
    orderBySelect: container.querySelector('#filter-order-by'),
    orderDirSelect: container.querySelector('#filter-order-dir'),
    pageSizeSelect: container.querySelector('#filter-page-size'),
    clearButton: container.querySelector('#filter-clear'),
    loadingState: container.querySelector('#products-loading'),
    errorState: container.querySelector('#products-error'),
    errorMessage: container.querySelector('#products-error-message'),
    retryButton: container.querySelector('#products-retry'),
    emptyState: container.querySelector('#products-empty'),
    emptyClear: container.querySelector('#products-empty-clear'),
    tableWrapper: container.querySelector('#products-table-wrapper'),
    tableBody: container.querySelector('#products-table-body'),
    cardsWrapper: container.querySelector('#products-cards'),
    meta: container.querySelector('#products-meta'),
    pagination: container.querySelector('#products-page-list'),
    pageFirst: container.querySelector('#page-first'),
    pagePrev: container.querySelector('#page-prev'),
    pageNext: container.querySelector('#page-next'),
    pageLast: container.querySelector('#page-last'),
  };
}

function resolveCategoryName(id, categories = []) {
  if (!id) return '—';
  const item = categories.find((category) => String(category.id) === String(id));
  return item?.name ? String(item.name) : '—';
}

function renderProductImage(item) {
  const src = item?.imageUrl;
  if (src) {
    const url = escapeHTML(src);
    const altText = item?.name ? `Imagen de ${item.name}` : 'Imagen del producto';
    return `
      <img
        src="${url}"
        alt="${escapeHTML(altText)}"
        class="products__image"
        loading="lazy"
        decoding="async"
      />
    `;
  }
  return '<span class="products__image products__image--placeholder" aria-hidden="true">—</span>';
}

function renderTable(items, refs, categories) {
  if (!refs.tableBody) return;
  const rows = items
    .map((item) => {
      const idAttr = escapeHTML(item.id ?? '');
      const status = item.status || 'draft';
      const statusLabel = STATUS_LABELS[status] || '—';
      const imageMarkup = renderProductImage(item);
      const hasImage = Boolean(item?.imageUrl);
      return `
        <tr data-id="${idAttr}">
          <td class="products__cell-image"${hasImage ? '' : ' aria-label="Sin imagen"'}>
            ${imageMarkup}
          </td>
          <td>${escapeHTML(item.name ?? '—')}</td>
          <td class="products__cell--numeric">${formatMoney(item.price)}</td>
          <td class="products__cell--numeric">${Number(item.stock ?? 0)}</td>
          <td><span class="products__row-status products__row-status--${escapeHTML(status)}">${escapeHTML(statusLabel)}</span></td>
          <td>${escapeHTML(resolveCategoryName(item.categoryId, categories))}</td>
          <td>
            <div class="products__actions">
              <button
                class="products__action-btn"
                type="button"
                data-action="edit"
                data-id="${idAttr}"
                data-rbac-action="update"
              >Editar</button>
              <button
                class="products__action-btn"
                type="button"
                data-action="change-status"
                data-id="${idAttr}"
                data-rbac-action="change-status"
              >Estado</button>
              <button
                class="products__action-btn"
                type="button"
                data-action="delete"
                data-id="${idAttr}"
                data-rbac-action="delete"
              >Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
  refs.tableBody.innerHTML = rows;
}

function renderCards(items, refs, categories) {
  if (!refs.cardsWrapper) return;
  const cards = items
    .map((item) => {
      const idAttr = escapeHTML(item.id ?? '');
      const status = item.status || 'draft';
      const statusLabel = formatStatusLabel(status);
      const imageMarkup = renderProductImage(item);
      return `
        <article class="products__card" data-id="${idAttr}">
          <div class="products__card-media">
            ${imageMarkup}
          </div>
          <header class="products__card-header">
            <h3 class="products__card-title">${escapeHTML(item.name ?? '—')}</h3>
            <span class="products__row-status products__row-status--${escapeHTML(status)}">${escapeHTML(statusLabel)}</span>
          </header>
          <dl class="products__card-meta">
            <div class="products__card-row">
              <span class="products__card-label">Precio</span>
              <span>${formatMoney(item.price)}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Stock</span>
              <span>${Number(item.stock ?? 0)}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Categoría</span>
              <span>${escapeHTML(resolveCategoryName(item.categoryId, categories))}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Estado</span>
              <span>${escapeHTML(statusLabel)}</span>
            </div>
          </dl>
          <div class="products__actions">
            <button
              class="products__action-btn"
              type="button"
              data-action="edit"
              data-id="${idAttr}"
              data-rbac-action="update"
            >Editar</button>
            <button
              class="products__action-btn"
              type="button"
              data-action="change-status"
              data-id="${idAttr}"
              data-rbac-action="change-status"
            >Estado</button>
            <button
              class="products__action-btn"
              type="button"
              data-action="delete"
              data-id="${idAttr}"
              data-rbac-action="delete"
            >Eliminar</button>
          </div>
        </article>
      `;
    })
    .join('');
  refs.cardsWrapper.innerHTML = cards;
}

function renderMeta(meta, refs) {
  if (!refs.meta) return;
  const total = Number(meta?.total) || 0;
  const page = Number(meta?.page) || 1;
  const size = Number(meta?.pageSize) || DEFAULT_PAGE_SIZE;
  if (!total) {
    refs.meta.textContent = 'Sin resultados';
    return;
  }
  const from = (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  refs.meta.textContent = `${from}–${to} de ${total} productos`;
}

function renderPagination(meta, refs) {
  if (!refs.pagination) return;
  const page = Number(meta?.page) || 1;
  const pageCount = Math.max(1, Number(meta?.pageCount) || 1);
  const items = [];
  const maxButtons = 5;
  const start = Math.max(1, page - Math.floor(maxButtons / 2));
  const end = Math.min(pageCount, start + maxButtons - 1);
  for (let current = start; current <= end; current += 1) {
    const isCurrent = current === page;
    items.push(
      `<li><button class="products__page-item" type="button" data-page="${current}" ${
        isCurrent ? "aria-current='page'" : ''
      }>${current}</button></li>`,
    );
  }
  refs.pagination.innerHTML = items.join('');

  if (refs.pageFirst) {
    refs.pageFirst.dataset.page = '1';
    refs.pageFirst.disabled = page <= 1;
  }
  if (refs.pagePrev) {
    refs.pagePrev.dataset.page = String(page > 1 ? page - 1 : 1);
    refs.pagePrev.disabled = page <= 1;
  }
  if (refs.pageNext) {
    refs.pageNext.dataset.page = String(page < pageCount ? page + 1 : pageCount);
    refs.pageNext.disabled = page >= pageCount;
  }
  if (refs.pageLast) {
    refs.pageLast.dataset.page = String(pageCount);
    refs.pageLast.disabled = page >= pageCount;
  }
}

function renderFilters(snapshot, refs) {
  const filters = snapshot.filters || {};
  if (refs.searchInput && typeof filters.q === 'string') {
    refs.searchInput.value = filters.q;
  }
  if (refs.statusSelect) {
    refs.statusSelect.value = filters.status || 'all';
  }
  if (refs.orderBySelect) {
    refs.orderBySelect.value = filters.orderBy || 'updatedAt';
  }
  if (refs.orderDirSelect) {
    refs.orderDirSelect.value = filters.orderDir || 'desc';
  }
  if (refs.pageSizeSelect) {
    refs.pageSizeSelect.value = String(filters.pageSize || DEFAULT_PAGE_SIZE);
  }
  if (refs.featuredToggle) {
    const isActive = filters.isFeatured === true;
    refs.featuredToggle.setAttribute('aria-checked', isActive ? 'true' : 'false');
    refs.featuredToggle.classList.toggle('is-active', isActive);
  }
  if (refs.categorySelect) {
    const value = filters.categoryId || 'all';
    refs.categorySelect.value = value;
  }
}

function renderCategoryOptions(categories, refs) {
  if (!refs.categorySelect) return;
  const options = ['<option value="all">Todas las categorías</option>']
    .concat(
      categories.map(
        (category) =>
          `<option value="${escapeHTML(category.id ?? '')}">${escapeHTML(category.name ?? 'Sin nombre')}</option>`,
      ),
    )
    .join('');
  refs.categorySelect.innerHTML = options;
}

export function renderProductsView(snapshot, root = document.querySelector('#products-module')) {
  const container = root instanceof Element ? root : document.querySelector('#products-module');
  if (!container) return;

  const refs = getRefs(container);
  const view = snapshot || {};
  const loading = !!view.loading;
  const error = view.error;
  const items = Array.isArray(view.items) ? view.items : [];
  const meta = view.meta || { page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 1, total: 0 };
  const categories = Array.isArray(view.categories) ? view.categories : [];

  const ready = !loading && !error;
  const isEmpty = ready && items.length === 0;

  if (refs.loadingState) refs.loadingState.hidden = !loading;
  if (refs.errorState) refs.errorState.hidden = !error;
  if (refs.emptyState) refs.emptyState.hidden = !isEmpty;
  if (refs.tableWrapper) refs.tableWrapper.hidden = !ready || isEmpty;
  if (refs.cardsWrapper) refs.cardsWrapper.hidden = !ready || isEmpty;

  if (error && refs.errorMessage) {
    const message = typeof error?.message === 'string' ? error.message : 'No se pudieron cargar los productos.';
    refs.errorMessage.textContent = message;
  }

  if (!loading) {
    renderCategoryOptions(categories, refs);
  }

  if (loading) {
    if (refs.tableBody) refs.tableBody.innerHTML = '';
    if (refs.cardsWrapper) refs.cardsWrapper.innerHTML = '';
  } else if (ready && !isEmpty) {
    renderTable(items, refs, categories);
    renderCards(items, refs, categories);
  }

  if (!loading) {
    renderFilters(view, refs);
    renderMeta(meta, refs);
    renderPagination(meta, refs);
  }

  applyRBAC(container);
}
