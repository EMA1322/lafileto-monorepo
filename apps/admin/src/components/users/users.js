import * as rbacClient from '../../utils/rbac.js';
import mountIcons from '../../utils/icons.js';
import { showToast } from '../../utils/snackbar.js';
import { createButtonTemplate } from '../../utils/ui-templates.js';

import { fetchData } from './state.js';
import { renderUsersStatus, renderRolesStatus } from './views/status.js';
import { renderUsersTable } from './views/usersTable.js';
import { renderRolesView } from './views/roles.js';
import { applyRBAC } from '../viewRBAC.js';
import { bindUI } from './views/bindings.js';

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

  if (typeof rbacClient.ensureRbacLoaded === 'function') {
    await rbacClient.ensureRbacLoaded();
  }

  await fetchData({
    onUsersStatus: renderUsersStatus,
    onRolesStatus: renderRolesStatus,
    onUsersTable: renderUsersTable,
    onRolesView: renderRolesView,
  });

  bindUI();
  applyRBAC();
}
