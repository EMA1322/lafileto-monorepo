// ============================================================================
// /admin/src/components/products/products.modals.js
// Modales de creación/edición, cambio de estado y eliminación para Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { openModal, closeModal } from '@/utils/modals.js';
import { showSnackbar } from '@/utils/snackbar.js';

import { productsApi } from '@/utils/apis.js';

import {
  STATUS_LABELS,
  STATUS_VALUES,
  kebabifySlug,
  normalizeSku,
  validateProductPayload,
  escapeHTML,
} from './products.helpers.js';
import { state, fetchProducts, upsertProduct, removeProduct, notify } from './products.state.js';

function renderFieldErrors(form, errors) {
  const fields = Array.from(form.querySelectorAll('.products__field'));
  fields.forEach((field) => {
    field.classList.remove('products__field--error');
    const message = field.querySelector('.products__error-text');
    if (message) {
      message.hidden = true;
      message.textContent = '';
    }
    const control = field.querySelector('input, select, textarea');
    if (control) {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
  });

  let firstInvalid = null;
  errors.forEach(({ field, message }) => {
    if (!field) return;
    const input = form.querySelector(`[name="${field}"]`) || form.querySelector(`#field-${field}`);
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
    const errorId = `${input.id || field}-error`;
    errorText.id = errorId;
    errorText.textContent = message;
    errorText.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
    if (!firstInvalid) firstInvalid = input;
  });

  return firstInvalid;
}

function setFormSubmitting(form, submitting) {
  const submit = form.querySelector('button[type="submit"]');
  if (submit) {
    submit.disabled = submitting;
    submit.classList.toggle('is-loading', submitting);
  }
  const cancel = form.querySelector('[data-close-modal]');
  if (cancel) cancel.disabled = submitting;
}

function getCategoriesOptions(selectedId) {
  const list = state.categories || [];
  if (!list.length) return '<option value="">Sin categorías disponibles</option>';
  return list
    .map((category) => {
      const value = category.id ?? '';
      const label = category.name ?? 'Sin nombre';
      const selected = String(selectedId) === String(value) ? 'selected' : '';
      return `<option value="${escapeHTML(value)}" ${selected}>${escapeHTML(label)}</option>`;
    })
    .join('');
}

function handleFormError(error, form, payload) {
  if (!error) {
    showSnackbar('Ocurrió un error inesperado. Intentá nuevamente.', { type: 'error' });
    return;
  }
  const code = String(error?.code || '').toUpperCase();
  if (code === 'RESOURCE_CONFLICT') {
    const details = Array.isArray(error?.details) ? error.details : [];
    const errors = details
      .map((detail) => ({
        field: detail?.field || detail?.name || detail?.path || 'slug',
        message: detail?.message || 'Dato duplicado.',
      }))
      .filter((detail) => detail.field);

    if (!errors.length && payload) {
      if (payload.slug) {
        errors.push({ field: 'slug', message: 'Ya existe un producto con ese slug.' });
      }
      if (payload.sku) {
        errors.push({ field: 'sku', message: 'Ya existe un producto con ese SKU.' });
      }
    }

    const focusTarget = renderFieldErrors(form, errors.length ? errors : [{
      field: 'name',
      message: 'Hay datos en conflicto. Revisá el formulario.',
    }]);
    if (focusTarget) focusTarget.focus();
    showSnackbar('Hay campos en conflicto. Revisá la información.', { type: 'error' });
    return;
  }
  showSnackbar(error.message || 'Ocurrió un error. Intentá nuevamente.', { type: 'error' });
}

function buildProductPayload(formData) {
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
    payload.slug = kebabifySlug(payload.name);
  } else {
    payload.slug = kebabifySlug(payload.slug);
  }

  if (payload.sku) {
    payload.sku = normalizeSku(payload.sku);
  }

  return payload;
}

function buildProductFormHTML({ mode, product }) {
  const isEdit = mode === 'edit';
  const categoriesOptions = getCategoriesOptions(product.categoryId ?? state.categories[0]?.id ?? '');
  const checked = product.isFeatured ? 'checked' : '';
  return `
    <form id="products-form" class="products__form" novalidate>
      <h3>${isEdit ? 'Editar producto' : 'Crear producto'}</h3>
      <div class="products__form-grid">
        <div class="products__field">
          <label for="field-name">Nombre</label>
          <input id="field-name" name="name" type="text" required maxlength="120" value="${escapeHTML(
            product.name ?? '',
          )}" />
        </div>
        <div class="products__field">
          <label for="field-slug">Slug</label>
          <input id="field-slug" name="slug" type="text" value="${escapeHTML(
            product.slug ?? '',
          )}" placeholder="ej: combo-veggie" />
        </div>
        <div class="products__field">
          <label for="field-sku">SKU</label>
          <input id="field-sku" name="sku" type="text" value="${escapeHTML(
            product.sku ?? '',
          )}" placeholder="ej: PRD-001" />
        </div>
        <div class="products__field">
          <label for="field-description">Descripción</label>
          <textarea id="field-description" name="description" rows="3">${escapeHTML(
            product.description ?? '',
          )}</textarea>
        </div>
        <div class="products__field">
          <label for="field-price">Precio</label>
          <input id="field-price" name="price" type="number" min="0" step="0.01" value="${Number(
            product.price ?? 0,
          )}" />
        </div>
        <div class="products__field">
          <label for="field-currency">Moneda</label>
          <input id="field-currency" name="currency" type="text" readonly value="${escapeHTML(
            product.currency ?? 'ARS',
          )}" />
        </div>
        <div class="products__field">
          <label for="field-stock">Stock</label>
          <input id="field-stock" name="stock" type="number" min="0" step="1" value="${Number(
            product.stock ?? 0,
          )}" />
        </div>
        <div class="products__field">
          <label for="field-status">Estado</label>
          <select id="field-status" name="status">
            ${STATUS_VALUES.map((status) => {
              const selected = status === (product.status || 'draft') ? 'selected' : '';
              return `<option value="${status}" ${selected}>${escapeHTML(STATUS_LABELS[status])}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="products__field">
          <label for="field-category">Categoría</label>
          <select id="field-category" name="categoryId" required>${categoriesOptions}</select>
        </div>
        <div class="products__field products__field--checkbox">
          <label class="products__checkbox">
            <input id="field-featured" name="isFeatured" type="checkbox" ${checked} />
            <span>Destacado</span>
          </label>
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
}

