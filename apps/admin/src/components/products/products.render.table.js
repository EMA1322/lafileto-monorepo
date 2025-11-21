// ============================================================================
// /admin/src/components/products/products.render.table.js
// Renderizado de la tabla del módulo Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { applyRBAC } from '../../utils/rbac.js';

import {
  STATUS_LABELS,
  DEFAULT_PAGE_SIZE,
  escapeHTML,
  formatMoney,
  resolveOfferPricing,
} from './products.helpers.js';
import { REQUEST_STATUS } from './products.state.js';

function getRefs(container) {
  return {
    headerButton: container.querySelector('#product-create'),
    filtersForm: container.querySelector('#products-filters'),
    searchInput: container.querySelector('#filter-q'),
    categorySelect: container.querySelector('#filter-category'),
    statusSelect: container.querySelector('#filter-status'),
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

function renderOfferBadge(pricing, { ariaHidden = false } = {}) {
  if (!pricing?.hasActiveOffer) return '';
  const rawPercent = Number(pricing.discountPercent);
  const hasPercent = Number.isFinite(rawPercent) && rawPercent > 0;
  const label = hasPercent ? `-${Math.round(rawPercent)}% OFF` : '% OFF';
  const aria = ariaHidden ? ' aria-hidden="true"' : '';
  return `<span class="badge badge--error products__badge products__badge--offer"${aria}>${escapeHTML(label)}</span>`;
}

function renderStatusBadge(status, label) {
  const variant =
    status === 'active'
      ? 'badge--success'
      : status === 'archived'
        ? 'badge--neutral'
        : 'badge--warning';
  return `<span class="badge ${variant} products__status">${escapeHTML(label)}</span>`;
}

function renderProductPrice(pricing) {
  const safePricing = pricing || {
    hasActiveOffer: false,
    originalPrice: 0,
    finalPrice: 0,
  };
  const base = escapeHTML(formatMoney(safePricing.originalPrice ?? safePricing.finalPrice ?? 0));
  const finalValue = escapeHTML(formatMoney(safePricing.finalPrice ?? safePricing.originalPrice ?? 0));

  if (!safePricing.hasActiveOffer) {
    return `<span class="products__price-group"><span class="products__price products__price--final">${finalValue}</span></span>`;
  }

  const parts = [
    `<span class="products__price products__price--original">${base}</span>`,
    '<span class="products__price-separator" aria-hidden="true">→</span>',
    `<span class="products__price products__price--final">${finalValue}</span>`,
  ];

  if (Number.isFinite(Number(safePricing.discountPercent)) && Number(safePricing.discountPercent) > 0) {
    parts.push(
      `<span class="products__price-discount">(-${escapeHTML(String(Math.round(Number(safePricing.discountPercent))))}%)</span>`,
    );
  }

  return `<span class="products__price-group">${parts.join(' ')}</span>`;
}

function renderProductImage(item, pricing) {
  const src = item?.imageUrl;
  const badgeMarkup = renderOfferBadge(pricing, { ariaHidden: true });
  if (src) {
    const url = escapeHTML(src);
    const altText = item?.name ? `Imagen de ${item.name}` : 'Imagen del producto';
    return `
      <div class="products__image-wrapper">
        <img
          src="${url}"
          alt="${escapeHTML(altText)}"
          class="products__image"
          loading="lazy"
          decoding="async"
        />
        ${badgeMarkup}
      </div>
    `;
  }
  return `
    <div class="products__image-wrapper products__image-wrapper--empty">
      <span class="products__image products__image--placeholder" aria-hidden="true">—</span>
      ${badgeMarkup}
    </div>
  `;
}

function renderTable(items, refs, categories) {
  if (!refs.tableBody) return;
  const rows = items
    .map((item) => {
      const idAttr = escapeHTML(item.id ?? '');
      const status = item.status || 'draft';
      const statusLabel = STATUS_LABELS[status] || '—';
      const pricing = resolveOfferPricing(item);
      const imageMarkup = renderProductImage(item, pricing);
      const hasImage = Boolean(item?.imageUrl);
      const priceMarkup = renderProductPrice(pricing);
      const statusBadge = renderStatusBadge(status, statusLabel);
      return `
        <tr data-id="${idAttr}">
          <td class="products__cell-image"${hasImage ? '' : ' aria-label="Sin imagen"'}>
            ${imageMarkup}
          </td>
          <td>${escapeHTML(item.name ?? '—')}</td>
          <td class="products__cell--numeric">${priceMarkup}</td>
          <td class="products__cell--numeric">${Number(item.stock ?? 0)}</td>
          <td>${statusBadge}</td>
          <td>${escapeHTML(resolveCategoryName(item.categoryId, categories))}</td>
          <td>
            <div class="products__actions">
              <button
                class="btn btn--ghost btn--sm products__action-btn"
                type="button"
                data-action="view"
                data-id="${idAttr}"
                data-rbac-action="read"
              >Ver</button>
              <button
                class="btn btn--ghost btn--sm products__action-btn"
                type="button"
                data-action="edit"
                data-id="${idAttr}"
                data-rbac-action="update"
              >Editar</button>
              <button
                class="btn btn--ghost btn--sm products__action-btn products__action-btn--danger"
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
      `<li><button class="btn btn--ghost btn--sm products__page-item" type="button" data-page="${current}" ${
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
  const status = view.status || REQUEST_STATUS.IDLE;
  const isInitial = status === REQUEST_STATUS.IDLE;
  const isLoading = status === REQUEST_STATUS.LOADING;
  const isError = status === REQUEST_STATUS.ERROR;
  const isEmpty = status === REQUEST_STATUS.EMPTY;
  const hasData = status === REQUEST_STATUS.SUCCESS;
  const error = view.error;
  const items = Array.isArray(view.items) ? view.items : [];
  const meta = view.meta || { page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 1, total: 0 };
  const categories = Array.isArray(view.categories) ? view.categories : [];

  const showLoading = isInitial || isLoading;
  const content = container.querySelector('.products__content');

  const statusName = (() => {
    if (showLoading && !isError && !isEmpty && !hasData) return 'loading';
    if (isError) return 'error';
    if (isEmpty) return 'empty';
    if (hasData) return 'success';
    return 'idle';
  })();

  if (content) {
    content.dataset.status = statusName;
    content.classList.toggle('is-loading', statusName === 'loading');
    content.classList.toggle('has-error', statusName === 'error');
    content.classList.toggle('is-empty', statusName === 'empty');
    content.classList.toggle('has-success', statusName === 'success');
    content.setAttribute('aria-busy', showLoading ? 'true' : 'false');
  }

  if (refs.loadingState) refs.loadingState.hidden = true;
  if (refs.errorState) refs.errorState.hidden = true;
  if (refs.emptyState) refs.emptyState.hidden = true;
  if (refs.tableWrapper) refs.tableWrapper.hidden = true;

  if (showLoading && !isError && !isEmpty && !hasData) {
    if (refs.loadingState) refs.loadingState.hidden = false;
  } else if (isError) {
    if (refs.errorState) refs.errorState.hidden = false;
  } else if (isEmpty) {
    if (refs.emptyState) refs.emptyState.hidden = false;
  } else if (hasData) {
    if (refs.tableWrapper) refs.tableWrapper.hidden = false;
  }

  if (error && refs.errorMessage) {
    const message = typeof error?.message === 'string' ? error.message : 'No se pudieron cargar los productos.';
    refs.errorMessage.textContent = message;
  }

  if (!isLoading) {
    renderCategoryOptions(categories, refs);
  }

  if (showLoading) {
    if (refs.tableBody) refs.tableBody.innerHTML = '';
  } else if (hasData) {
    renderTable(items, refs, categories);
  } else {
    if (refs.tableBody) refs.tableBody.innerHTML = '';
  }

  if (!isLoading || isInitial) {
    renderFilters(view, refs);
  }

  if (!showLoading && !isError) {
    renderMeta(meta, refs);
    renderPagination(meta, refs);
  } else if (isError) {
    if (refs.meta) refs.meta.textContent = '—';
    if (refs.pagination) refs.pagination.innerHTML = '';
    if (refs.pageFirst) refs.pageFirst.disabled = true;
    if (refs.pagePrev) refs.pagePrev.disabled = true;
    if (refs.pageNext) refs.pageNext.disabled = true;
    if (refs.pageLast) refs.pageLast.disabled = true;
  }

  applyRBAC(container);
}
