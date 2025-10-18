<<<<<<< HEAD
import * as rbacClient from "@/utils/rbac.js";
import { mountIcons } from "@/utils/icons.js";
=======
import * as rbacClient from '@/utils/rbac.js';
>>>>>>> 31282 (feat(admin/users): adopt ui kit and shared utilities)

import { showToast } from '@/utils/snackbar.js';

import {
  state,
  initializeState,
  loadUsers,
  loadRolesAndModules,
  reloadUsers,
  toggleUserStatus,
  findUserById,
  subscribeUsers,
  subscribeRoles,
  subscribeRbac,
  setActiveTab,
  getActiveTab,
  notifyError,
} from './state.js';
import { applyRbacToView } from './viewRBAC.js';
import { createUsersTable } from './usersTable.js';
import {
  openCreateUserModal,
  openEditUserModal,
  openDeleteUserModal,
  openCreateRoleModal,
  openEditRoleModal,
  openDeleteRoleModal,
  openPermissionsModal,
} from './modals.js';
import { createButtonTemplate } from '@/utils/ui-templates.js';
import { escapeHTML } from './helpers.js';

let currentCleanup = null;

function getRefs(root) {
  return {
    root,
    tabs: root.querySelector('[data-users-tabs]'),
    tabUsers: root.querySelector('#tab-users'),
    tabRoles: root.querySelector('#tab-roles'),
    panelUsers: root.querySelector('[data-panel="users"]'),
    panelRoles: root.querySelector('[data-panel="roles"]'),
    usersStatus: root.querySelector('[data-users-status]'),
    rolesStatus: root.querySelector('[data-roles-status]'),
    userNewButton: root.querySelector('[data-action="user-new"]'),
    userRefreshButton: root.querySelector('[data-action="users-refresh"]'),
    roleNewButton: root.querySelector('[data-action="role-new"]'),
    usersTableWrap: root.querySelector('[data-users-table-wrap]'),
    rolesTable: root.querySelector('[data-roles-table]'),
    rolesTbody: root.querySelector('[data-roles-tbody]'),
    rolesEmpty: root.querySelector('[data-roles-empty]'),
  };
}

function renderRoles(snapshot, refs) {
  if (!refs.rolesTbody) return;
  const { items = [], loading, error, message } = snapshot;

  if (refs.rolesStatus) {
    if (loading) refs.rolesStatus.textContent = 'Cargando roles…';
    else if (error) refs.rolesStatus.textContent = error;
    else refs.rolesStatus.textContent = message || '';
  }

  if (loading || error) {
    refs.rolesTbody.innerHTML = '';
    refs.rolesEmpty?.setAttribute('hidden', 'true');
    return;
  }

<<<<<<< HEAD
  mountIcons(container);

  if (rbacClient.ensureRbacLoaded) {
=======
  if (!items.length) {
    refs.rolesTbody.innerHTML = '';
    refs.rolesEmpty?.removeAttribute('hidden');
    return;
  }

  refs.rolesEmpty?.setAttribute('hidden', 'true');
  refs.rolesTbody.innerHTML = items
    .map((role) => {
      const roleId = role.roleId || role.id || '';
      const safeRoleId = escapeHTML(roleId);
      const name = escapeHTML(role.name || roleId);
      const actions = `
        <div class="table__actions">
          ${createButtonTemplate({
            label: 'Editar',
            variant: 'ghost',
            size: 'sm',
            attributes: {
              'data-role-action': 'edit',
              'data-role-id': safeRoleId,
            },
          })}
          ${createButtonTemplate({
            label: 'Permisos',
            variant: 'ghost',
            size: 'sm',
            attributes: {
              'data-role-action': 'perms',
              'data-role-id': safeRoleId,
            },
          })}
          ${createButtonTemplate({
            label: 'Eliminar',
            variant: 'danger',
            size: 'sm',
            attributes: {
              'data-role-action': 'delete',
              'data-role-id': safeRoleId,
            },
          })}
        </div>
      `;
      return `
        <tr data-role-id="${safeRoleId}">
          <td>${safeRoleId}</td>
          <td>${name}</td>
          <td data-align="end">${actions}</td>
        </tr>
      `;
    })
    .join('');
}

function bindTabs(refs) {
  if (!refs.tabs) return () => {};

  const onClick = (event) => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    const tab = button.getAttribute('data-tab');
    if (!tab) return;
    setActiveTab(tab);
    refs.tabUsers?.setAttribute('aria-selected', tab === 'users');
    refs.tabRoles?.setAttribute('aria-selected', tab === 'roles');
  };

  refs.tabs.addEventListener('click', onClick);
  return () => refs.tabs.removeEventListener('click', onClick);
}

