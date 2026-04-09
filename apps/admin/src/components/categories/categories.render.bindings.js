// // Admin / Categorías — event bindings
// // Comentarios en español, código en inglés.

import {
  fetchCategories,
  getSnapshot,
  resetFilters,
  setFilterActive,
  setOrder,
  setPage,
  setPageSize,
  setSearch,
} from './categories.state.js';
import { renderCategoriesTable } from './categories.render.table.js';
import {
  openCreateCategoryModal,
  openEditCategoryModal,
  openDeleteCategoryModal,
  openViewCategoryModal,
} from './categories.modals.js';
import { MODULE_KEY, MODULE_KEY_ALIAS } from './categories.helpers.js';
import { mountIcons } from '@/utils/icons.js';
import { initTooltips } from '@/utils/floating.js';
import notify from '@/utils/notify.js';
import { applyRBAC, can } from '@/utils/rbac.js';

function decorateRenderedContent(container) {
  mountIcons(container);
  initTooltips(container);
  applyRBAC(container);
}

/** Debounce util sin dependencias. */
function debounce(fn, wait = 300) {
  const timer = typeof window !== 'undefined' ? window : globalThis;
  const schedule =
    typeof timer.setTimeout === 'function' ? timer.setTimeout.bind(timer) : setTimeout;
  const cancel =
    typeof timer.clearTimeout === 'function' ? timer.clearTimeout.bind(timer) : clearTimeout;
  let timeoutId;
  return (...args) => {
    cancel(timeoutId);
    timeoutId = schedule(() => fn(...args), wait);
  };
}

/** Refresca desde la API y vuelve a renderizar con fallback a snapshot */
async function refreshAndRender(container) {
  try {
    await fetchCategories();
  } catch {
    renderCategoriesTable(getSnapshot(), container);
    decorateRenderedContent(container);
    return;
  }
  renderCategoriesTable(getSnapshot(), container);
  decorateRenderedContent(container);
}

function applyDefaultFiltersToControls(container) {
  const search = container.querySelector('input[type="search"]');
  const filter = container.querySelector('#categories-filter-active');
  const order = container.querySelector('#categories-order');
  const pageSize = container.querySelector('#categories-page-size');

  if (search) search.value = '';
  if (filter) filter.value = 'all';
  if (order) order.value = 'asc';
  if (pageSize) pageSize.value = '10';
}

async function clearAndReload(container) {
  resetFilters();
  applyDefaultFiltersToControls(container);
  await refreshAndRender(container);
}

/** Enlaza eventos de la vista de categorías */
export function bindCategoriesBindings(container) {
  if (!container) return;

  // --- Búsqueda
  const $search =
    container.querySelector('[data-role="search"]') ||
    container.querySelector('input[type="search"]');
  if ($search) {
    const onSearch = debounce(async () => {
      setSearch($search.value);
      setPage(1);
      await refreshAndRender(container);
    }, 300);
    $search.addEventListener('input', onSearch);
  }

  const $clear = container.querySelector('#categories-filter-clear');
  if ($clear) {
    $clear.addEventListener('click', async (event) => {
      event.preventDefault();
      await clearAndReload(container);
    });
  }

  const $retry = container.querySelector('#categories-retry');
  if ($retry) {
    $retry.addEventListener('click', async () => {
      await refreshAndRender(container);
    });
  }

  const $emptyClear = container.querySelector('#categories-empty-clear');
  if ($emptyClear) {
    $emptyClear.addEventListener('click', async (event) => {
      event.preventDefault();
      await clearAndReload(container);
    });
  }

  // --- Filtros
  container.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (!el || !el.dataset) return;

    // filtro activo
    if (el.matches('[data-filter]')) {
      setFilterActive(el.value);
      setPage(1);
      await refreshAndRender(container);
      return;
    }

    // orden
    if (el.matches('[data-order]')) {
      setOrder(el.value);
      setPage(1);
      await refreshAndRender(container);
      return;
    }

    if (el.matches('#categories-page-size')) {
      setPageSize(el.value);
      setPage(1);
      await refreshAndRender(container);
    }
  });

  // --- Paginación
  container.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-page]');
    if (!btn) return;
    const page = Number(btn.dataset.page || 1);
    if (Number.isFinite(page)) {
      setPage(page);
      await refreshAndRender(container);
    }
  });

  // --- Delegación de eventos por filas de la tabla
  container.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-action]');
    if (!t) return;
    // Accept both "category-*" and plain actions; fallback to <tr data-id> for row id.
    const action = (t.dataset.action || '').replace(/^category-/, '').toLowerCase();
    const targetId = (t.dataset.id || t.closest('tr')?.dataset.id || '').trim();

    // Crear nueva categoría
    if (action === 'new') {
      const created = await openCreateCategoryModal();
      if (created) await refreshAndRender(container);
      return;
    }

    // Editar
    if (action === 'edit' && targetId) {
      const canUpdate = can(MODULE_KEY, 'u') || can(MODULE_KEY_ALIAS, 'u');
      if (!canUpdate) {
        notify('No tenés permisos para editar categorías.', { type: 'warning', code: 'PERMISSION_DENIED' });
        return;
      }
      const updated = await openEditCategoryModal(targetId);
      if (updated) await refreshAndRender(container);
      return;
    }

    if (action === 'view' && targetId) {
      const shouldRefresh = await openViewCategoryModal(targetId);
      if (shouldRefresh) await refreshAndRender(container);
      return;
    }

    // Eliminar
    if (action === 'delete' && targetId) {
      const canDelete = can(MODULE_KEY, 'd') || can(MODULE_KEY_ALIAS, 'd');
      if (!canDelete) {
        notify('No tenés permisos para eliminar categorías.', { type: 'warning', code: 'PERMISSION_DENIED' });
        return;
      }
      const removed = await openDeleteCategoryModal(targetId);
      if (removed) await refreshAndRender(container);
      return;
    }
  });

  // --- Helper público para que el *entrypoint* pueda refrescar. */
  container.fetchAndRender = async () => {
    await refreshAndRender(container);
  };
}
