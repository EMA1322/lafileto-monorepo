// Admin / Categories table renderer
// Comentarios en español, código en inglés.

import { applyRBAC } from '@/utils/rbac.js';

import {
  escapeAttr,
  escapeHTML,
  formatSummary,
} from './categories.helpers.js';

function renderStatusBadge(active) {
  if (active) {
    return '<span class="badge badge--success">Activo</span>';
  }
  return '<span class="badge badge--neutral">Inactivo</span>';
}

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
  const id = escapeHTML(item.id || '');
  const name = escapeHTML(item.name || '—');
  const imageCell = renderImageCell(item);
  const productCount = Number.isFinite(Number(item.productCount)) ? Number(item.productCount) : '—';
  const productLabel = productCount === '—' ? '—' : String(productCount);
  const nextActive = item.active ? 'false' : 'true';
  const toggleLabel = item.active ? 'Desactivar' : 'Activar';
  const toggleTitle = item.active ? 'Desactivar categoría' : 'Activar categoría';
  const actions = `
    <!-- Expose row id for delegated handlers without changing the visible UI -->
    <div class="categories__actions" role="group" aria-label="Acciones">
      <button class="btn btn--outline" type="button" data-action="category-edit" data-id="${id}" data-rbac-action="update">Editar</button>
      <button
        class="btn btn--outline"
        type="button"
        data-action="category-toggle"
        data-id="${id}"
        data-rbac-action="update"
        data-next-active="${nextActive}"
        aria-pressed="${item.active ? 'true' : 'false'}"
        aria-label="${toggleTitle}"
      >${toggleLabel}</button>
      <button class="btn btn--outline" type="button" data-action="category-delete" data-id="${id}" data-rbac-action="delete">Eliminar</button>
    </div>
  `;
  return `
    <tr data-id="${id}">
      <td class="categories__cell-id">${id || '—'}</td>
      <td class="categories__cell-name">${name}</td>
      <td class="categories__cell-image">${imageCell}</td>
      <td class="categories__cell-count" title="Se activará cuando Products backend exponga conteo">${productLabel}</td>
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

  if (status) {
    if (loading) {
      status.textContent = 'Cargando categorías…';
    } else if (error) {
      status.textContent = typeof error?.message === 'string' ? error.message : 'No se pudo cargar la información.';
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
    empty.hidden = loading || error || items.length > 0;
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
    btnPrev.disabled = loading || (Number(meta.page) || 1) <= 1;
  }
  if (btnNext) {
    const current = Number(meta.page) || 1;
    const totalPages = Math.max(1, Number(meta.pageCount) || 1);
    btnNext.disabled = loading || current >= totalPages;
  }

  applyRBAC(container);
}
