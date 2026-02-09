import { state, DEFAULT_PAGE_SIZE } from './users.state.js';
import { escapeHTML, createButtonTemplate } from './users.helpers.js';

import { renderUsersStatus } from './users.render.status.js';
import { els } from './users.dom.js';
import { applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';

function getRefs(container) {
  return {
    status: container.querySelector('#users-status'),
    filtersForm: container.querySelector('#users-filters'),
    searchInput: container.querySelector('#users-filter-q'),
    orderBySelect: container.querySelector('#users-filter-order-by'),
    orderDirSelect: container.querySelector('#users-filter-order-dir'),
    pageSizeSelect: container.querySelector('#users-filter-page-size'),
    clearButton: container.querySelector('#users-filter-clear'),
    loadingState: container.querySelector('#users-loading'),
    errorState: container.querySelector('#users-error'),
    errorMessage: container.querySelector('#users-error-message'),
    emptyState: container.querySelector('#users-empty'),
    tableWrapper: container.querySelector('#users-table-wrapper'),
    tableBody: container.querySelector('#users-tbody'),
    footer: container.querySelector('#users-footer'),
    meta: container.querySelector('#users-meta'),
    pagination: container.querySelector('#users-page-list'),
    pageFirst: container.querySelector('#users-page-first'),
    pagePrev: container.querySelector('#users-page-prev'),
    pageNext: container.querySelector('#users-page-next'),
    pageLast: container.querySelector('#users-page-last'),
  };
}

function formatStatus(status) {
  if (String(status).toUpperCase() === 'ACTIVE') {
    return '<span class="badge badge--success">Activo</span>';
  }
  if (String(status).toUpperCase() === 'INACTIVE') {
    return '<span class="badge badge--muted">Inactivo</span>';
  }
  return `<span class="badge badge--muted">${escapeHTML(String(status || 'Desconocido'))}</span>`;
}

function isMissingPhone(phone) {
  if (phone === null || phone === undefined) return true;
  const normalized = String(phone).trim();
  if (!normalized) return true;
  return normalized === '0000000000';
}

function statusSwitchMarkup(user, { phoneMissing = false } = {}) {
  const isActive = String(user.status).toUpperCase() === 'ACTIVE';
  const label = isActive ? 'Activo' : 'Inactivo';
  const stateClass = isActive ? 'is-active' : 'is-inactive';
  const disabledReason = 'Para cambiar el estado necesitás cargar un teléfono';
  const disabledAttrs = phoneMissing ? ' disabled aria-disabled="true"' : '';
  const titleAttr = phoneMissing ? ` title="${escapeHTML(disabledReason)}"` : '';
  const srHint = phoneMissing ? `<span class="sr-only">${escapeHTML(disabledReason)}</span>` : '';
  return `
    <button
      class="users__status-toggle ${stateClass}"
      type="button"
      data-action="user-toggle-status"
      data-rbac-action="update"
      data-next-status="${isActive ? 'INACTIVE' : 'ACTIVE'}"
      aria-pressed="${isActive}"
      aria-label="Cambiar estado a ${isActive ? 'Inactivo' : 'Activo'}"${disabledAttrs}${titleAttr}
    >${label}${srHint}</button>
  `;
}

function renderFilters(refs) {
  const filters = state.filters || {};
  if (refs.searchInput && typeof filters.q === 'string') {
    refs.searchInput.value = filters.q;
  }
  if (refs.orderBySelect) {
    refs.orderBySelect.value = filters.orderBy || 'fullName';
  }
  if (refs.orderDirSelect) {
    refs.orderDirSelect.value = filters.orderDir || 'asc';
  }
  if (refs.pageSizeSelect) {
    refs.pageSizeSelect.value = String(filters.pageSize || DEFAULT_PAGE_SIZE);
  }
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
  refs.meta.textContent = `${from}–${to} de ${total} usuarios`;
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
      `<li><button class="btn btn--ghost btn--sm users__page-item" type="button" data-page="${current}" ${
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

export function renderUsersTable(root = document.querySelector('.users')) {
  const container = root instanceof Element ? root : document.querySelector('.users');
  if (!container) return;

  const { tbodyUsers } = els(container);
  if (!tbodyUsers) return;

  const refs = getRefs(container);

  const users = Array.isArray(state.users?.items)
    ? state.users.items
    : Array.isArray(state.users)
      ? state.users
      : [];

  const decorateTable = () => {
    applyRBAC(container);
    mountIcons(container);
  };

  const isLoading = state.ui.loadingUsers;
  const isError = Boolean(state.ui.errorUsers);
  const isEmpty = !isLoading && !isError && !users.length;
  const hasData = !isLoading && !isError && users.length > 0;
  const content = container.querySelector('.users__content');

  const statusName = (() => {
    if (isLoading) return 'loading';
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
    content.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  if (refs.loadingState) refs.loadingState.hidden = true;
  if (refs.errorState) refs.errorState.hidden = true;
  if (refs.emptyState) refs.emptyState.hidden = true;
  if (refs.tableWrapper) refs.tableWrapper.hidden = true;
  if (refs.footer) refs.footer.hidden = true;

  if (isLoading) {
    if (refs.loadingState) refs.loadingState.hidden = false;
  } else if (isError) {
    if (refs.errorState) refs.errorState.hidden = false;
  } else if (isEmpty) {
    if (refs.emptyState) refs.emptyState.hidden = false;
  } else if (hasData) {
    if (refs.tableWrapper) refs.tableWrapper.hidden = false;
    if (refs.footer) refs.footer.hidden = false;
  }

  if (refs.errorMessage) {
    refs.errorMessage.textContent = state.ui.errorUsers || 'No pudimos cargar los usuarios. Intentá nuevamente.';
  }

  if (isLoading) {
    renderUsersStatus('Cargando usuarios…', 'info', container);
  } else if (isError) {
    renderUsersStatus(state.ui.errorUsers || 'No se pudieron cargar los usuarios.', 'error', container);
  } else if (isEmpty) {
    renderUsersStatus('No hay usuarios para mostrar.', 'info', container);
  } else {
    renderUsersStatus('', 'info', container);
  }

  renderFilters(refs);

  if (hasData) {
    tbodyUsers.innerHTML = users
      .filter(Boolean)
      .map((user) => {
        const phoneMissing = isMissingPhone(user.phone);
        const phone = phoneMissing ? '-' : escapeHTML(user.phone);
        const roleId = escapeHTML(user.roleId || '');
        const actions = `
          <div class="users__row-actions" role="group" aria-label="Acciones">
            <button class="btn btn-secondary btn--sm" type="button" data-action="user-edit" data-rbac-action="update" data-rbac-hide>
              ${createButtonTemplate({ label: 'Editar', iconName: 'edit', iconSize: 'sm' })}
            </button>
            ${statusSwitchMarkup(user, { phoneMissing })}
            <button class="btn btn-danger btn--sm" type="button" data-action="user-delete" data-rbac-action="delete">
              ${createButtonTemplate({ label: 'Eliminar', iconName: 'trash', iconSize: 'sm' })}
            </button>
          </div>
        `;
        return `
          <tr data-id="${escapeHTML(String(user.id))}" data-role-id="${roleId}">
            <td>${escapeHTML(user.fullName || '')}</td>
            <td>${escapeHTML(user.email || '')}</td>
            <td>${phone}</td>
            <td>${roleId}</td>
            <td>${formatStatus(user.status)}</td>
            <td>${actions}</td>
          </tr>
        `;
      })
      .join('');
  } else {
    tbodyUsers.innerHTML = '';
  }

  const meta = state.users?.meta || { page: 1, pageSize: DEFAULT_PAGE_SIZE, pageCount: 1, total: 0 };
  if (!isLoading && !isError) {
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

  decorateTable();
}

export default renderUsersTable;
