// Admin / Categories — event bindings
// Comentarios en español, código en inglés.

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
    timeoutId = schedule(() => {
      fn(...args);
    }, wait);
  };
}

/** Refresca desde la API y vuelve a renderizar con fallback a snapshot. */
async function refreshAndRender(container) {
  try {
    const snapshot = await fetchCategories();
    renderCategoriesTable(snapshot, container);
  } catch (err) {
    // Fallback: render último snapshot y notificar el error.
    renderCategoriesTable(getSnapshot(), container);
    showToast(mapErrorToMessage(err));
    // Log útil para depurar sin romper UX.
    console.warn('[categories] refresh failed', err);
  }
}

/** Enlaza todos los eventos de la vista de categorías. */
export function bindCategoriesBindings(container) {
  // --- Búsqueda por nombre ---
  const inputSearch = container.querySelector('[data-search], input[type="search"]');
  if (inputSearch) {
    const onSearch = debounce(async (ev) => {
      setSearch(ev.target.value || '');
      await refreshAndRender(container);
    }, 350);
    inputSearch.addEventListener('input', onSearch);
  }

  // --- Filtro de estado (todas/activas/inactivas) ---
  const selStatus = container.querySelector('[data-filter-status], select[name="status"]');
  if (selStatus) {
    selStatus.addEventListener('change', async (ev) => {
      setFilterActive(ev.target.value || 'all');
      await refreshAndRender(container);
    });
  }

  // --- Orden (asc/desc por nombre) ---
  const selOrder = container.querySelector('[data-order], select[name="order"]');
  if (selOrder) {
    selOrder.addEventListener('change', async (ev) => {
      // Normalizamos a 'asc' | 'desc'
      const next = String(ev.target.value || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
      setOrder(next);
      await refreshAndRender(container);
    });
  }

  // --- Paginación (prev/next) ---
  const btnPrev = container.querySelector('[data-page-prev], [data-action="page-prev"]');
  const btnNext = container.querySelector('[data-page-next], [data-action="page-next"]');
  if (btnPrev) {
    btnPrev.addEventListener('click', async () => {
      setPage(getSnapshot().meta.page - 1);
      await refreshAndRender(container);
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      setPage(getSnapshot().meta.page + 1);
      await refreshAndRender(container);
    });
  }

  // --- Recargar manual ---
  const btnReload = container.querySelector('[data-reload], [data-action="reload"], #btn-reload');
  if (btnReload) {
    btnReload.addEventListener('click', async () => {
      await refreshAndRender(container);
    });
  }

  // --- Nuevo / Editar / Eliminar (modales) ---
  const btnNew = container.querySelector('[data-action="create"], [data-rbac-w]');
  if (btnNew) {
    btnNew.addEventListener('click', async () => {
      const created = await openCreateCategoryModal();
      if (created) await refreshAndRender(container);
    });
  }

  // Delegación de eventos para filas de la tabla
  container.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-action]');
    if (!t) return;

    // Editar
    if (t.dataset.action === 'edit' && t.dataset.id) {
      const category = findCategoryById(t.dataset.id);
      const updated = await openEditCategoryModal(category);
      if (updated) await refreshAndRender(container);
      return;
    }

    // Eliminar
    if (t.dataset.action === 'delete' && t.dataset.id) {
      const category = findCategoryById(t.dataset.id);
      const removed = await openDeleteCategoryModal(category);
      if (removed) await refreshAndRender(container);
      return;
    }

    // Toggle activo/inactivo (optimista)
    if (t.dataset.action === 'toggle' && t.dataset.id) {
      try {
        const category = findCategoryById(t.dataset.id);
        const next = !category?.active;
        await toggleCategoryActive(t.dataset.id, next);
        renderCategoriesTable(getSnapshot(), container);
      } catch (err) {
        renderCategoriesTable(getSnapshot(), container);
        showToast(mapErrorToMessage(err));
      }
    }
  });
}

/** Helper público para que el *entrypoint* pueda refrescar. */
export async function fetchAndRender(container) {
  await refreshAndRender(container);
}
