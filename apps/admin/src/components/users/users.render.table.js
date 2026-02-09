import { state } from './users.state.js';
import { escapeHTML, createButtonTemplate } from './users.helpers.js';

import { renderUsersStatus } from './users.render.status.js';
import { els } from './users.dom.js';
import { applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';

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

export function renderUsersTable(root = document.querySelector('.users')) {
  const container = root instanceof Element ? root : document.querySelector('.users');
  if (!container) return;

  const { tbodyUsers } = els(container);
  if (!tbodyUsers) return;

  const users = Array.isArray(state.users?.items)
    ? state.users.items
    : Array.isArray(state.users)
      ? state.users
      : [];

  const decorateTable = () => {
    applyRBAC(container);
    mountIcons(container);
  };

  if (state.ui.loadingUsers) {
    renderUsersStatus('Cargando usuarios…', 'info', container);
    tbodyUsers.innerHTML = '';
    decorateTable();
    return;
  }

  if (state.ui.errorUsers) {
    renderUsersStatus(state.ui.errorUsers, 'error', container);
    tbodyUsers.innerHTML = '';
    decorateTable();
    return;
  }

  if (!users.length) {
    renderUsersStatus('No hay usuarios cargados.', 'info', container);
    tbodyUsers.innerHTML = '';
    decorateTable();
    return;
  }

  renderUsersStatus('', 'info', container);

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

  decorateTable();
}

export default renderUsersTable;
