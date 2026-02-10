import {
  state,
  snackWarn,
  snackErr,
  snackOk,
  setFilters,
  resetFilters,
  setPage,
  setPageSize,
  reloadUsers,
  toggleUserStatus,
  findUserById,
} from './users.state.js';
import { guardAction, mapErrorToMessage } from './users.helpers.js';

import {
  openPermissionsMatrixModal,
  openCreateUserModal,
  openEditUserModal,
  openDeleteUserModal,
  openRoleFormModal,
  openRoleDeleteModal,
} from './users.modals.js';
import renderUsersTable from './users.render.table.js';
import { renderRolesStatus, renderUsersStatus } from './users.render.status.js';
import { applyRBAC } from '@/utils/rbac.js';
import { debounce, replaceHash } from '@/utils/helpers.js';
import { els } from './users.dom.js';
import switchTab from './users.render.tabs.js';

export default function renderBindings(
  root = document.querySelector('.users'),
  { onFiltersChange } = {},
) {
  const container = root instanceof Element ? root : document.querySelector('.users');
  if (!container) return;

  const abortController = new AbortController();
  const { signal } = abortController;
  container._usersBindingsAbort?.abort();
  container._usersBindingsAbort = abortController;

  const {
    tabUsers,
    tabRoles,
    tbodyRoles,
    tbodyUsers,
    btnNew,
    btnRoleNew,
    searchInput,
    orderBySelect,
    orderDirSelect,
    pageSizeSelect,
    clearFiltersButton,
    retryButton,
    emptyClearButton,
    pagination,
    pageFirst,
    pagePrev,
    pageNext,
    pageLast,
  } = els(container);

  const debouncedReload = debounce(() => {
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, 300);

  container.addEventListener('users:tab-enforce', (event) => {
    const requested = event?.detail?.tab;
    if (requested === 'roles' && state.rbac.isAdmin) {
      switchTab('roles');
    } else if (requested === 'users') {
      switchTab('users');
    }
  }, { signal });

  tabUsers?.addEventListener('click', () => {
    switchTab('users');
    applyRBAC(container);
  }, { signal });

  tabRoles?.addEventListener('click', () => {
    if (!state.rbac.isAdmin) return;
    switchTab('roles');
    applyRBAC(container);
  }, { signal });

  btnNew?.addEventListener('click', () => {
    const canWrite = guardAction('write', { roleId: state.rbac.roleId, snackWarn });
    if (!canWrite) return;
    openCreateUserModal();
  }, { signal });

  btnRoleNew?.addEventListener('click', () => {
    if (!state.rbac.isAdmin) {
      snackWarn('Solo los administradores pueden crear roles.', 'PERMISSION_DENIED');
      return;
    }
    openRoleFormModal({ mode: 'create' });
  }, { signal });

  const notifyFiltersChange = () => {
    if (typeof onFiltersChange === 'function') onFiltersChange();
  };

  const resetUsersHashState = () => {
    if (typeof window === 'undefined') return;
    if (!window.location.hash.startsWith('#users')) return;
    replaceHash('users');
  };

  searchInput?.addEventListener('input', (event) => {
    setFilters({ q: event.target.value || '' });
    setPage(1);
    notifyFiltersChange();
    debouncedReload();
  }, { signal });

  orderBySelect?.addEventListener('change', (event) => {
    setFilters({ orderBy: event.target.value });
    setPage(1);
    notifyFiltersChange();
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, { signal });

  orderDirSelect?.addEventListener('change', (event) => {
    setFilters({ orderDir: event.target.value });
    setPage(1);
    notifyFiltersChange();
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, { signal });

  pageSizeSelect?.addEventListener('change', (event) => {
    setPageSize(event.target.value);
    setPage(1);
    notifyFiltersChange();
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, { signal });

  clearFiltersButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetFilters();
    resetUsersHashState();
    notifyFiltersChange();
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, { signal });

  retryButton?.addEventListener('click', () => {
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, { signal });

  emptyClearButton?.addEventListener('click', (event) => {
    event.preventDefault();
    resetFilters();
    resetUsersHashState();
    notifyFiltersChange();
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  }, { signal });

  const paginationHandler = (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    const nextPage = Number(button.dataset.page);
    if (!Number.isFinite(nextPage)) return;
    setPage(nextPage);
    notifyFiltersChange();
    void reloadUsers({ onUsersStatus: renderUsersStatus, onUsersTable: renderUsersTable });
  };

  pagination?.addEventListener('click', paginationHandler, { signal });
  pageFirst?.addEventListener('click', paginationHandler, { signal });
  pagePrev?.addEventListener('click', paginationHandler, { signal });
  pageNext?.addEventListener('click', paginationHandler, { signal });
  pageLast?.addEventListener('click', paginationHandler, { signal });

  tbodyRoles?.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    if (!state.rbac.isAdmin) return;

    const tr = btn.closest('tr');
    const roleId = tr?.dataset.roleId;
    if (!roleId) return;

    const role = state.roles.find((r) => r.roleId === roleId || r.id === roleId);
    if (!role) return;

    const action = btn.dataset.action;
    if (action === 'role-edit') {
      if (!state.rbac.isAdmin) return;
      openRoleFormModal({ mode: 'edit', role });
      return;
    }

    if (action === 'role-delete') {
      if (!state.rbac.isAdmin) return;
      if (btn.disabled) return;
      openRoleDeleteModal(role);
      return;
    }

    if (action === 'role-perms') {
      const canUpdate = guardAction('update', { roleId: state.rbac.roleId, snackWarn });
      if (!canUpdate) return;
      try {
        await openPermissionsMatrixModal(role);
      } catch (err) {
        console.error('[users] openPermissionsMatrixModal failed', err);
        renderRolesStatus('No se pudo abrir la matriz de permisos.', 'error', container);
      }
    }
  }, { signal });

  tbodyUsers?.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;

    const tr = btn.closest('tr[data-id]');
    if (!tr) return;
    const userId = tr.dataset.id;
    if (!userId) return;

    const action = btn.dataset.action;

    if (action === 'user-edit') {
      const canUpdate = guardAction('update', { roleId: state.rbac.roleId, snackWarn });
      if (!canUpdate) return;
      const user = findUserById(userId);
      if (!user) {
        snackErr('No se encontró el usuario.');
        return;
      }
      openEditUserModal(user);
      return;
    }

    if (action === 'user-delete') {
      const canDelete = guardAction('delete', { roleId: state.rbac.roleId, snackWarn });
      if (!canDelete) return;
      const user = findUserById(userId);
      if (!user) {
        snackErr('No se encontró el usuario.');
        return;
      }
      openDeleteUserModal(user);
      return;
    }

    if (action === 'user-toggle-status') {
      const canUpdate = guardAction('update', { roleId: state.rbac.roleId, snackWarn });
      if (!canUpdate) return;
      const nextStatus = btn.dataset.nextStatus || 'inactive';
      btn.disabled = true;
      try {
        await toggleUserStatus(userId, nextStatus);
        snackOk('Estado actualizado correctamente.');
        renderUsersTable();
      } catch (err) {
        snackErr(mapErrorToMessage(err, 'No se pudo actualizar el estado.'), err?.code);
        console.error('[users] toggle status failed', err);
      } finally {
        btn.disabled = false;
      }
    }
  }, { signal });
}