function bindRolesActions(refs) {
  if (!refs.rolesTbody) return () => {};
  const onClick = (event) => {
    const actionBtn = event.target.closest('[data-role-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-role-action');
    const roleId = actionBtn.getAttribute('data-role-id');
    if (!roleId) return;
    const role = state.roles.find((item) => (item.roleId || item.id) === roleId);
    if (!role) return;

    if (action === 'edit') {
      openEditRoleModal(role);
    } else if (action === 'delete') {
      openDeleteRoleModal(role);
    } else if (action === 'perms') {
      openPermissionsModal(role);
    }
  };
  refs.rolesTbody.addEventListener('click', onClick);
  return () => refs.rolesTbody.removeEventListener('click', onClick);
}

async function mountUsers(root) {
  const refs = getRefs(root);

  if (typeof rbacClient.ensureRbacLoaded === 'function') {
>>>>>>> 31282 (feat(admin/users): adopt ui kit and shared utilities)
    await rbacClient.ensureRbacLoaded();
  }

  await initializeState();

  const table = createUsersTable({
    root,
    onEdit: (userId) => {
      const user = findUserById(userId);
      if (user) openEditUserModal(user);
    },
    onDelete: (userId) => {
      const user = findUserById(userId);
      if (user) openDeleteUserModal(user);
    },
    onToggleStatus: async (userId, nextStatus) => {
      try {
        await toggleUserStatus(userId, nextStatus);
        showToast({ message: 'Estado actualizado.', type: 'success' });
      } catch (err) {
        notifyError(err, 'No se pudo cambiar el estado.');
      }
    },
  });

  const unsubscribers = [];

  unsubscribers.push(
    subscribeUsers((snapshot) => {
      if (refs.usersStatus) {
        if (snapshot.loading) refs.usersStatus.textContent = 'Cargando usuarios…';
        else if (snapshot.error) refs.usersStatus.textContent = snapshot.error;
        else refs.usersStatus.textContent = snapshot.message || '';
      }
      table.render(snapshot);
    })
  );

  unsubscribers.push(
    subscribeRoles((snapshot) => {
      renderRoles(snapshot, refs);
    })
  );

  unsubscribers.push(
    subscribeRbac((snapshot) => {
      applyRbacToView(
        {
          tabRoles: refs.tabRoles,
          panelRoles: refs.panelRoles,
          panelUsers: refs.panelUsers,
          userNewButton: refs.userNewButton,
          roleNewButton: refs.roleNewButton,
          usersTbody: root.querySelector('[data-users-tbody]'),
          rolesTbody: refs.rolesTbody,
        },
        snapshot
      );
      const active = snapshot.activeTab || getActiveTab();
      refs.tabUsers?.setAttribute('aria-selected', active === 'users');
      refs.tabRoles?.setAttribute('aria-selected', active === 'roles');
    })
  );

  const disposers = [
    () => {
      unsubscribers.forEach((fn) => fn?.());
    },
    () => table.destroy(),
  ];

  if (refs.userNewButton) {
    const handler = () => openCreateUserModal();
    refs.userNewButton.addEventListener('click', handler);
    disposers.push(() => refs.userNewButton.removeEventListener('click', handler));
  }

  if (refs.userRefreshButton) {
    const handler = async () => {
      try {
        await reloadUsers({ silent: false });
      } catch (err) {
        notifyError(err, 'No se pudieron recargar los usuarios.');
      }
    };
    refs.userRefreshButton.addEventListener('click', handler);
    disposers.push(() => refs.userRefreshButton.removeEventListener('click', handler));
  }

  if (refs.roleNewButton) {
    const handler = () => openCreateRoleModal();
    refs.roleNewButton.addEventListener('click', handler);
    disposers.push(() => refs.roleNewButton.removeEventListener('click', handler));
  }

  disposers.push(bindTabs(refs));
  disposers.push(bindRolesActions(refs));

  try {
    await loadUsers();
  } catch (err) {
    notifyError(err, 'No se pudieron cargar los usuarios.');
  }
  try {
    await loadRolesAndModules();
  } catch (err) {
    notifyError(err, 'No se pudieron cargar los roles.');
  }

  return () => {
    disposers.forEach((dispose) => dispose && dispose());
  };
}

export async function initUsers(attempt = 0) {
  const container = document.querySelector('[data-view="users"]');
  if (!container) {
    if (attempt < 10) {
      setTimeout(() => initUsers(attempt + 1), 50);
    }
    return;
  }

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  currentCleanup = await mountUsers(container);
}

export function unmountUsers() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
}
