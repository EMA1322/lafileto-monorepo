// Admin / Categories event bindings
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
  subscribe,
} from './categories.state.js';
import { renderCategoriesTable } from './categories.render.table.js';
import {
  openCreateCategoryModal,
  openEditCategoryModal,
  openDeleteCategoryModal,
} from './categories.modals.js';
import { mapErrorToMessage } from './categories.helpers.js';
import { showToast } from '@/utils/snackbar.js';

/** Debounce util sin dependencias */
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
    const snapshot = await fetchCategories();
    renderCategoriesTable(snapshot, container);
  } catch (err) {
    renderCategoriesTable(getSnapshot(), container);
  }
}

/** Enlaza eventos de la vista de categorías */
export function bindCategoriesBindings(container) {
  if (!container) return;

  // Búsqueda
  const $search =
    container.querySelector('[data-role="search"]') ||
    container.querySelector('input[type="search"]');
  if ($search) {
    $search.addEventListener(
      'input',
      debounce(async (ev) => {
        setSearch(ev.target.value || '');
        setPage(1);
        await refreshAndRender(container);
      }, 300),
    );
  }

  // Filtro de estado
  const $status = container.querySelector('[data-role="status"]');
  if ($status) {
    $status.addEventListener('change', async (ev) => {
      setFilterActive(ev.target.value);
      setPage(1);
      await refreshAndRender(container);
    });
  }

  // Orden
  const $order = container.querySelector('[data-role="order"]');
  if ($order) {
    $order.addEventListener('change', async (ev) => {
      setOrder(ev.target.value);
      setPage(1);
      await refreshAndRender(container);
    });
  }

  // Botón Recargar
  const $reload = container.querySelector('[data-role="reload"]');
  if ($reload) $reload.addEventListener('click', () => refreshAndRender(container));

  // Delegación de acciones en la tabla
  container.addEventListener('click', async (ev) => {
    const $btn = ev.target.closest('[data-action]');
    if (!$btn) return;

    const action = $btn.dataset.action;
    const id = $btn.dataset.id;

    try {
      if (action === 'edit') {
        const cat = findCategoryById(id);
        const updated = await openEditCategoryModal(cat);
        if (updated) await refreshAndRender(container);
      } else if (action === 'delete') {
        const cat = findCategoryById(id);
        const removed = await openDeleteCategoryModal(cat);
        if (removed) await refreshAndRender(container);
      } else if (action === 'toggle') {
        const cat = findCategoryById(id);
        const next = !cat?.active;
        await toggleCategoryActive(id, next); // optimista
        renderCategoriesTable(getSnapshot(), container);
      }
    } catch (err) {
      showToast({ message: mapErrorToMessage(err) });
    }
  });

  // Paginación (si existiera paginador con data-page)
  container.addEventListener('click', async (ev) => {
    const $p = ev.target.closest('[data-page]');
    if (!$p) return;
    const n = Number($p.dataset.page);
    if (Number.isFinite(n)) {
      setPage(n);
      await refreshAndRender(container);
    }
  });

  // Suscripción para renders reactivos
  subscribe((snapshot, el = container) => renderCategoriesTable(snapshot, el));

  // Carga inicial
  refreshAndRender(container);
}
