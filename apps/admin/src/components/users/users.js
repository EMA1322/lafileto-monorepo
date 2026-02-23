import { ensureRbacLoaded, applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';
import { toast } from '@/utils/toast.js';
import { replaceHash } from '@/utils/helpers.js';
import { initTooltips } from '@/utils/floating.js';

import {
  createButtonTemplate,
  MODULE_KEY,
  MODULE_KEY_ALIAS,
  ADMIN_ROLE_IDS,
} from './users.helpers.js';
import {
  state,
  fetchData,
  parseFiltersFromHash,
  replaceFilters,
  getFiltersQuery,
  reloadUsers,
} from './users.state.js';
import {
  renderUsersTable,
  renderRolesView,
  renderUsersStatus,
  renderRolesStatus,
  renderBindings,
} from './users.views.js';

let hashChangeHandler = null;
let skipHashSync = false;
let lastHashValue = null;
let actionButtonsObserver = null;

function hydrateTableActionButtons(container) {
  const actionButtons = container.querySelectorAll('[data-action="user-edit"], [data-action="user-delete"]');
  actionButtons.forEach((button) => {
    const isDeleteAction = button.dataset.action === 'user-delete';
    const actionLabel = isDeleteAction ? 'Eliminar usuario' : 'Editar usuario';
    const iconName = isDeleteAction ? 'trash' : 'edit';
    const toneClass = isDeleteAction ? 'icon-btn--danger' : 'icon-btn--ghost';

    button.classList.add('icon-btn', 'icon-btn--sm', toneClass);
    button.classList.remove('btn', 'btn--ghost', 'btn--danger', 'btn--sm');
    button.setAttribute('aria-label', actionLabel);
    button.setAttribute('data-tooltip', actionLabel);
    button.setAttribute('data-tooltip-placement', 'top');

    if (button.dataset.iconified !== 'true') {
      button.innerHTML = `<span class="icon icon--sm" data-icon="${iconName}" aria-hidden="true"></span><span class="sr-only">${actionLabel}</span>`;
      button.dataset.iconified = 'true';
    }
  });

  initTooltips(container);
}

function setupActionButtonsObserver(container) {
  const tableBody = container.querySelector('#users-tbody');
  if (!tableBody) return;
  if (actionButtonsObserver) actionButtonsObserver.disconnect();

  actionButtonsObserver = new MutationObserver(() => {
    hydrateTableActionButtons(container);
    mountIcons(container);
  });

  actionButtonsObserver.observe(tableBody, { childList: true, subtree: true });
}

function setupToolbarButtons(container) {
  const btnUserNew = container.querySelector('#btn-user-new');
  if (btnUserNew && btnUserNew.dataset.iconified !== 'true') {
    btnUserNew.innerHTML = createButtonTemplate({
      label: 'Crear usuario',
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

function syncHashWithState() {
  if (typeof window === 'undefined') return;
  const filtersQuery = getFiltersQuery(state.filters);
  const target = filtersQuery ? `#users?${filtersQuery}` : '#users';
  if (window.location.hash === target || lastHashValue === target) {
    lastHashValue = target;
    return;
  }
  lastHashValue = replaceHash('users', filtersQuery) || target;
  skipHashSync = true;
  queueMicrotask(() => {
    skipHashSync = false;
  });
}

function handleHashChange(container) {
  if (typeof window === 'undefined') return;
  if (skipHashSync) return;
  const next = parseFiltersFromHash(window.location.hash);
  if (!next) return;
  lastHashValue = window.location.hash;
  replaceFilters(next);
  renderUsersTable(container);
  void reloadUsers({
    onUsersStatus: renderUsersStatus,
    onUsersTable: renderUsersTable,
  });
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
    toast.error('No se encontró la vista de usuarios.', { duration: 4000 });
    return;
  }

  const alreadyInitialized = container.dataset.usersInit === 'true';
  container.dataset.usersInit = 'true';

  const initialFilters = parseFiltersFromHash(typeof window !== 'undefined' ? window.location.hash : '');
  if (initialFilters) {
    replaceFilters(initialFilters);
  }

  setupToolbarButtons(container);
  mountIcons(container);
  hydrateTableActionButtons(container);
  setupActionButtonsObserver(container);

  await ensureRbacLoaded();

  container.dataset.rbacModule = MODULE_KEY;
  container.dataset.rbacAlias = MODULE_KEY_ALIAS;
  container.dataset.rbacAdminRoles = ADMIN_ROLE_IDS.join(',');

  if (!alreadyInitialized) {
    await fetchData({
      onUsersStatus: renderUsersStatus,
      onRolesStatus: renderRolesStatus,
      onUsersTable: renderUsersTable,
      onRolesView: renderRolesView,
    });
  } else {
    renderUsersTable(container);
  }

  container.dataset.rbacModule = MODULE_KEY;
  container.dataset.rbacAlias = MODULE_KEY_ALIAS;
  container.dataset.rbacRoleId = state.rbac.roleId ? String(state.rbac.roleId) : '';
  container.dataset.rbacIsAdmin = state.rbac.isAdmin ? 'true' : 'false';
  container.dataset.rbacAdminRoles = ADMIN_ROLE_IDS.join(',');
  container.dataset.rbacUserId = state.session.userId != null ? String(state.session.userId) : '';
  container.dataset.rbacActiveTab = state.ui.activeTab;

  renderBindings(container, { onFiltersChange: syncHashWithState });
  applyRBAC(container);
  hydrateTableActionButtons(container);
  mountIcons(container);

  if (typeof window !== 'undefined') {
    if (hashChangeHandler) {
      window.removeEventListener('hashchange', hashChangeHandler);
    }
    hashChangeHandler = () => handleHashChange(container);
    window.addEventListener('hashchange', hashChangeHandler);
    syncHashWithState();
  }
}
