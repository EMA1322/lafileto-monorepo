import {
  state,
  snackWarn,
  snackErr,
  snackOk,
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
import { renderRolesStatus } from './users.render.status.js';
import { applyRBAC } from '@/utils/rbac.js';
import { els } from './users.dom.js';
import switchTab from './users.render.tabs.js';

export default function renderBindings(root = document.querySelector('.users')) {
  const container = root instanceof Element ? root : document.querySelector('.users');
  if (!container) return;

  const {
    tabUsers,
    tabRoles,
    tbodyRoles,
    tbodyUsers,
    btnNew,
    btnRoleNew
  } = els(container);

  container.addEventListener('users:tab-enforce', (event) => {
    const requested = event?.detail?.tab;
    if (requested === 'roles' && state.rbac.isAdmin) {
      switchTab('roles');
    } else if (requested === 'users') {
      switchTab('users');
    }
  });

  tabUsers?.addEventListener('click', () => {
    switchTab('users');
    applyRBAC(container);
  });

  tabRoles?.addEventListener('click', () => {
    if (!state.rbac.isAdmin) return;
    switchTab('roles');
    applyRBAC(container);
  });

  btnNew?.addEventListener('click', () => {
    const canWrite = guardAction('write', { roleId: state.rbac.roleId, snackWarn });
    if (!canWrite) return;
    openCreateUserModal();
  });

  btnRoleNew?.addEventListener('click', () => {
    if (!state.rbac.isAdmin) {
      snackWarn('Solo los administradores pueden crear roles.', 'PERMISSION_DENIED');
      return;
    }
    openRoleFormModal({ mode: 'create' });
  });

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
  });

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
      const nextStatus = btn.dataset.nextStatus || 'INACTIVE';
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
  });
}