export function openProductModal({ mode = 'create', product = {}, container } = {}) {
  const snapshot = product && Object.keys(product).length ? product : { ...product };
  const html = buildProductFormHTML({ mode, product: snapshot });
  openModal(html, '#field-name');

  const form = document.getElementById('products-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = buildProductPayload(formData);
    const errors = validateProductPayload(payload);
    const focusTarget = renderFieldErrors(form, errors);
    if (errors.length) {
      if (focusTarget) focusTarget.focus();
      showSnackbar('Revisá los campos marcados.', { type: 'warning' });
      return;
    }

    setFormSubmitting(form, true);
    try {
      if (mode === 'edit' && product?.id) {
        const { ok, data } = await productsApi.update(product.id, payload);
        if (!ok) throw new Error('No se pudo actualizar el producto.');
        upsertProduct(data ?? { ...payload, id: product.id });
        notify(container);
        showSnackbar('Producto actualizado correctamente.', { type: 'success' });
      } else {
        const { ok, data } = await productsApi.create(payload);
        if (!ok) throw new Error('No se pudo crear el producto.');
        if (data) {
          upsertProduct(data);
        }
        await fetchProducts({ silentToast: true });
        showSnackbar('Producto creado correctamente.', { type: 'success' });
      }
      closeModal();
    } catch (error) {
      handleFormError(error, form, payload);
    } finally {
      setFormSubmitting(form, false);
    }
  });
}

export function openStatusModal(product, container) {
  if (!product) return;
  const options = STATUS_VALUES.map((status) => {
    const current = status === product.status;
    return `
      <button
        type="button"
        class="products__status-option"
        data-status="${status}"
        data-current="${current ? 'true' : 'false'}"
      >
        <span>${STATUS_LABELS[status]}</span>
        ${current ? '<span class="products__status-current">Actual</span>' : ''}
      </button>
    `;
  }).join('');

  const html = `
    <div class="products__status-modal">
      <h3>Cambiar estado</h3>
      <div class="products__status-list">${options}</div>
      <div class="products__form-actions">
        <button type="button" class="products__button products__button--ghost" data-close-modal>Cancelar</button>
      </div>
    </div>
  `;

  openModal(html, '.products__status-option[data-current="true"]');

  const list = document.querySelector('.products__status-list');
  if (!list) return;
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('.products__status-option');
    if (!button) return;
    const nextStatus = button.dataset.status;
    if (!STATUS_VALUES.includes(nextStatus)) return;

    try {
      const { ok, data } = await productsApi.changeStatus(product.id, { status: nextStatus });
      if (!ok) throw new Error('No se pudo cambiar el estado.');
      upsertProduct(data ?? { ...product, status: nextStatus });
      notify(container);
      showSnackbar('Estado actualizado.', { type: 'success' });
      closeModal();
    } catch (error) {
      showSnackbar(error.message || 'No se pudo actualizar el estado.', { type: 'error' });
    }
  });
}

export function openDeleteModal(product, container) {
  if (!product) return;
  const html = `
    <div class="products__delete-modal">
      <h3>Eliminar producto</h3>
      <p>Esta acción es definitiva. ¿Querés eliminar “${escapeHTML(product.name ?? '')}”?</p>
      <div class="products__form-actions">
        <button type="button" class="products__button products__button--ghost" data-close-modal>Cancelar</button>
        <button type="button" id="confirm-delete" class="products__button products__button--danger">Eliminar</button>
      </div>
    </div>
  `;
  openModal(html, '#confirm-delete');
  const confirm = document.getElementById('confirm-delete');
  if (!confirm) return;
  confirm.addEventListener('click', async () => {
    confirm.disabled = true;
    try {
      const { ok } = await productsApi.remove(product.id);
      if (!ok) throw new Error('No se pudo eliminar el producto.');
      removeProduct(product.id);
      notify(container);
      await fetchProducts({ silentToast: true });
      showSnackbar('Producto eliminado.', { type: 'success' });
      closeModal();
    } catch (error) {
      showSnackbar(error.message || 'No se pudo eliminar el producto.', { type: 'error' });
      confirm.disabled = false;
    }
  });
}
