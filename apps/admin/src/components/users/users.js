import { ensureRbacLoaded, applyRBAC } from '@/utils/rbac.js';
import { mountIcons } from '@/utils/icons.js';
import { toast } from '@/utils/toast.js';
import { replaceHash } from '@/utils/helpers.js';

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
