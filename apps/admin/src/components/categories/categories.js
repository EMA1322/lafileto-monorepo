// Admin / Categories entrypoint
// Comentarios en español, código en inglés.

import { ensureRbacLoaded, applyRBAC, canRead, canWrite, canUpdate, canDelete } from '@/utils/rbac.js';

import { MODULE_KEY, MODULE_KEY_ALIAS } from './categories.helpers.js';
import { fetchCategories, getModuleKey, getSnapshot, subscribe, state, notify } from './categories.state.js';
import { renderCategoriesTable } from './categories.render.table.js';
import { bindCategoriesBindings } from './categories.render.bindings.js';

let unsubscribe = null;

function mountSubscriptions(container) {
  if (unsubscribe) return;
  unsubscribe = subscribe((snapshot) => {
    renderCategoriesTable(snapshot, container);
  });
}

function resolveModulePermissions() {
  const keys = [MODULE_KEY, MODULE_KEY_ALIAS].filter((key, index, arr) => key && arr.indexOf(key) === index);
  const check = (fn) => {
    if (typeof fn !== 'function') return false;
    return keys.some((key) => fn(key));
  };
  return {
    read: check(canRead),
    write: check(canWrite),
    update: check(canUpdate),
    delete: check(canDelete),
  };
}

async function ensurePermissions(container) {
  await ensureRbacLoaded();
  container.dataset.rbacModule = MODULE_KEY;
  container.dataset.rbacAlias = MODULE_KEY_ALIAS;
  container.dataset.rbacSource = getModuleKey();
  applyRBAC(container);
  return resolveModulePermissions();
}

export async function initCategories(attempt = 0) {
  const container = document.querySelector('#categories-view');
  if (!container) {
    if (attempt < 10) {
      setTimeout(() => {
        void initCategories(attempt + 1);
      }, 50);
    }
    return;
  }

  if (container.dataset.categoriesInit === 'true') {
    renderCategoriesTable(getSnapshot(), container);
    applyRBAC(container);
    return;
  }

  container.dataset.categoriesInit = 'true';

  const permissions = await ensurePermissions(container);

  mountSubscriptions(container);
  bindCategoriesBindings(container);

  if (!permissions.read) {
    state.loading = false;
    state.error = Object.assign(new Error('No tenés permisos para ver esta sección.'), {
      code: 'PERMISSION_DENIED',
    });
    notify(container);
    return;
  }

  renderCategoriesTable(getSnapshot(), container);

  try {
    await fetchCategories();
  } catch {
    renderCategoriesTable(getSnapshot(), container);
  }
}
