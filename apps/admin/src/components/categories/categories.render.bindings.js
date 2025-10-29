// // Admin / Categorías — event bindings
// // Comentarios en español, código en inglés.

import {
  fetchCategories,
  setFilterActive,
  setOrder,
  setPage,
  setSearch,
  toggleCategoryActive,
  findCategoryById,
} from './categories.state.js';
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

// Shared helper to run the API refresh while reusing state notifications.
async function refreshCategories(options) {
  await fetchCategories(options);
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
      await refreshCategories();
    }, 300);
    $search.addEventListener('input', onSearch);
  }

  // --- Filtros y ordenamiento por select/botones
  container.addEventListener('change', async (ev) => {
    const el = ev.target;
    if (!el) return;

    if (el.matches('[data-filter-control]')) {
      const isSelect = typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement;
      const selected = isSelect ? el.options[el.selectedIndex] : null;
      const value = selected?.dataset.filter || el.value;
      setFilterActive(value);
      await refreshCategories();
      return;
    }

    if (el.matches('[data-order-control]')) {
      const isSelect = typeof HTMLSelectElement !== 'undefined' && el instanceof HTMLSelectElement;
      const selected = isSelect ? el.options[el.selectedIndex] : null;
      const value = selected?.dataset.order || el.value;
      setOrder(value);
      await refreshCategories();
    }
  });

  container.addEventListener('click', async (ev) => {
    const filterBtn = ev.target.closest('[data-filter]');
    if (filterBtn) {
      setFilterActive(filterBtn.dataset.filter);
      await refreshCategories();
      return;
    }

    const orderBtn = ev.target.closest('[data-order]');
    if (orderBtn) {
      setOrder(orderBtn.dataset.order);
      await refreshCategories();
      return;
    }

    const btn = ev.target.closest('[data-page]');
    if (btn) {
      const token = btn.dataset.page;
      setPage(token);
      await refreshCategories();
      return;
    }
  });

  const refreshBtn = container.querySelector('#categories-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await refreshCategories();
    });
  }

  // --- Delegación de eventos por filas de la tabla
  container.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-action]');
    if (!t) return;
    // Accept normalized actions and resolve the row identifier gracefully.
    const action = (t.dataset.action || '').replace(/^category-/, '');
    const targetId = t.dataset.id || t.closest('tr')?.dataset.id || '';

    // Crear nueva categoría
    if (action === 'new') {
      const created = await openCreateCategoryModal();
      if (created) await refreshCategories();
      return;
    }

    // Editar
    if (action === 'edit' && targetId) {
      const updated = await openEditCategoryModal(targetId);
      if (updated) await refreshCategories();
      return;
    }

    // Eliminar
    if (action === 'delete' && targetId) {
      const removed = await openDeleteCategoryModal(targetId);
      if (removed) await refreshCategories();
      return;
    }

    // Toggle activo/inactivo (optimista con fallback)
    if (action === 'toggle' && targetId) {
      try {
        const category = findCategoryById(targetId);
        const next = !category?.active;
        await toggleCategoryActive(targetId, next, { silentToast: true });
      } catch (err) {
        // Re-render fallback + toast
        showToast(mapErrorToMessage(err));
      }
    }
  });

  // --- Helper público para que el *entrypoint* pueda refrescar. */
  container.fetchAndRender = async () => {
    await refreshCategories();
  };
}
