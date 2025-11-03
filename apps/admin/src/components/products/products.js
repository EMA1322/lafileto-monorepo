// ============================================================================
// /admin/src/components/products/products.js
// Módulo Products (CRUD completo + filtros, paginación y RBAC UI).
// Comentarios en español; código y nombres en inglés según convención del repositorio.
// ============================================================================

import { productsApi, categoriesApi } from '@/utils/apis.js';
import {
  buildQuery,
  formatMoney,
  debounce,
  slugify,
  isValidSlug,
  getErrorMessage,
} from '@/utils/helpers.js';
import { showSnackbar } from '@/utils/snackbar.js';
import { openModal, closeModal } from '@/utils/modals.js';
import { applyRBAC, can } from '@/utils/rbac.js';

const MODULE_KEY = 'products';
const DEFAULT_FILTERS = {
  q: '',
  category: 'all',
  status: 'all',
  isFeatured: null,
  orderBy: 'updatedAt',
  orderDir: 'desc',
  page: 1,
  pageSize: 10,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activo',
  archived: 'Archivado',
};
const STATUS_MENU = [
  {
    value: 'draft',
    title: 'Pasar a borrador',
    description: 'Deja el producto invisible para clientes mientras se edita.',
  },
  {
    value: 'active',
    title: 'Publicar',
    description: 'Hace visible el producto y permite la venta.',
  },
  {
    value: 'archived',
    title: 'Archivar',
    description: 'Oculta el producto manteniendo su historial.',
  },
];

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

let state = { ...DEFAULT_FILTERS };
let elements = {};
let categories = [];
let currentItems = [];
let currentMeta = { page: 1, pageSize: 10, total: 0, pageCount: 1 };
let searchHandler = null;
let requestToken = 0;

// ============================================================================
// Helpers de DOM y formato
// ============================================================================

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeIsFeatured(value) {
  if (value === true || value === 'true') return true;
  return null;
}

function parsePage(value) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

function parsePageSize(value) {
  const num = Number.parseInt(value, 10);
  return PAGE_SIZE_OPTIONS.includes(num) ? num : DEFAULT_FILTERS.pageSize;
}

function resolveStatusClass(status) {
  if (status === 'active') return 'products__row-status products__row-status--active';
  if (status === 'draft') return 'products__row-status products__row-status--draft';
  if (status === 'archived') return 'products__row-status products__row-status--archived';
  return 'products__row-status';
}

function formatUpdatedAt(value) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return '—';
  }
}

function formatPrice(value) {
  const formatted = formatMoney(value, { minimumFractionDigits: 2 });
  return formatted || formatMoney(0, { minimumFractionDigits: 2 });
}

// ============================================================================
// Inicialización y estado de filtros
// ============================================================================

async function waitForMainContent(retries = 10, delay = 40) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const node = document.getElementById('main-content');
    if (node) return node;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

