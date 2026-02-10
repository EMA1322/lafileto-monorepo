// Admin / Categories table renderer
// Comentarios en español, código en inglés.

import { applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';

import {
  escapeAttr,
  escapeHTML,
  formatSummary,
  renderStatusBadge,
} from './categories.helpers.js';

function renderImageCell(item) {
  if (item.imageUrl) {
    const src = escapeAttr(item.imageUrl);
    const alt = item.name ? `Imagen de ${item.name}` : 'Imagen de categoría';
    const altAttr = escapeAttr(alt);
    return `
      <img
        src="${src}"
        alt="${altAttr}"
        class="categories__image"
        loading="lazy"
        decoding="async"
      />
    `;
  }
  return '<span class="categories__imageFallback" aria-hidden="true">—</span>';
}

function renderRow(item) {
  const idAttr = escapeAttr(item.id || '');
  const name = escapeHTML(item.name || '—');
  const imageCell = renderImageCell(item);
  const productCount = Number.isFinite(Number(item.productCount)) ? Number(item.productCount) : '—';
  const productLabel = productCount === '—' ? '—' : String(productCount);
  const actions = `
    <!-- Expose row id for delegated handlers without changing the visible UI -->
    <div class="categories__row-actions" role="group" aria-label="Acciones">
      <button
        class="btn btn--ghost btn--icon categories__actionIcon"
        type="button"
        data-action="view"
        data-id="${idAttr}"
        aria-label="Ver categoría"
        title="Ver categoría"
      >
        <span class="icon icon--sm" data-icon="eye" aria-hidden="true"></span>
      </button>
      <button
        class="btn btn--secondary btn--sm"
        type="button"
        data-action="edit"
        data-id="${idAttr}"
        data-rbac-action="update"
        data-rbac-hide
      >
        <span class="icon icon--sm" data-icon="edit" aria-hidden="true"></span>
        <span class="icon-label">Editar</span>
      </button>
      <button
        class="btn btn--sm categories__action--danger"
        type="button"
        data-action="delete"
        data-id="${idAttr}"
        data-rbac-action="delete"
      >
        <span class="icon icon--sm" data-icon="trash" aria-hidden="true"></span>
        <span class="icon-label">Eliminar</span>
      </button>
    </div>
  `;
  return `
    <tr data-id="${idAttr}">
      <td class="categories__cell-name">${name}</td>
      <td class="categories__cell-image">${imageCell}</td>
      <td class="categories__cell-count">${productLabel}</td>
      <td class="categories__cell-status">${renderStatusBadge(item.active)}</td>
      <td class="categories__cell-actions" data-column="actions">${actions}</td>
    </tr>
  `;
}

export function renderCategoriesTable(snapshot, root = document.querySelector('#categories-view')) {
  const container = root instanceof Element ? root : document.querySelector('#categories-view');
  if (!container) return;

  const content = container.querySelector('.categories__content');
  const loadingState = container.querySelector('#categories-loading');
  const errorState = container.querySelector('#categories-error');
  const errorMessage = container.querySelector('#categories-error-message');
  const emptyState = container.querySelector('#categories-empty');
  const tableWrapper = container.querySelector('#categories-table-wrapper');
  const tbody = container.querySelector('#categories-tbody');
  const summary = container.querySelector('#categories-summary');
  const pageSizeSelect = container.querySelector('#categories-page-size');
  const pageList = container.querySelector('#categories-page-list');
  const btnFirst = container.querySelector('#categories-page-first');
  const btnPrev = container.querySelector('#categories-page-prev');
  const btnNext = container.querySelector('#categories-page-next');
  const btnLast = container.querySelector('#categories-page-last');

  const view = snapshot || {};
  const isLoaded = Boolean(view.loaded);
  const loading = !!view.loading;
  const error = view.error;
  const items = Array.isArray(view.viewItems) ? view.viewItems : [];
  const meta = view.meta || { page: 1, pageCount: 1, total: 0, pageSize: 10 };
  const showLoading = !isLoaded || loading;
  const isError = Boolean(error);
  const isEmpty = isLoaded && !loading && !isError && items.length === 0;
  const hasData = isLoaded && !loading && !isError && items.length > 0;

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

  if (loadingState) loadingState.hidden = true;
  if (errorState) errorState.hidden = true;
  if (emptyState) emptyState.hidden = true;
  if (tableWrapper) tableWrapper.hidden = true;

  if (statusName === 'loading') {
    if (loadingState) loadingState.hidden = false;
  } else if (statusName === 'error') {
    if (errorState) errorState.hidden = false;
  } else if (statusName === 'empty') {
    if (emptyState) emptyState.hidden = false;
  } else if (statusName === 'success') {
    if (tableWrapper) tableWrapper.hidden = false;
  }

  if (errorMessage) {
    const message = typeof error?.message === 'string' ? error.message : 'No se pudieron cargar las categorías.';
    errorMessage.textContent = message;
  }

  if (tbody) {
    if (showLoading) {
      tbody.innerHTML = '';
    } else if (hasData) {
      tbody.innerHTML = items.map(renderRow).join('');
    } else {
      tbody.innerHTML = '';
    }
  }

  if (summary) {
    if (!showLoading && !isError) summary.textContent = formatSummary(meta);
    else if (showLoading) summary.textContent = 'Cargando…';
    else summary.textContent = '—';
  }

  if (pageSizeSelect) {
    pageSizeSelect.value = String(Number(meta.pageSize) || 10);
    pageSizeSelect.disabled = showLoading || isError;
  }

  const current = Number(meta.page) || 1;
  const totalPages = Math.max(1, Number(meta.pageCount) || 1);

  if (pageList) {
    const maxButtons = 5;
    const start = Math.max(1, current - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const html = [];
    for (let page = start; page <= end; page += 1) {
      const isCurrent = page === current;
      html.push(
        `<li><button class="btn btn--ghost btn--sm categories__pageItem" type="button" data-page="${page}" ${isCurrent ? "aria-current='page'" : ''}>${page}</button></li>`,
      );
    }
    pageList.innerHTML = html.join('');
  }

  if (btnFirst) {
    btnFirst.disabled = showLoading || isError || current <= 1;
    btnFirst.dataset.page = '1';
  }

  if (btnPrev) {
    const prevPage = current > 1 ? current - 1 : 1;
    btnPrev.disabled = showLoading || isError || current <= 1;
    btnPrev.dataset.page = String(prevPage);
  }

  if (btnNext) {
    const nextPage = current < totalPages ? current + 1 : totalPages;
    btnNext.disabled = showLoading || isError || current >= totalPages;
    btnNext.dataset.page = String(nextPage);
  }

  if (btnLast) {
    btnLast.disabled = showLoading || isError || current >= totalPages;
    btnLast.dataset.page = String(totalPages);
  }

  applyRBAC(container);
  mountIcons(container);
}
