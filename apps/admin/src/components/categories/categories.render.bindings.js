// // Admin / Categorías — event bindings
// // Comentarios en español, código en inglés.

import {
  fetchCategories,
  getSnapshot,
  setFilterActive,
  setOrder,
  setPage,
  setSearch,
  toggleCategoryActive,
  findCategoryById,
} from './categories.state.js';
import { renderCategoriesTable } from './categories.render.table.js';
import {
  openCreateCategoryModal,
  openEditCategoryModal,
  openDeleteCategoryModal,
} from './categories.modals.js';
import { mapErrorToMessage } from './categories.helpers.js';
import { showToast } from '@/utils/snackbar.js';

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

/** Normalizes legacy data-action aliases. */
function normalizeAction(action) {
  const map = {
    'category-create': 'new',
    'category-edit': 'edit',
    'category-delete': 'delete',
    'category-toggle': 'toggle',
  };
  return map[action] || action;
}

/** Refresca desde la API y vuelve a renderizar con fallback a snapshot */
async function refreshAndRender(container) {
  try {
    await fetchCategories();
  } catch {
    renderCategoriesTable(getSnapshot(), container);
    return;
  }
  renderCategoriesTable(getSnapshot(), container);
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
      await refreshAndRender(container);
    }, 300);
    $search.addEventListener('input', onSearch);
  }

  // --- Filtros
  container.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (!el || !el.dataset) return;

    // filtro activo
    if (el.matches('[data-filter="active"]')) {
      setFilterActive(el.value);
      await refreshAndRender(container);
      return;
    }

    // orden
    if (el.matches('[data-order]')) {
      setOrder(el.value);
      await refreshAndRender(container);
      return;
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
    const action = normalizeAction(t.dataset.action);

    // Crear nueva categor��a
    if (action === 'new') {
      const created = await openCreateCategoryModal();
      if (created) {
        await refreshAndRender(container);
      }
      return;
    }

    // Editar
    if (action === 'edit' && t.dataset.id) {
      const category = findCategoryById(t.dataset.id);
      const updated = await openEditCategoryModal(category);
      if (updated) await refreshAndRender(container);
      return;
    }

    // Eliminar
    if (action === 'delete' && t.dataset.id) {
      const category = findCategoryById(t.dataset.id);
      const removed = await openDeleteCategoryModal(category);
      if (removed) await refreshAndRender(container);
      return;
    }

    // Toggle activo/inactivo (optimista con fallback)
    if (action === 'toggle' && t.dataset.id) {
      try {
        const snapshotBefore = getSnapshot();
        const category = findCategoryById(t.dataset.id);
        const next = !category?.active;
        await toggleCategoryActive(t.dataset.id, next, { silentToast: true });
        renderCategoriesTable(getSnapshot(), container);
      } catch (err) {
        // Re-render fallback + toast
        renderCategoriesTable(getSnapshot(), container);
        showToast(mapErrorToMessage(err));
      }
    }
  });

  // --- Helper público para que el *entrypoint* pueda refrescar. */
  container.fetchAndRender = async () => {
    await refreshAndRender(container);
  };
}