function readFiltersFromHash() {
  const hash = window.location.hash || '';
  const normalized = hash.replace(/^#/, '');
  const [route, query = ''] = normalized.split('?');
  if (route !== 'products') {
    state = { ...DEFAULT_FILTERS };
    return;
  }

  const params = new URLSearchParams(query);
  state = {
    ...DEFAULT_FILTERS,
    q: params.get('q') ?? DEFAULT_FILTERS.q,
    category: params.get('category') ?? DEFAULT_FILTERS.category,
    status: params.get('status') ?? DEFAULT_FILTERS.status,
    isFeatured: normalizeIsFeatured(params.get('isFeatured')),
    orderBy: params.get('orderBy') ?? DEFAULT_FILTERS.orderBy,
    orderDir: params.get('orderDir') ?? DEFAULT_FILTERS.orderDir,
    page: parsePage(params.get('page')),
    pageSize: parsePageSize(params.get('pageSize')),
  };
}

function writeFiltersToHash() {
  const params = {
    q: state.q || undefined,
    category: state.category && state.category !== 'all' ? state.category : undefined,
    status: state.status && state.status !== 'all' ? state.status : undefined,
    isFeatured: state.isFeatured === true ? 'true' : undefined,
    orderBy: state.orderBy !== DEFAULT_FILTERS.orderBy ? state.orderBy : undefined,
    orderDir: state.orderDir !== DEFAULT_FILTERS.orderDir ? state.orderDir : undefined,
    page: state.page > 1 ? state.page : undefined,
    pageSize: state.pageSize !== DEFAULT_FILTERS.pageSize ? state.pageSize : undefined,
  };

  const query = buildQuery(params);
  const target = query ? `#products?${query}` : '#products';
  if (window.location.hash === target) return;

  if (window.history && typeof window.history.replaceState === 'function') {
    window.history.replaceState(null, '', target);
  } else {
    window.location.hash = target;
  }
}

function syncFiltersToUI() {
  const {
    q,
    category,
    status,
    isFeatured,
    orderBy,
    orderDir,
    pageSize,
  } = state;

  if (elements.searchInput) elements.searchInput.value = q;
  if (elements.categorySelect) elements.categorySelect.value = category;
  if (elements.statusSelect) elements.statusSelect.value = status;
  if (elements.orderBySelect) elements.orderBySelect.value = orderBy;
  if (elements.orderDirSelect) elements.orderDirSelect.value = orderDir;
  if (elements.pageSizeSelect) elements.pageSizeSelect.value = String(pageSize);
  if (elements.featuredToggle) {
    elements.featuredToggle.setAttribute('aria-checked', isFeatured === true ? 'true' : 'false');
    elements.featuredToggle.classList.toggle('is-active', isFeatured === true);
  }
}

// ============================================================================
// Data fetching
// ============================================================================

async function loadCategories() {
  try {
    const { ok, data } = await categoriesApi.listAll({ all: 1, pageSize: 100 });
    if (!ok) throw new Error('No se pudieron cargar las categorías.');
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    categories = items
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
      }));
    renderCategoryOptions();
  } catch (error) {
    categories = [];
    console.error('[products] loadCategories failed', error);
    showSnackbar('No se pudieron cargar las categorías.', { type: 'warning' });
  }
}

async function fetchProducts() {
  const token = ++requestToken;
  setViewState('loading');

  const params = {
    q: state.q || undefined,
    categoryId: state.category && state.category !== 'all' ? state.category : undefined,
    status: state.status && state.status !== 'all' ? state.status : undefined,
    isFeatured: state.isFeatured === true ? true : undefined,
    orderBy: state.orderBy,
    orderDir: state.orderDir,
    page: state.page,
    pageSize: state.pageSize,
  };

  try {
    const { ok, data, meta } = await productsApi.list(params);
    if (token !== requestToken) return; // respuesta obsoleta
    if (!ok) throw new Error('Error al cargar productos.');

    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    currentItems = items;
    currentMeta = {
      page: meta?.page ?? state.page,
      pageSize: meta?.pageSize ?? state.pageSize,
      total: meta?.total ?? items.length,
      pageCount: meta?.pageCount ?? Math.max(1, Math.ceil((meta?.total ?? items.length) / state.pageSize)),
    };
    state.page = currentMeta.page;
    state.pageSize = currentMeta.pageSize;

    if (items.length === 0) {
      setViewState('empty');
      renderMeta();
      renderPagination();
      return;
    }

    renderList();
    renderMeta();
    renderPagination();
    setViewState('ready');
  } catch (error) {
    if (token !== requestToken) return;
    console.error('[products] fetchProducts failed', error);
    setErrorState(error);
  }
}

// ============================================================================
// Renderizado
// ============================================================================

function setViewState(stateName) {
  if (!elements.content) return;
  const { loadingState, errorState, emptyState, tableWrapper, cardsWrapper } = elements;
  const isLoading = stateName === 'loading';
  const isError = stateName === 'error';
  const isEmpty = stateName === 'empty';
  const isReady = stateName === 'ready';

  if (loadingState) loadingState.hidden = !isLoading;
  if (errorState) errorState.hidden = !isError;
  if (emptyState) emptyState.hidden = !isEmpty;
  if (tableWrapper) tableWrapper.hidden = !isReady;
  if (cardsWrapper) cardsWrapper.hidden = !isReady;

  elements.content.setAttribute('aria-busy', isLoading ? 'true' : 'false');
}

