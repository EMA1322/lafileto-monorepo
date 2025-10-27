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
} from './categories.state.js';
import { renderCategoriesTable } from './categories.render.table.js';
import {
  openCreateCategoryModal,
  openEditCategoryModal,
  openDeleteCategoryModal,
} from './categories.modals.js';
import { mapErrorToMessage } from './categories.helpers.js';
import { showToast } from '@/utils/snackbar.js';

function debounce(fn, wait = 300) {
  const timer = typeof window !== 'undefined' ? window : globalThis;
  const schedule = typeof timer.setTimeout === 'function' ? timer.setTimeout.bind(timer) : setTimeout;
  const cancel = typeof timer.clearTimeout === 'function' ? timer.clearTimeout.bind(timer) : clearTimeout;
  let timeoutId;
  return (...args) => {
    cancel(timeoutId);
    timeoutId = schedule(() => {
      fn(...args);
    }, wait);
  };
}

async function refreshAndRender(container) {
  try {
    const snapshot = await fetchCategories();
    renderCategoriesTable(snapshot, container);
  } catch {
    renderCategoriesTable(getSnapshot(), container);
  }
}

export function attachCategoriesBindings(
  root = document.querySelector('#categories-view'),
  options = {},
) {
  const container = root instanceof Element ? root : document.querySelector('#categories-view');
  if (!container) return;

  const handleRefresh = async () => {
    if (typeof options.onRefresh === 'function') {
      await options.onRefresh(container);
      return;
    }
    await refreshAndRender(container);
  };

  const searchInput = container.querySelector('#categories-search');
  if (searchInput) {
    const handleSearch = debounce(async (value) => {
      setSearch(value);
      renderCategoriesTable(getSnapshot(), container);
      await handleRefresh();
    }, 300);
    searchInput.addEventListener('input', (event) => {
      handleSearch(event.target.value || '');
    });
  }

  const filterSelect = container.querySelector('#categories-filter-active');
  if (filterSelect) {
    filterSelect.addEventListener('change', (event) => {
      setFilterActive(event.target.value);
      renderCategoriesTable(getSnapshot(), container);
    });
  }

  const orderSelect = container.querySelector('#categories-order');
  if (orderSelect) {
    orderSelect.addEventListener('change', async (event) => {
      setOrder(event.target.value);
      renderCategoriesTable(getSnapshot(), container);
      await handleRefresh();
    });
  }

  const btnRefresh = container.querySelector('#categories-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await handleRefresh();
    });
  }

  const btnCreate = container.querySelector('#categories-create');
  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      openCreateCategoryModal();
    });
  }

  const btnPrev = container.querySelector('#categories-page-prev');
  if (btnPrev) {
    btnPrev.addEventListener('click', async () => {
      const snapshot = getSnapshot();
      const current = Number(snapshot.filters?.page) || 1;
      if (current <= 1) return;
      setPage(current - 1);
      renderCategoriesTable(getSnapshot(), container);
      await handleRefresh();
    });
  }

  const btnNext = container.querySelector('#categories-page-next');
  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      const snapshot = getSnapshot();
      const current = Number(snapshot.filters?.page) || 1;
      const totalPages = Math.max(1, Number(snapshot.meta?.pageCount) || 1);
      if (current >= totalPages) return;
      setPage(current + 1);
      renderCategoriesTable(getSnapshot(), container);
      await handleRefresh();
    });
  }

  const tbody = container.querySelector('#categories-tbody');
  if (tbody) {
    tbody.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const row = button.closest('tr[data-id]');
      const categoryId = row?.dataset.id;
      if (!categoryId) return;

      if (action === 'category-edit') {
        openEditCategoryModal(categoryId);
        return;
      }

      if (action === 'category-delete') {
        openDeleteCategoryModal(categoryId);
        return;
      }

      if (action === 'category-toggle') {
        const nextAttr = String(button.dataset.nextActive || '').toLowerCase();
        const nextActive = nextAttr === 'true';
        button.disabled = true;
        try {
          await toggleCategoryActive(categoryId, nextActive);
          const updated = findCategoryById(categoryId);
          const suffix = updated?.name ? `: ${updated.name}` : '';
          const successMessage = nextActive
            ? `Categoría activada${suffix}.`
            : `Categoría desactivada${suffix}.`;
          showToast({ message: successMessage, type: 'success', timeout: 2600 });
        } catch (err) {
          const base = mapErrorToMessage(err, 'No se pudo actualizar el estado.');
          const code = err?.code ? ` (${err.code})` : '';
          showToast({ message: `${base}${code}`, type: 'error', timeout: 4000 });
        } finally {
          button.disabled = false;
        }
        return;
      }
    });
  }
}

export const bindCategoriesBindings = attachCategoriesBindings;
