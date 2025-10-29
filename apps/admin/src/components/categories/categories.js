// Admin / Categories entrypoint
// Comentarios en español, código en inglés.

import { ensureRbacLoaded, applyRBAC } from '@/utils/rbac.js';

import { MODULE_KEY, MODULE_KEY_ALIAS } from './categories.helpers.js';
import { fetchCategories, getModuleKey, getSnapshot, subscribe } from './categories.state.js';
import { renderCategoriesTable } from './categories.render.table.js';
import { bindCategoriesBindings } from './categories.render.bindings.js';

let unsubscribe = null;

function mountSubscriptions(container) {
  if (unsubscribe) return;
  unsubscribe = subscribe((snapshot) => {
    renderCategoriesTable(snapshot, container);
  });
}

async function ensurePermissions(container) {
  await ensureRbacLoaded();
  container.dataset.rbacModule = MODULE_KEY;
  container.dataset.rbacAlias = MODULE_KEY_ALIAS;
  container.dataset.rbacSource = getModuleKey();
  applyRBAC(container);
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

  await ensurePermissions(container);

  mountSubscriptions(container);
  renderCategoriesTable(getSnapshot(), container);
  bindCategoriesBindings(container);

  try {
    await fetchCategories();
  } catch {
    renderCategoriesTable(getSnapshot(), container);
  }
}
