import { state } from './users.state.js';
import { escapeHTML, createButtonTemplate, ADMIN_ROLE_IDS } from './users.helpers.js';

import { applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';

import { renderRolesStatus } from './users.render.status.js';
import { els } from './users.dom.js';

export function renderRolesView(root = document.querySelector('.users')) {
  const container = root instanceof Element ? root : document.querySelector('.users');
  if (!container) return;

  const { tbodyRoles } = els(container);
  if (!tbodyRoles) return;

  const roles = Array.isArray(state.roles) ? state.roles : [];

  const decorate = () => {
    applyRBAC(container);
    mountIcons(container);
  };

  if (state.ui.loadingRoles) {
    renderRolesStatus('Cargando roles…', 'info', container);
    tbodyRoles.innerHTML = '';
    decorate();
    return;
  }

  if (state.ui.errorRoles) {
    renderRolesStatus(state.ui.errorRoles, 'error', container);
    tbodyRoles.innerHTML = '';
    decorate();
    return;
  }

  if (!roles.length) {
    renderRolesStatus('No hay roles registrados.', 'info', container);
    tbodyRoles.innerHTML = '';
    decorate();
    return;
  }

  renderRolesStatus('', 'info', container);

  tbodyRoles.innerHTML = roles
    .filter(Boolean)
    .map((role) => {
      const roleId = role.roleId || role.id || '';
      const name = role.name || roleId;
      const isProtected = ADMIN_ROLE_IDS.includes(String(roleId).toLowerCase());
      const persistDisabled = isProtected ? 'disabled data-rbac-persist-disabled="true"' : '';
      return `
        <tr data-role-id="${escapeHTML(roleId)}">
          <td>${escapeHTML(roleId)}</td>
          <td>${escapeHTML(name)}</td>
          <td class="users__row-actions">
            <button
              class="btn btn-secondary"
              type="button"
              data-action="role-edit"
              data-rbac-role="admin"
              data-rbac-hide
            >
              ${createButtonTemplate({ label: 'Editar', iconName: 'edit', iconSize: 'sm' })}
            </button>
            <button
              class="btn btn-secondary"
              type="button"
              data-action="role-perms"
              title="Permisos del rol"
              data-rbac-role="admin"
              data-rbac-hide
            >
              ${createButtonTemplate({ label: 'Permisos', iconName: 'shield-check', iconSize: 'sm' })}
            </button>
            <button
              class="btn btn-tertiary"
              type="button"
              data-action="role-delete"
              data-rbac-role="admin"
              data-rbac-action="delete"
              data-rbac-hide
              ${persistDisabled}
            >
              ${createButtonTemplate({ label: 'Eliminar', iconName: 'trash', iconSize: 'sm' })}
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  decorate();
}

export default renderRolesView;
