import { els } from './users.dom.js';

export function renderUsersStatus(message, type = 'info', root = document.querySelector('.users')) {
  const { statusUsers } = els(root);
  if (!statusUsers) return;
  statusUsers.textContent = message || '';
  statusUsers.dataset.type = type;
}

export function renderRolesStatus(message, type = 'info', root = document.querySelector('.users')) {
  const { statusRoles } = els(root);
  if (!statusRoles) return;
  statusRoles.textContent = message || '';
  statusRoles.dataset.type = type;
}

export default function renderStatus({ target = 'users', message = '', type = 'info', root } = {}) {
  const scope = root instanceof Element ? root : document.querySelector('.users');
  if (target === 'roles') {
    renderRolesStatus(message, type, scope);
  } else {
    renderUsersStatus(message, type, scope);
  }
}