function setErrorState(error) {
  if (!elements.errorMessage) return;
  const code = error?.code;
  const message =
    error?.message ||
    (code ? getErrorMessage(code) : 'No se pudieron cargar los productos.');
  elements.errorMessage.textContent = message;
  setViewState('error');
}

function renderCategoryOptions() {
  if (!elements.categorySelect) return;
  const current = state.category;
  const options = [`<option value="all">Todas las categorías</option>`]
    .concat(
      categories.map(
        (category) =>
          `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`,
      ),
    )
    .join('');
  elements.categorySelect.innerHTML = options;
  elements.categorySelect.value = current;
}

function renderList() {
  renderTable();
  renderCards();
}

function renderTable() {
  if (!elements.tableBody) return;
  const rows = currentItems
    .map((item) => {
      const statusClass = resolveStatusClass(item.status);
      const statusLabel = STATUS_LABELS[item.status] || '—';
      return `
        <tr data-id="${escapeHtml(item.id)}">
          <td>${escapeHtml(item.name ?? '—')}</td>
          <td>${escapeHtml(item.sku ?? '—')}</td>
          <td class="products__cell--numeric">${formatPrice(item.price)}</td>
          <td class="products__cell--numeric">${Number(item.stock ?? 0)}</td>
          <td><span class="${statusClass}">${escapeHtml(statusLabel)}</span></td>
          <td>${escapeHtml(resolveCategoryName(item.categoryId))}</td>
          <td>${escapeHtml(formatUpdatedAt(item.updatedAt))}</td>
          <td>
            <div class="products__actions">
              <button
                class="products__action-btn"
                type="button"
                data-action="edit"
                data-id="${escapeHtml(item.id)}"
                data-rbac-action="update"
              >Editar</button>
              <button
                class="products__action-btn"
                type="button"
                data-action="change-status"
                data-id="${escapeHtml(item.id)}"
                data-rbac-action="change-status"
              >Estado</button>
              <button
                class="products__action-btn"
                type="button"
                data-action="delete"
                data-id="${escapeHtml(item.id)}"
                data-rbac-action="delete"
              >Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
  elements.tableBody.innerHTML = rows;
  applyRBAC(elements.root);
}

function renderCards() {
  if (!elements.cardsWrapper) return;
  const cards = currentItems
    .map((item) => {
      const statusClass = resolveStatusClass(item.status);
      const statusLabel = STATUS_LABELS[item.status] || '—';
      return `
        <article class="products__card" data-id="${escapeHtml(item.id)}">
          <header class="products__card-header">
            <h3 class="products__card-title">${escapeHtml(item.name ?? '—')}</h3>
            <span class="${statusClass}">${escapeHtml(statusLabel)}</span>
          </header>
          <dl class="products__card-meta">
            <div class="products__card-row">
              <span class="products__card-label">SKU</span>
              <span>${escapeHtml(item.sku ?? '—')}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Precio</span>
              <span>${formatPrice(item.price)}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Stock</span>
              <span>${Number(item.stock ?? 0)}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Categoría</span>
              <span>${escapeHtml(resolveCategoryName(item.categoryId))}</span>
            </div>
            <div class="products__card-row">
              <span class="products__card-label">Actualizado</span>
              <span>${escapeHtml(formatUpdatedAt(item.updatedAt))}</span>
            </div>
          </dl>
          <div class="products__actions">
            <button
              class="products__action-btn"
              type="button"
              data-action="edit"
              data-id="${escapeHtml(item.id)}"
              data-rbac-action="update"
            >Editar</button>
            <button
              class="products__action-btn"
              type="button"
              data-action="change-status"
              data-id="${escapeHtml(item.id)}"
              data-rbac-action="change-status"
            >Estado</button>
            <button
              class="products__action-btn"
              type="button"
              data-action="delete"
              data-id="${escapeHtml(item.id)}"
              data-rbac-action="delete"
            >Eliminar</button>
          </div>
        </article>
      `;
    })
    .join('');
  elements.cardsWrapper.innerHTML = cards;
  applyRBAC(elements.root);
}

function renderMeta() {
  if (!elements.meta) return;
  const { total, page, pageCount } = currentMeta;
  const from = (page - 1) * state.pageSize + 1;
  const to = Math.min(total, page * state.pageSize);
  elements.meta.textContent = total
    ? `${from}–${to} de ${total} productos`
    : 'Sin resultados';
}

function renderPagination() {
  if (!elements.pageList) return;
  const { page, pageCount } = currentMeta;
  const items = [];
  const maxButtons = 5;
  const start = Math.max(1, page - Math.floor(maxButtons / 2));
  const end = Math.min(pageCount, start + maxButtons - 1);
  for (let current = start; current <= end; current += 1) {
    items.push(
      `<li><button class="products__page-item" type="button" data-page="${current}" ${
        current === page ? "aria-current='page'" : ''
      }>${current}</button></li>`,
    );
  }
  elements.pageList.innerHTML = items.join('');

  if (elements.pageFirst) elements.pageFirst.disabled = page <= 1;
  if (elements.pagePrev) elements.pagePrev.disabled = page <= 1;
  if (elements.pageNext) elements.pageNext.disabled = page >= pageCount;
  if (elements.pageLast) elements.pageLast.disabled = page >= pageCount;
}

function resolveCategoryName(categoryId) {
  if (!categoryId) return '—';
  const found = categories.find((item) => String(item.id) === String(categoryId));
  return found ? found.name : '—';
}

// ============================================================================
// Eventos de UI
// ============================================================================

function attachEvents() {
  if (!elements.root) return;

  elements.retryButton?.addEventListener('click', () => fetchProducts());
  elements.emptyClear?.addEventListener('click', () => {
    state = { ...DEFAULT_FILTERS };
    syncFiltersToUI();
    writeFiltersToHash();
    fetchProducts();
  });

  elements.clearFilters?.addEventListener('click', (event) => {
    event.preventDefault();
    state = { ...DEFAULT_FILTERS };
    syncFiltersToUI();
    writeFiltersToHash();
    fetchProducts();
  });

  if (elements.searchInput) {
    searchHandler = debounce((event) => {
      state.q = event.target.value.trim();
      state.page = 1;
      writeFiltersToHash();
      fetchProducts();
    }, 300);
    elements.searchInput.addEventListener('input', (event) => {
      searchHandler(event);
    });
  }

  elements.categorySelect?.addEventListener('change', (event) => {
    state.category = event.target.value || 'all';
    state.page = 1;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.statusSelect?.addEventListener('change', (event) => {
    state.status = event.target.value || 'all';
    state.page = 1;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.orderBySelect?.addEventListener('change', (event) => {
    state.orderBy = event.target.value || DEFAULT_FILTERS.orderBy;
    state.page = 1;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.orderDirSelect?.addEventListener('change', (event) => {
    state.orderDir = event.target.value || DEFAULT_FILTERS.orderDir;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.pageSizeSelect?.addEventListener('change', (event) => {
    state.pageSize = parsePageSize(event.target.value);
    state.page = 1;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.featuredToggle?.addEventListener('click', (event) => {
    const current = event.currentTarget.getAttribute('aria-checked') === 'true';
    const next = !current;
    state.isFeatured = next ? true : null;
    event.currentTarget.setAttribute('aria-checked', next ? 'true' : 'false');
    event.currentTarget.classList.toggle('is-active', next);
    state.page = 1;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.pageFirst?.addEventListener('click', () => {
    state.page = 1;
    writeFiltersToHash();
    fetchProducts();
  });
  elements.pagePrev?.addEventListener('click', () => {
    state.page = Math.max(1, state.page - 1);
    writeFiltersToHash();
    fetchProducts();
  });
  elements.pageNext?.addEventListener('click', () => {
    state.page = Math.min(currentMeta.pageCount, state.page + 1);
    writeFiltersToHash();
    fetchProducts();
  });
  elements.pageLast?.addEventListener('click', () => {
    state.page = currentMeta.pageCount;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.pageList?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    const page = parsePage(button.dataset.page);
    if (page === state.page) return;
    state.page = page;
    writeFiltersToHash();
    fetchProducts();
  });

  elements.root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');

    if (action === 'create') {
      handleCreate();
      return;
    }

    if (!id) return;

    if (action === 'edit') {
      handleEdit(id);
    } else if (action === 'change-status') {
      handleChangeStatus(id);
    } else if (action === 'delete') {
      handleDelete(id);
    }
  });
}

// ============================================================================
// Acciones CRUD
// ============================================================================

function handleCreate() {
  if (!can(MODULE_KEY, 'w')) {
    showSnackbar('No tenés permisos para crear productos.', { type: 'warning' });
    return;
  }
  openProductForm({ mode: 'create' });
}

function handleEdit(id) {
  if (!can(MODULE_KEY, 'u')) {
    showSnackbar('No tenés permisos para editar productos.', { type: 'warning' });
    return;
  }
  const product = currentItems.find((item) => String(item.id) === String(id));
  if (!product) {
    showSnackbar('No encontramos el producto seleccionado.', { type: 'warning' });
    return;
  }
  openProductForm({ mode: 'edit', product });
}

function handleChangeStatus(id) {
  if (!can(MODULE_KEY, 'changeStatus')) {
    showSnackbar('No tenés permisos para cambiar el estado.', { type: 'warning' });
    return;
  }
  const product = currentItems.find((item) => String(item.id) === String(id));
  if (!product) {
    showSnackbar('No encontramos el producto seleccionado.', { type: 'warning' });
    return;
  }
  openStatusModal(product);
}

function handleDelete(id) {
  if (!can(MODULE_KEY, 'd')) {
    showSnackbar('No tenés permisos para eliminar productos.', { type: 'warning' });
    return;
  }
  const product = currentItems.find((item) => String(item.id) === String(id));
  if (!product) {
    showSnackbar('No encontramos el producto seleccionado.', { type: 'warning' });
    return;
  }
  openDeleteModal(product);
}

function openProductForm({ mode, product = {} }) {
  const isEdit = mode === 'edit';
  const modalTitle = isEdit ? 'Editar producto' : 'Crear producto';
  const formId = 'products-form';
  const initial = {
    name: product.name ?? '',
    slug: product.slug ?? '',
    sku: product.sku ?? '',
    description: product.description ?? '',
    price: product.price ?? 0,
    currency: product.currency ?? 'ARS',
    stock: product.stock ?? 0,
    status: product.status ?? 'draft',
    isFeatured: product.isFeatured ?? false,
    categoryId: product.categoryId ?? (categories[0]?.id ?? ''),
  };

  const categoryOptions = categories
    .map(
      (category) => `
        <option value="${escapeHtml(category.id)}" ${
          String(initial.categoryId) === String(category.id) ? 'selected' : ''
        }>${escapeHtml(category.name)}</option>
      `,
    )
    .join('');

  const html = `
    <form id="${formId}" class="products__form" novalidate>
      <h3>${modalTitle}</h3>
      <div class="products__form-grid">
        <div class="products__field">
          <label for="field-name">Nombre</label>
          <input id="field-name" name="name" type="text" required maxlength="120" value="${escapeHtml(initial.name)}" />
        </div>
        <div class="products__field">
          <label for="field-slug">Slug</label>
          <input id="field-slug" name="slug" type="text" value="${escapeHtml(initial.slug)}" placeholder="ej: combo-veggie" />
        </div>
        <div class="products__field">
          <label for="field-sku">SKU</label>
          <input id="field-sku" name="sku" type="text" value="${escapeHtml(initial.sku)}" placeholder="ej: PRD-001" />
        </div>
        <div class="products__field">
          <label for="field-description">Descripción</label>
          <textarea id="field-description" name="description" rows="3">${escapeHtml(initial.description)}</textarea>
        </div>
        <div class="products__field">
          <label for="field-price">Precio</label>
          <input id="field-price" name="price" type="number" min="0" step="0.01" value="${Number(initial.price)}" />
        </div>
        <div class="products__field">
          <label for="field-currency">Moneda</label>
          <input id="field-currency" name="currency" type="text" readonly value="${escapeHtml(initial.currency)}" />
        </div>
        <div class="products__field">
          <label for="field-stock">Stock</label>
          <input id="field-stock" name="stock" type="number" min="0" step="1" value="${Number(initial.stock)}" />
        </div>
        <div class="products__field">
          <label for="field-status">Estado</label>
          <select id="field-status" name="status">
            <option value="draft" ${initial.status === 'draft' ? 'selected' : ''}>Borrador</option>
            <option value="active" ${initial.status === 'active' ? 'selected' : ''}>Activo</option>
            <option value="archived" ${initial.status === 'archived' ? 'selected' : ''}>Archivado</option>
          </select>
        </div>
        <div class="products__field">
          <label for="field-category">Categoría</label>
          <select id="field-category" name="categoryId" required>${categoryOptions}</select>
        </div>
        <div class="products__field">
          <label for="field-featured">Destacado</label>
          <input id="field-featured" name="isFeatured" type="checkbox" ${
            initial.isFeatured ? 'checked' : ''
          } />
          <span class="products__error-text" hidden id="featured-hint">Mostrará el producto en secciones destacadas.</span>
        </div>
      </div>
      <div class="products__form-actions">
        <button type="button" class="products__button products__button--ghost" data-close-modal>Cancelar</button>
        <button type="submit" class="products__button products__button--primary">${
          isEdit ? 'Guardar' : 'Crear'
        }</button>
      </div>
    </form>
  `;

  openModal(html, `#${formId} [name="name"]`);
  const form = document.getElementById(formId);
  if (!form) return;

  const slugField = form.querySelector('#field-slug');
  const nameField = form.querySelector('#field-name');
  if (slugField && nameField) {
    nameField.addEventListener('blur', () => {
      if (!slugField.value.trim()) {
        slugField.value = slugify(nameField.value);
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name')?.toString().trim() ?? '',
      slug: formData.get('slug')?.toString().trim() ?? '',
      sku: formData.get('sku')?.toString().trim() ?? '',
      description: formData.get('description')?.toString().trim() ?? '',
      price: Number(formData.get('price')),
      currency: 'ARS',
      stock: Number(formData.get('stock')),
      status: formData.get('status')?.toString() ?? 'draft',
      isFeatured: formData.get('isFeatured') === 'on',
      categoryId: formData.get('categoryId')?.toString() ?? '',
    };

    if (!payload.slug && payload.name) {
      payload.slug = slugify(payload.name);
      const slugInput = form.querySelector('#field-slug');
      if (slugInput) slugInput.value = payload.slug;
    }
    if (payload.sku) {
      payload.sku = payload.sku.toUpperCase();
      const skuInput = form.querySelector('#field-sku');
      if (skuInput) skuInput.value = payload.sku;
    }

    const errors = validateProduct(payload);
    const focusTarget = renderFieldErrors(form, errors);
    if (errors.length > 0) {
      if (focusTarget) focusTarget.focus();
      showSnackbar('Revisá los campos resaltados.', { type: 'warning' });
      return;
    }

    setFormSubmitting(form, true, mode);
    try {
      if (isEdit) {
        const { ok, data } = await productsApi.update(product.id, payload);
        if (!ok) throw new Error('No se pudo actualizar el producto.');
        updateItemInMemory(data ?? payload, product.id);
        showSnackbar('Producto actualizado correctamente.', { type: 'success' });
      } else {
        const { ok, data } = await productsApi.create(payload);
        if (!ok) throw new Error('No se pudo crear el producto.');
        showSnackbar('Producto creado correctamente.', { type: 'success' });
        state.page = 1;
      }
      closeModal();
      writeFiltersToHash();
      fetchProducts();
    } catch (error) {
      handleFormError(error, form);
    } finally {
      setFormSubmitting(form, false, mode);
    }
  });
}

function validateProduct(payload) {
  const errors = [];
  if (!payload.name) {
    errors.push({ field: 'field-name', message: 'Ingresá el nombre.' });
  }
  if (payload.slug && !isValidSlug(payload.slug)) {
    errors.push({ field: 'field-slug', message: 'El slug debe ser kebab-case.' });
  }
  if (payload.sku && !/^[A-Z0-9_-]{3,40}$/i.test(payload.sku)) {
    errors.push({ field: 'field-sku', message: 'El SKU sólo admite letras, números, guion y guion bajo.' });
  }
  if (!Number.isFinite(payload.price) || payload.price < 0) {
    errors.push({ field: 'field-price', message: 'El precio debe ser mayor o igual a 0.' });
  }
  if (!Number.isInteger(payload.stock) || payload.stock < 0) {
    errors.push({ field: 'field-stock', message: 'El stock debe ser un entero mayor o igual a 0.' });
  }
  if (!payload.categoryId) {
    errors.push({ field: 'field-category', message: 'Seleccioná una categoría.' });
  }
  if (!['draft', 'active', 'archived'].includes(payload.status)) {
    errors.push({ field: 'field-status', message: 'Seleccioná un estado válido.' });
  }
  return errors;
}

function renderFieldErrors(form, errors) {
  form.querySelectorAll('.products__field').forEach((field) => {
    field.classList.remove('products__field--error');
    const errorText = field.querySelector('.products__error-text');
    if (errorText) {
      errorText.hidden = true;
      errorText.textContent = '';
    }
    const control = field.querySelector('input, select, textarea');
    if (control) {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
  });

  let firstInvalid = null;

  errors.forEach(({ field, message }) => {
    const input = form.querySelector(`#${field}`);
    if (!input) return;
    const wrapper = input.closest('.products__field');
    if (!wrapper) return;
    wrapper.classList.add('products__field--error');
    let errorText = wrapper.querySelector('.products__error-text');
    if (!errorText) {
      errorText = document.createElement('p');
      errorText.className = 'products__error-text';
      wrapper.appendChild(errorText);
    }
    const errorId = `${field}-error`;
    errorText.id = errorId;
    errorText.textContent = message;
    errorText.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
    if (!firstInvalid) firstInvalid = input;
  });

  return firstInvalid;
}

function handleFormError(error, form) {
  const code = error?.code;
  if (code === 'RESOURCE_CONFLICT') {
    const conflictFields = error?.details?.fields ?? error?.payload?.error?.fields ?? [];
    const fieldErrors = conflictFields.map((field) => {
      if (!field?.path) return null;
      const target = Array.isArray(field.path) ? field.path[0] : field.path;
      const fieldId = target === 'slug' ? 'field-slug' : target === 'sku' ? 'field-sku' : null;
      if (!fieldId) return null;
      return {
        field: fieldId,
        message: field.message ||
          (target === 'slug' ? 'El slug ya está en uso.' : 'El SKU ya está en uso.'),
      };
    }).filter(Boolean);
    const focusTarget = renderFieldErrors(form, fieldErrors);
    if (focusTarget) focusTarget.focus();
    showSnackbar('Ya existe un producto con ese slug o SKU.', { type: 'warning' });
    return;
  }

  const message = error?.message || getErrorMessage(code) || 'No se pudo guardar el producto.';
  showSnackbar(message, { type: 'error' });
}

function updateItemInMemory(updated, id) {
  if (!updated) return;
  const index = currentItems.findIndex((item) => String(item.id) === String(id));
  if (index >= 0) {
    currentItems[index] = { ...currentItems[index], ...updated };
    renderList();
  }
}

function setFormSubmitting(form, submitting, mode) {
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;
  if (submitting) {
    submitButton.dataset.originalText = submitButton.textContent || '';
    submitButton.disabled = true;
    submitButton.textContent = mode === 'edit' ? 'Guardando…' : 'Creando…';
    form.setAttribute('aria-busy', 'true');
  } else {
    submitButton.disabled = false;
    const original = submitButton.dataset.originalText;
    if (typeof original === 'string') {
      submitButton.textContent = original;
    }
    delete submitButton.dataset.originalText;
    form.removeAttribute('aria-busy');
  }
}

function openStatusModal(product) {
  const html = `
    <section class="products__status-menu" aria-labelledby="status-menu-title">
      <h3 id="status-menu-title">Cambiar estado</h3>
      ${STATUS_MENU.map(
        (entry) => `
          <button
            type="button"
            class="products__status-option"
            data-status="${entry.value}"
            ${product.status === entry.value ? 'data-current="true"' : ''}
          >
            <span>${entry.title}</span>
            <span class="products__status-description">${entry.description}</span>
          </button>
        `,
      ).join('')}
    </section>
  `;

  openModal(html, '.products__status-option[data-current="true"]');
  const modalBody = document.getElementById('modal-body');
  if (!modalBody) return;

  const buttons = Array.from(modalBody.querySelectorAll('.products__status-option'));
  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const status = button.getAttribute('data-status');
      if (!status || status === product.status) {
        closeModal();
        return;
      }
      try {
        const { ok, data } = await productsApi.changeStatus(product.id, { status });
        if (!ok) throw new Error('No se pudo cambiar el estado.');
        updateItemInMemory(data ?? { status }, product.id);
        showSnackbar('Estado actualizado.', { type: 'success' });
        closeModal();
      } catch (error) {
        console.error('[products] changeStatus failed', error);
        showSnackbar(error?.message || 'No se pudo cambiar el estado.', { type: 'error' });
      }
    });
  });
}

