import { ensureRbacLoaded, applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';
import { showToast } from '@/utils/snackbar.js';

import {
  createButtonTemplate,
  MODULE_KEY,
  MODULE_KEY_ALIAS,
  ADMIN_ROLE_IDS,
} from './users.helpers.js';
import { state, fetchData } from './users.state.js';
import {
  renderUsersTable,
  renderRolesView,
  renderUsersStatus,
  renderRolesStatus,
  renderBindings,
} from './users.views.js';

function setupToolbarButtons(container) {
  const btnUserNew = container.querySelector('#btn-user-new');
  if (btnUserNew && btnUserNew.dataset.iconified !== 'true') {
    btnUserNew.innerHTML = createButtonTemplate({
      label: 'Nuevo usuario',
      iconName: 'plus',
      iconSize: 'sm',
    });
    btnUserNew.dataset.iconified = 'true';
  }

  const btnRoleNew = container.querySelector('#btn-role-new');
  if (btnRoleNew && btnRoleNew.dataset.iconified !== 'true') {
    btnRoleNew.innerHTML = createButtonTemplate({
      label: 'Nuevo rol',
      iconName: 'plus',
      iconSize: 'sm',
    });
    btnRoleNew.dataset.iconified = 'true';
  }
}

export async function initUsers(attempt = 0) {
  const container = document.querySelector('.users');
  if (!container) {
    if (attempt < 10) {
      setTimeout(() => {
        void initUsers(attempt + 1);
      }, 50);
      return;
    }
    console.warn('[users] Container not found.');
    showToast({ message: 'No se encontró la vista de usuarios.', type: 'error', timeout: 4000 });
    return;
  }

  setupToolbarButtons(container);
  mountIcons(container);

  await ensureRbacLoaded();

  container.dataset.rbacModule = MODULE_KEY;
  container.dataset.rbacAlias = MODULE_KEY_ALIAS;
  container.dataset.rbacAdminRoles = ADMIN_ROLE_IDS.join(',');

  await fetchData({
    onUsersStatus: renderUsersStatus,
    onRolesStatus: renderRolesStatus,
    onUsersTable: renderUsersTable,
    onRolesView: renderRolesView,
  });

  container.dataset.rbacModule = MODULE_KEY;
  container.dataset.rbacAlias = MODULE_KEY_ALIAS;
  container.dataset.rbacRoleId = state.rbac.roleId ? String(state.rbac.roleId) : '';
  container.dataset.rbacIsAdmin = state.rbac.isAdmin ? 'true' : 'false';
  container.dataset.rbacAdminRoles = ADMIN_ROLE_IDS.join(',');
  container.dataset.rbacUserId = state.session.userId != null ? String(state.session.userId) : '';
  container.dataset.rbacActiveTab = state.ui.activeTab;

  renderBindings(container);
  applyRBAC(container);
  mountIcons(container);
}
