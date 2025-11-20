// ============================================================================
// /admin/src/components/products/products.modals.js
// Modales de creación/edición, cambio de estado y eliminación para Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { openModal, closeModal } from '../../utils/modals.js';
import { showSnackbar } from '../../utils/snackbar.js';

import { productsApi, offersApi } from '../../utils/apis.js';

import {
  STATUS_LABELS,
  STATUS_VALUES,
  validateProductPayload,
  escapeHTML,
  resolveOfferPricing,
  formatMoney,
  formatDate,
  formatCategoryName,
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
    const fieldName = field ? String(field) : '';
    if (!fieldName) return;

    if (fieldName.startsWith('offer')) {
      const toggle = form.querySelector('#field-offer-enabled');
      if (toggle && toggle.checked !== true) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const input = form.querySelector(`[name="${fieldName}"]`) || form.querySelector(`#field-${fieldName}`);
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

function mapErrorField(field) {
  if (!field) return '';
  const value = String(field).trim();
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (normalized === 'category_id' || normalized === 'categoryid') return 'categoryId';
  if (normalized === 'image_url' || normalized === 'imageurl' || normalized === 'image') return 'imageUrl';
  if (normalized === 'discountpercent' || normalized === 'discount_percentage' || normalized === 'discount') {
    return 'offerDiscountPercent';
  }
  if (normalized === 'startsat' || normalized === 'start_at' || normalized === 'start') {
    return 'offerStartAt';
  }
  if (normalized === 'endsat' || normalized === 'end_at' || normalized === 'end') {
    return 'offerEndAt';
  }
  return value;
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

function formatDateTimeLocalInput(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (input) => String(input).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

function parseDateTimeLocal(value) {
  if (!value) {
    return { iso: null, isValid: true, date: null };
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return { iso: null, isValid: true, date: null };
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { iso: null, isValid: false, date: null };
  }
  return { iso: date.toISOString(), isValid: true, date };
}

function buildOfferFormState(formData) {
  return {
    enabled: formData.get('offerEnabled') === 'on',
    discount: formData.get('offerDiscountPercent')?.toString().trim() ?? '',
    startAt: formData.get('offerStartAt')?.toString().trim() ?? '',
    endAt: formData.get('offerEndAt')?.toString().trim() ?? '',
  };
}

export function validateOfferForm(offerState) {
  const errors = [];
  const normalized = {
    enabled: offerState.enabled === true,
    discountPercent: null,
    startsAt: null,
    endsAt: null,
  };

  if (!normalized.enabled) {
    return { errors, payload: normalized };
  }

  const discountString = String(offerState.discount ?? '').trim();
  if (discountString === '') {
    errors.push({ field: 'offerDiscountPercent', message: 'Ingresá el porcentaje de descuento.' });
  } else {
    const discountNumber = Number(discountString);
    if (!Number.isFinite(discountNumber)) {
      errors.push({ field: 'offerDiscountPercent', message: 'Ingresá un porcentaje válido (1 a 100).' });
    } else {
      if (discountNumber <= 0) {
        errors.push({ field: 'offerDiscountPercent', message: 'El descuento debe ser al menos 1%.' });
      } else if (discountNumber > 100) {
        errors.push({ field: 'offerDiscountPercent', message: 'El descuento no puede superar el 100%.' });
      } else {
        const clamped = Math.min(100, Math.max(1, discountNumber));
        normalized.discountPercent = Number.isInteger(clamped)
          ? clamped
          : Number(clamped.toFixed(2));
      }
    }
  }

  const startResult = parseDateTimeLocal(offerState.startAt);
  if (offerState.startAt && !startResult.isValid) {
    errors.push({ field: 'offerStartAt', message: 'Ingresá una fecha de inicio válida.' });
  } else {
    normalized.startsAt = startResult.iso;
  }

  const endResult = parseDateTimeLocal(offerState.endAt);
  if (offerState.endAt && !endResult.isValid) {
    errors.push({ field: 'offerEndAt', message: 'Ingresá una fecha de fin válida.' });
  } else {
    normalized.endsAt = endResult.iso;
  }

  if (normalized.startsAt && normalized.endsAt) {
    const startDate = startResult.date ?? new Date(normalized.startsAt);
    const endDate = endResult.date ?? new Date(normalized.endsAt);
    if (startDate.getTime() > endDate.getTime()) {
      errors.push({ field: 'offerEndAt', message: 'La fecha de fin debe ser posterior a la de inicio.' });
    }
  }

  return { errors, payload: normalized };
}

function handleOfferError(error, form) {
  if (!error) {
    showSnackbar('No se pudo guardar la oferta.', { type: 'error' });
    return;
  }

  const details = Array.isArray(error?.details) ? error.details : [];
  const mappedErrors = details
    .map((detail) => ({
      field: mapErrorField(detail?.field || detail?.name || detail?.path),
      message: detail?.message || 'Revisá los datos de la oferta.',
    }))
    .filter((entry) => entry.field);

  if (mappedErrors.length) {
    const focusTarget = renderFieldErrors(form, mappedErrors);
    if (focusTarget) focusTarget.focus();
  }

  showSnackbar(error.message || 'No se pudo guardar la oferta.', { type: 'error' });
}

async function fetchProductById(id) {
  if (!id) return null;
  try {
    const { ok, data } = await productsApi.get(id);
    if (ok && data) {
      return data;
    }
  } catch (error) {
    console.error('[products.modals] fetchProductById failed', error);
  }
  return null;
}

async function syncOfferForProduct(product, offerPayload, originalOffer) {
  if (!product?.id || !offerPayload) return product;

  const previousOffer = product.offer ?? originalOffer ?? null;
  const previousOfferId = previousOffer?.id ?? null;
  const shouldEnable = offerPayload.enabled === true;

  if (!shouldEnable && !previousOfferId) {
    return { ...product, offer: null };
  }

  if (!shouldEnable && previousOfferId) {
    const response = await offersApi.remove(previousOfferId);
    if (!response?.ok) {
      throw new Error('No se pudo deshabilitar la oferta.');
    }
    const refreshed = await fetchProductById(product.id);
    return refreshed ?? { ...product, offer: null };
  }

  const payload = {
    productId: product.id,
    discountPercent: offerPayload.discountPercent,
    startsAt: offerPayload.startsAt || null,
    endsAt: offerPayload.endsAt || null,
  };

  let response;
  if (previousOfferId) {
    response = await offersApi.update(previousOfferId, payload);
  } else {
    response = await offersApi.create(payload);
  }

  if (!response?.ok) {
    throw new Error(previousOfferId ? 'No se pudo actualizar la oferta.' : 'No se pudo crear la oferta.');
  }

  const refreshed = await fetchProductById(product.id);
  if (refreshed) return refreshed;

  const nextOffer = response?.data || response?.offer || {
    ...(previousOffer || {}),
    ...payload,
    isActive: true,
  };

  return { ...product, offer: nextOffer };
}

function handleFormError(error, form) {
  if (!error) {
    showSnackbar('Ocurrió un error inesperado. Intentá nuevamente.', { type: 'error' });
    return;
  }

  const code = String(error?.code || '').toUpperCase();
  const details = Array.isArray(error?.details) ? error.details : [];
  const mappedErrors = details
    .map((detail) => ({
      field: mapErrorField(detail?.field || detail?.name || detail?.path),
      message: detail?.message || 'Revisá este campo.',
    }))
    .filter((entry) => entry.field);

  if (mappedErrors.length) {
    const focusTarget = renderFieldErrors(form, mappedErrors);
    if (focusTarget) focusTarget.focus();
    showSnackbar(error.message || 'Revisá los campos marcados.', { type: 'error' });
    return;
  }

  if (code === 'RESOURCE_CONFLICT') {
    const focusTarget = renderFieldErrors(form, [
      {
        field: 'name',
        message: 'Hay datos en conflicto. Revisá la información.',
      },
    ]);
    if (focusTarget) focusTarget.focus();
    showSnackbar('Hay campos en conflicto. Revisá la información.', { type: 'error' });
    return;
  }

  showSnackbar(error.message || 'Ocurrió un error. Intentá nuevamente.', { type: 'error' });
}

function buildProductPayload(formData) {
  const imageValue = formData.get('imageUrl')?.toString().trim() ?? '';
  return {
    name: formData.get('name')?.toString().trim() ?? '',
    description: formData.get('description')?.toString().trim() ?? '',
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock')),
    status: formData.get('status')?.toString() ?? 'draft',
    categoryId: formData.get('categoryId')?.toString() ?? '',
    imageUrl: imageValue ? imageValue : null,
  };
}

function buildProductFormHTML({ mode, product }) {
  const isEdit = mode === 'edit';
  const categoriesOptions = getCategoriesOptions(product.categoryId ?? state.categories[0]?.id ?? '');
  const imageUrl = product.imageUrl ?? '';
  const offer = product.offer || null;
  const offerEnabled = offer?.isActive === true;
  const discountValue =
    offer && offer.discountPercent != null && offer.discountPercent !== ''
      ? String(offer.discountPercent)
      : '';
  const startValue = formatDateTimeLocalInput(offer?.startsAt);
  const endValue = formatDateTimeLocalInput(offer?.endsAt);
  const priceValue = Number.isFinite(Number(product.price)) ? Number(product.price) : 0;
  const stockValue = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
  const statusValue = STATUS_VALUES.includes(product.status) ? product.status : 'draft';
  const descriptionValue = product.description ?? '';
  const previewPlaceholderHidden = imageUrl ? 'hidden' : '';
  const previewImageHidden = imageUrl ? '' : 'hidden';
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
          <label for="field-description">Descripción</label>
          <textarea id="field-description" name="description" rows="3">${escapeHTML(
            descriptionValue,
          )}</textarea>
        </div>
        <div class="products__field products__field--image">
          <label for="field-image-url">Imagen (URL)</label>
          <input
            id="field-image-url"
            name="imageUrl"
            type="url"
            inputmode="url"
            placeholder="https://…"
            value="${escapeHTML(imageUrl)}"
            autocomplete="off"
          />
          <div class="products__image-preview" data-image-preview>
            <div class="products__image-preview-placeholder" data-image-preview-empty ${previewPlaceholderHidden}>
              Sin vista previa
            </div>
            <img
              data-image-preview-img
              src="${escapeHTML(imageUrl)}"
              alt="Vista previa de la imagen del producto"
              class="products__image-preview-img"
              ${previewImageHidden}
            />
          </div>
          <p class="products__help-text">Ingresá una URL que comience con https://</p>
        </div>
        <div class="products__field">
          <label for="field-price">Precio</label>
          <input id="field-price" name="price" type="number" min="0" step="0.01" value="${priceValue}" />
        </div>
        <div class="products__field">
          <label for="field-stock">Stock</label>
          <input id="field-stock" name="stock" type="number" min="0" step="1" value="${stockValue}" />
        </div>
        <div class="products__field">
          <label for="field-status">Estado</label>
          <select id="field-status" name="status">
            ${STATUS_VALUES.map((status) => {
              const selected = status === statusValue ? 'selected' : '';
              return `<option value="${status}" ${selected}>${escapeHTML(STATUS_LABELS[status])}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="products__field">
          <label for="field-category">Categoría</label>
          <select id="field-category" name="categoryId" required>${categoriesOptions}</select>
        </div>
      </div>
      <section class="products__section" aria-labelledby="products-offer-title">
        <div class="products__section-header">
          <h4 id="products-offer-title" class="products__section-title">Oferta</h4>
          <label class="products__switch">
            <input id="field-offer-enabled" name="offerEnabled" type="checkbox" ${
              offerEnabled ? 'checked' : ''
            } />
            <span>Habilitar oferta</span>
          </label>
        </div>
        <div class="products__section-body" data-offer-fields ${offerEnabled ? '' : 'hidden'} aria-hidden="${
    offerEnabled ? 'false' : 'true'
  }">
          <div class="products__field">
            <label for="field-offer-discount">Descuento (%)</label>
            <input
              id="field-offer-discount"
              name="offerDiscountPercent"
              type="number"
              min="1"
              max="100"
              step="0.01"
              inputmode="decimal"
              value="${discountValue ? escapeHTML(discountValue) : ''}"
            />
          </div>
          <div class="products__field">
            <label for="field-offer-start">Inicio (opcional)</label>
            <input id="field-offer-start" name="offerStartAt" type="datetime-local" value="${escapeHTML(
              startValue,
            )}" />
          </div>
          <div class="products__field">
            <label for="field-offer-end">Fin (opcional)</label>
            <input id="field-offer-end" name="offerEndAt" type="datetime-local" value="${escapeHTML(
              endValue,
            )}" />
          </div>
        </div>
      </section>
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
  const originalOffer = snapshot?.offer || null;
  const html = buildProductFormHTML({ mode, product: snapshot });
  openModal(html, '#field-name');

  const form = document.getElementById('products-form');
  if (!form) return;

  const offerToggle = form.querySelector('#field-offer-enabled');
  const offerFields = form.querySelector('[data-offer-fields]');
  const discountInput = form.querySelector('#field-offer-discount');
  const imageInput = form.querySelector('#field-image-url');
  const previewImage = form.querySelector('[data-image-preview-img]');
  const previewEmpty = form.querySelector('[data-image-preview-empty]');

  const syncOfferVisibility = (checked) => {
    if (offerFields) {
      offerFields.hidden = !checked;
      offerFields.setAttribute('aria-hidden', checked ? 'false' : 'true');
    }
    if (discountInput) {
      discountInput.required = checked;
    }
  };

  syncOfferVisibility(offerToggle?.checked ?? false);

  if (offerToggle) {
    offerToggle.addEventListener('change', (event) => {
      const checked = Boolean(event?.currentTarget?.checked);
      syncOfferVisibility(checked);
    });
  }

  const updateImagePreview = (rawValue) => {
    const value = (rawValue || '').toString().trim();
    const isHttps = /^https:\/\//i.test(value);
    if (previewImage) {
      if (isHttps) {
        previewImage.src = value;
        previewImage.hidden = false;
      } else {
        previewImage.hidden = true;
        previewImage.removeAttribute('src');
      }
    }
    if (previewEmpty) {
      previewEmpty.hidden = isHttps;
    }
  };

  updateImagePreview(imageInput?.value || '');

  if (imageInput) {
    imageInput.addEventListener('input', (event) => {
      updateImagePreview(event.target.value);
    });
    imageInput.addEventListener('blur', (event) => {
      const trimmed = event.target.value.trim();
      event.target.value = trimmed;
      updateImagePreview(trimmed);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = buildProductPayload(formData);
    const offerState = buildOfferFormState(formData);
    const { errors: offerErrors, payload: normalizedOffer } = validateOfferForm(offerState);
    const productErrors = validateProductPayload(payload);
    const allErrors = productErrors.concat(offerErrors);
    const focusTarget = renderFieldErrors(form, allErrors);
    if (allErrors.length) {
      if (focusTarget) focusTarget.focus();
      showSnackbar('Revisá los campos marcados.', { type: 'warning' });
      return;
    }

    setFormSubmitting(form, true);
    let savedProduct = null;

    try {
      if (mode === 'edit' && snapshot?.id) {
        const { ok, data } = await productsApi.update(snapshot.id, payload);
        if (!ok) throw new Error('No se pudo actualizar el producto.');
        savedProduct = data ?? { ...snapshot, ...payload, id: snapshot.id };
      } else {
        const { ok, data } = await productsApi.create(payload);
        if (!ok) throw new Error('No se pudo crear el producto.');
        savedProduct = data ?? null;
        if (!savedProduct || !savedProduct.id) {
          throw new Error('No pudimos obtener el identificador del producto creado.');
        }
      }
    } catch (error) {
      handleFormError(error, form);
      setFormSubmitting(form, false);
      return;
    }

    let finalProduct = savedProduct ?? { ...snapshot, ...payload, id: snapshot?.id };
    const hadOfferBefore = Boolean(originalOffer?.id);
    const needsOfferSync = normalizedOffer.enabled === true || hadOfferBefore;

    if (needsOfferSync && finalProduct?.id) {
      try {
        finalProduct = await syncOfferForProduct(finalProduct, normalizedOffer, originalOffer);
      } catch (error) {
        handleOfferError(error, form);
        setFormSubmitting(form, false);
        return;
      }
    } else if (finalProduct?.id) {
      const refreshed = await fetchProductById(finalProduct.id);
      if (refreshed) {
        finalProduct = refreshed;
      }
    }

    try {
      upsertProduct(finalProduct);
      notify(container);
      try {
        await fetchProducts({ silentToast: true });
      } catch (refreshError) {
        console.error('[products.modals] fetchProducts refresh failed', refreshError);
      }

      const hasOfferAfter = normalizedOffer.enabled === true;
      const successMessage = mode === 'edit'
        ? hasOfferAfter || hadOfferBefore
          ? 'Producto y oferta actualizados correctamente.'
          : 'Producto actualizado correctamente.'
        : hasOfferAfter
          ? 'Producto y oferta creados correctamente.'
          : 'Producto creado correctamente.';

      showSnackbar(successMessage, { type: 'success' });
      closeModal();
    } finally {
      setFormSubmitting(form, false);
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

function buildProductViewHTML(product = {}) {
  const statusLabel = STATUS_LABELS[product?.status] || '—';
  const categoryLabel = formatCategoryName(product);
  const pricing = resolveOfferPricing(product);
  const offer = product?.offer || null;
  const offerActive = offer?.isActive === true;
  const discountNumber = Number(offer?.discountPercent);
  const discountLabel = Number.isFinite(discountNumber)
    ? `${discountNumber % 1 === 0 ? discountNumber : discountNumber.toFixed(2)}%`
    : '—';
  const startLabel = offer?.startsAt ? formatDate(offer.startsAt) : '—';
  const endLabel = offer?.endsAt ? formatDate(offer.endsAt) : '—';
  const priceLabel = formatMoney(product?.price ?? pricing.originalPrice ?? 0);
  const finalPriceLabel = formatMoney(pricing.finalPrice ?? pricing.originalPrice ?? 0);
  const stockNumber = Number(product?.stock);
  const stockLabel = Number.isFinite(stockNumber) ? String(stockNumber) : '0';
  const descriptionValue = product?.description ? escapeHTML(product.description).replace(/\n/g, '<br />') : '—';
  const imageUrl = product?.imageUrl ? String(product.imageUrl) : '';
  const imageMarkup = imageUrl
    ? `<img src="${escapeHTML(imageUrl)}" alt="${escapeHTML(
        product?.name ? `Imagen de ${product.name}` : 'Imagen del producto',
      )}" class="products__image-preview-img" />`
    : '<div class="products__image-preview-placeholder products__image-preview-placeholder--static">Sin imagen</div>';
  const offerStatusLabel = offerActive ? 'Activa' : 'Sin oferta activa';

  return `
    <div class="products__view-modal">
      <h3 class="products__view-title">${escapeHTML(product?.name ?? 'Producto')}</h3>
      <div class="products__view-body">
        <div class="products__view-media">${imageMarkup}</div>
        <dl class="products__view-grid">
          <div class="products__view-row">
            <dt class="products__view-label">Precio base</dt>
            <dd class="products__view-value">${escapeHTML(priceLabel)}</dd>
          </div>
          <div class="products__view-row">
            <dt class="products__view-label">Stock</dt>
            <dd class="products__view-value">${escapeHTML(stockLabel)}</dd>
          </div>
          <div class="products__view-row">
            <dt class="products__view-label">Estado</dt>
            <dd class="products__view-value">${escapeHTML(statusLabel)}</dd>
          </div>
          <div class="products__view-row">
            <dt class="products__view-label">Categoría</dt>
            <dd class="products__view-value">${escapeHTML(categoryLabel)}</dd>
          </div>
        </dl>
      </div>
      <div class="products__view-description">
        <h4>Descripción</h4>
        <p>${descriptionValue || '—'}</p>
      </div>
      <section class="products__view-section" aria-labelledby="product-offer-details-title">
        <div class="products__view-section-header">
          <h4 id="product-offer-details-title" class="products__section-title">Oferta</h4>
          <span class="products__view-tag ${offerActive ? 'products__view-tag--active' : ''}">${escapeHTML(
            offerStatusLabel,
          )}</span>
        </div>
        <dl class="products__view-grid products__view-grid--compact">
          <div class="products__view-row">
            <dt class="products__view-label">Precio final</dt>
            <dd class="products__view-value">${escapeHTML(finalPriceLabel)}</dd>
          </div>
          <div class="products__view-row">
            <dt class="products__view-label">Descuento</dt>
            <dd class="products__view-value">${escapeHTML(discountLabel)}</dd>
          </div>
          <div class="products__view-row">
            <dt class="products__view-label">Inicio</dt>
            <dd class="products__view-value">${escapeHTML(startLabel)}</dd>
          </div>
          <div class="products__view-row">
            <dt class="products__view-label">Fin</dt>
            <dd class="products__view-value">${escapeHTML(endLabel)}</dd>
          </div>
        </dl>
      </section>
      <div class="products__form-actions">
        <button type="button" class="products__button products__button--primary" data-close-modal id="product-view-close">Cerrar</button>
      </div>
    </div>
  `;
}

export function openProductViewModal(product = {}) {
  const html = buildProductViewHTML(product);
  openModal(html, '#product-view-close');
}