function openDeleteModal(product) {
  const html = `
    <section class="products__confirm">
      <p>¿Querés eliminar el producto <strong>${escapeHtml(product.name)}</strong>?</p>
      <div class="products__confirm-actions">
        <button type="button" class="products__button products__button--ghost" data-close-modal>Cancelar</button>
        <button id="confirm-delete" type="button" class="products__button products__button--primary">Eliminar</button>
      </div>
    </section>
  `;

  openModal(html, '#confirm-delete');
  const confirmBtn = document.getElementById('confirm-delete');
  if (!confirmBtn) return;
  confirmBtn.addEventListener('click', async () => {
    try {
      const { ok } = await productsApi.remove(product.id);
      if (!ok) throw new Error('No se pudo eliminar el producto.');
      showSnackbar('Producto eliminado.', { type: 'success' });
      closeModal();
      fetchProducts();
    } catch (error) {
      console.error('[products] delete failed', error);
      showSnackbar(error?.message || 'No se pudo eliminar el producto.', { type: 'error' });
    }
  });
}

// ============================================================================
// API pública
// ============================================================================

export async function initModule() {
  const mount = await waitForMainContent();
  if (!mount) {
    console.error('[products] main-content no disponible');
    return;
  }

  const root = mount.querySelector('#products-module');
  if (!root) {
    console.error('[products] No se encontró el contenedor del módulo.');
    return;
  }

  elements = {
    root,
    content: root.querySelector('.products__content'),
    loadingState: root.querySelector('#products-loading'),
    errorState: root.querySelector('#products-error'),
    errorMessage: root.querySelector('#products-error-message'),
    retryButton: root.querySelector('#products-retry'),
    emptyState: root.querySelector('#products-empty'),
    emptyClear: root.querySelector('#products-empty-clear'),
    tableWrapper: root.querySelector('#products-table-wrapper'),
    tableBody: root.querySelector('#products-table-body'),
    cardsWrapper: root.querySelector('#products-cards'),
    meta: root.querySelector('#products-meta'),
    pageFirst: root.querySelector('#page-first'),
    pagePrev: root.querySelector('#page-prev'),
    pageNext: root.querySelector('#page-next'),
    pageLast: root.querySelector('#page-last'),
    pageList: root.querySelector('#products-page-list'),
    searchInput: root.querySelector('#filter-q'),
    categorySelect: root.querySelector('#filter-category'),
    statusSelect: root.querySelector('#filter-status'),
    orderBySelect: root.querySelector('#filter-order-by'),
    orderDirSelect: root.querySelector('#filter-order-dir'),
    pageSizeSelect: root.querySelector('#filter-page-size'),
    featuredToggle: root.querySelector('#filter-featured'),
    clearFilters: root.querySelector('#filter-clear'),
  };

  readFiltersFromHash();
  syncFiltersToUI();
  applyRBAC(root);
  attachEvents();
  await loadCategories();
  await fetchProducts();
}

export default {
  initModule,
};
