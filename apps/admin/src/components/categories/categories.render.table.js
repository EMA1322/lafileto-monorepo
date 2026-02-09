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

  const tbody = container.querySelector('#categories-tbody');
  const empty = container.querySelector('#categories-empty');
  const status = container.querySelector('#categories-status');
  const summary = container.querySelector('#categories-summary');
  const pageIndicator = container.querySelector('#categories-page-indicator');
  const btnPrev = container.querySelector('#categories-page-prev');
  const btnNext = container.querySelector('#categories-page-next');

  const view = snapshot || {};
  const loading = !!view.loading;
  const error = view.error;
  const items = Array.isArray(view.viewItems) ? view.viewItems : [];
  const meta = view.meta || { page: 1, pageCount: 1, total: 0, pageSize: 10 };
  const ready = (!loading && !error) || container.dataset.categoriesReady === 'true';
  if (!loading) {
    container.dataset.categoriesReady = 'true';
  }
  const isEmpty = ready && !loading && !error && items.length === 0;

  container.classList.toggle('is-loading', loading);
  container.classList.toggle('has-error', !!error);
  container.classList.toggle('is-empty', isEmpty);

  if (status) {
    if (loading) {
      status.textContent = 'Cargando categorías…';
    } else if (error) {
      const code = String(error?.code || '').toUpperCase();
      if (code === 'PERMISSION_DENIED' || code === 'RBAC_FORBIDDEN') {
        status.textContent = 'No tenés permisos para ver esta sección.';
      } else {
        status.textContent = typeof error?.message === 'string' ? error.message : 'No se pudo cargar la información.';
      }
    } else {
      status.textContent = '';
    }
  }

  if (tbody && !loading) {
    tbody.innerHTML = items.map(renderRow).join('');
  } else if (tbody && loading && !tbody.innerHTML) {
    tbody.innerHTML = '';
  }

  if (empty) {
    empty.hidden = !(isEmpty);
  }

  if (summary) {
    if (loading) summary.textContent = 'Cargando…';
    else if (error) summary.textContent = 'No se pudo cargar.';
    else summary.textContent = formatSummary(meta);
  }

  if (pageIndicator) {
    const current = Number(meta.page) || 1;
    const totalPages = Math.max(1, Number(meta.pageCount) || 1);
    pageIndicator.textContent = `${current} / ${totalPages}`;
  }

  if (btnPrev) {
    const current = Number(meta.page) || 1;
    const totalPages = Math.max(1, Number(meta.pageCount) || 1);
    const prevPage = current > 1 ? current - 1 : 1;
    btnPrev.disabled = loading || current <= 1;
    btnPrev.dataset.page = String(prevPage);
  }
  if (btnNext) {
    const current = Number(meta.page) || 1;
    const totalPages = Math.max(1, Number(meta.pageCount) || 1);
    const nextPage = current < totalPages ? current + 1 : totalPages;
    btnNext.disabled = loading || current >= totalPages;
    btnNext.dataset.page = String(nextPage);
  }

  applyRBAC(container);
  mountIcons(container);
}
