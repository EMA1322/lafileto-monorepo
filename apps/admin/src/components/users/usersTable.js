import { paginate, renderRows, sortBy, buildTableCell, buildTableRow } from '@/utils/table.js';
import {
  createButtonTemplate,
  createStatusBadgeTemplate,
  createSwitchTemplate,
} from '@/utils/ui-templates.js';
import { STATUS } from '@/utils/status.enum.js';

import { escapeHTML } from './helpers.js';
import { TABLE_PAGE_SIZE } from './state.js';

const SORTABLE_KEYS = ['fullName', 'email', 'phone', 'roleId', 'status'];

function resolveSortValue(item, key) {
  if (key === 'status') return item.status === STATUS.ACTIVE ? 'A' : 'Z';
  if (key === 'phone') return item.phone || '';
  return item?.[key] || '';
}

export function createUsersTable({
  root,
  onEdit,
  onDelete,
  onToggleStatus,
  onSort,
} = {}) {
  if (!root) throw new Error('Users table requires a root container.');
  const table = root.querySelector('[data-users-table]');
  const tbody = root.querySelector('[data-users-tbody]');
  const empty = root.querySelector('[data-users-empty]');
  const count = root.querySelector('[data-users-count]');
  const pagination = root.querySelector('[data-users-pagination]');
  const pageInfo = pagination?.querySelector('[data-page-info]');
  const prevBtn = pagination?.querySelector('[data-page="prev"]');
  const nextBtn = pagination?.querySelector('[data-page="next"]');

  const state = {
    sortKey: 'fullName',
    sortDir: 'asc',
    page: 1,
    pageSize: TABLE_PAGE_SIZE,
    snapshot: { items: [], total: 0, loading: false, error: null },
  };

  function updateSortIndicators() {
    if (!table) return;
    table.querySelectorAll('th[data-sort]').forEach((th) => {
      const key = th.getAttribute('data-sort');
      if (!key) return;
      if (key === state.sortKey) {
        th.setAttribute('data-sort-active', state.sortDir);
      } else {
        th.removeAttribute('data-sort-active');
      }
    });
  }

  function render(snapshot) {
    state.snapshot = snapshot;
    const { items = [], total = 0, loading, error } = snapshot || {};

    if (loading) {
      tbody.innerHTML = '';
      empty.setAttribute('hidden', 'true');
      count.textContent = 'Cargando…';
      if (pageInfo) pageInfo.textContent = '';
      return;
    }

    if (error) {
      tbody.innerHTML = '';
      empty.setAttribute('hidden', 'true');
      count.textContent = '';
      if (pageInfo) pageInfo.textContent = '';
      return;
    }

    if (!items.length) {
      tbody.innerHTML = '';
      empty.removeAttribute('hidden');
      count.textContent = '0 resultados';
      if (pageInfo) pageInfo.textContent = '1 / 1';
      state.page = 1;
      return;
    }

    empty.setAttribute('hidden', 'true');

    const sorted = sortBy(items, state.sortKey, state.sortDir, (entry) => resolveSortValue(entry, state.sortKey));
    const { items: pageItems, totalItems, totalPages, page } = paginate(sorted, state.page, state.pageSize);
    state.page = page;

    const rows = renderRows(pageItems, (user) => {
      const safeId = escapeHTML(String(user.id));
      const nextStatus = user.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
      const actions = `
        <div class="table__actions">
          ${createButtonTemplate({
            label: 'Editar',
            variant: 'ghost',
            size: 'sm',
            attributes: {
              'data-action': 'user-edit',
              'data-user-id': safeId,
            },
          })}
          ${createSwitchTemplate({
            checked: user.status === STATUS.ACTIVE,
            label: user.status === STATUS.ACTIVE ? 'Activo' : 'Inactivo',
            attributes: {
              'data-action': 'user-toggle-status',
              'data-user-id': safeId,
              'data-next-status': nextStatus,
              class: 'switch--sm',
            },
          })}
          ${createButtonTemplate({
            label: 'Eliminar',
            variant: 'danger',
            size: 'sm',
            attributes: {
              'data-action': 'user-delete',
              'data-user-id': safeId,
            },
          })}
        </div>
      `;

      return buildTableRow(
        [
          buildTableCell(escapeHTML(user.fullName || '')),
          buildTableCell(escapeHTML(user.email || '')),
          buildTableCell(user.phone ? escapeHTML(user.phone) : '—'),
          buildTableCell(escapeHTML(user.roleId || '')),
          buildTableCell(createStatusBadgeTemplate(user.status)),
          buildTableCell(actions, { attributes: { 'data-align': 'end' } }),
        ],
        {
          attributes: {
            'data-user-id': safeId,
            'data-role-id': escapeHTML(user.roleId || ''),
          },
        }
      );
    });

    tbody.innerHTML = rows;

    count.textContent = `${totalItems} resultados`;
    if (pageInfo) pageInfo.textContent = `${page} / ${totalPages}`;

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
    updateSortIndicators();
  }

  function handleSort(event) {
    const target = event.target.closest('th[data-sort]');
    if (!target) return;
    const key = target.getAttribute('data-sort');
    if (!key || !SORTABLE_KEYS.includes(key)) return;
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = key;
      state.sortDir = 'asc';
    }
    state.page = 1;
    updateSortIndicators();
    render(state.snapshot);
    if (typeof onSort === 'function') onSort({ key: state.sortKey, direction: state.sortDir });
  }

  function handleAction(event) {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.getAttribute('data-action');
    const userId = actionTarget.getAttribute('data-user-id') || actionTarget.closest('tr')?.dataset.userId;
    if (!userId) return;

    if (action === 'user-edit' && typeof onEdit === 'function') {
      onEdit(userId);
    }
    if (action === 'user-delete' && typeof onDelete === 'function') {
      onDelete(userId);
    }
    if (action === 'user-toggle-status' && typeof onToggleStatus === 'function') {
      const nextStatus = actionTarget.getAttribute('data-next-status') || STATUS.INACTIVE;
      onToggleStatus(userId, nextStatus);
    }
  }

  function handlePagination(event) {
    const btn = event.target.closest('[data-page]');
    if (!btn) return;
    const direction = btn.getAttribute('data-page');
    const { totalPages } = paginate(state.snapshot.items || [], state.page, state.pageSize);
    if (direction === 'prev' && state.page > 1) {
      state.page -= 1;
      render(state.snapshot);
    }
    if (direction === 'next' && state.page < totalPages) {
      state.page += 1;
      render(state.snapshot);
    }
  }

  table?.addEventListener('click', handleSort);
  tbody?.addEventListener('click', handleAction);
  pagination?.addEventListener('click', handlePagination);

  return {
    render,
    destroy() {
      table?.removeEventListener('click', handleSort);
      tbody?.removeEventListener('click', handleAction);
      pagination?.removeEventListener('click', handlePagination);
    },
    setPage(page) {
      state.page = Math.max(1, Number(page) || 1);
      render(state.snapshot);
    },
    getState() {
      return { ...state };
    },
  };
}
