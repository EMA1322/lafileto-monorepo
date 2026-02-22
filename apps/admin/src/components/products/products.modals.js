// ============================================================================
// /admin/src/components/products/products.modals.js
// Modales de creación/edición, cambio de estado y eliminación para Products.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { openModal, closeModal } from '../../utils/modals.js';
import notifyToast from '../../utils/notify.js';

import { productsApi, offersApi } from '../../utils/apis.js';

import {
  STATUS_LABELS,
  validateProductPayload,
  escapeHTML,
  resolveOfferPricing,
  formatMoney,
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

function getTemplateNode(templateId) {
  const template = document.getElementById(templateId);
  if (!(template instanceof HTMLTemplateElement)) return null;
  const node = template.content.firstElementChild;
  return node ? node.cloneNode(true) : null;
}

function buildOfferFormState(formData) {
  return {
    enabled: formData.get('offerEnabled') === 'on',
    discount: formData.get('offerDiscountPercent')?.toString().trim() ?? '',
  };
}

export function validateOfferForm(offerState) {
  const errors = [];
  const normalized = {
    enabled: offerState.enabled === true,
    // Admin no gestiona ventanas temporales de oferta en esta fase.
    discountPercent: null,
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

  return { errors, payload: normalized };
}

function handleOfferError(error, form) {
  if (!error) {
    notifyToast('No se pudo guardar la oferta.', { type: 'error' });
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

  notifyToast(error.message || 'No se pudo guardar la oferta.', { type: 'error' });
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
    notifyToast('Ocurrió un error inesperado. Intentá nuevamente.', { type: 'error' });
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
    notifyToast(error.message || 'Revisá los campos marcados.', { type: 'error' });
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
    notifyToast('Hay campos en conflicto. Revisá la información.', { type: 'error' });
    return;
  }

  notifyToast(error.message || 'Ocurrió un error. Intentá nuevamente.', { type: 'error' });
}

function buildProductPayload(formData) {
  const imageValue = formData.get('imageUrl')?.toString().trim() ?? '';
  return {
    name: formData.get('name')?.toString().trim() ?? '',
    description: formData.get('description')?.toString().trim() ?? '',
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock')),
    categoryId: formData.get('categoryId')?.toString() ?? '',
    imageUrl: imageValue ? imageValue : null,
  };
}

function buildProductFormNode({ mode, product }) {
  const modal = getTemplateNode('tpl-product-form');
  if (!modal) return null;

  const isEdit = mode === 'edit';
  const title = modal.querySelector('#products-form-title');
  const submitButton = modal.querySelector('#products-form-submit');
  const inputName = modal.querySelector('#field-name');
  const inputDescription = modal.querySelector('#field-description');
  const inputImage = modal.querySelector('#field-image-url');
  const inputPrice = modal.querySelector('#field-price');
  const inputStock = modal.querySelector('#field-stock');
  const selectCategory = modal.querySelector('#field-category');
  const offerToggle = modal.querySelector('#field-offer-enabled');
  const offerFields = modal.querySelector('[data-offer-fields]');
  const offerDiscount = modal.querySelector('#field-offer-discount');
  const previewImage = modal.querySelector('[data-image-preview-img]');
  const previewEmpty = modal.querySelector('[data-image-preview-empty]');

  const categoriesOptions = getCategoriesOptions(product.categoryId ?? state.categories[0]?.id ?? '');
  const imageUrl = product.imageUrl ?? '';
  const offer = product.offer || null;
  const offerEnabled = offer?.isActive === true;
  const discountValue =
    offer && offer.discountPercent != null && offer.discountPercent !== ''
      ? String(offer.discountPercent)
      : '';
  const priceValue = Number.isFinite(Number(product.price)) ? Number(product.price) : 0;
  const stockValue = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0;
  const descriptionValue = product.description ?? '';
  if (title) title.textContent = isEdit ? 'Editar producto' : 'Crear producto';
  if (submitButton) submitButton.textContent = isEdit ? 'Guardar' : 'Crear';
  if (inputName) inputName.value = product.name ?? '';
  if (inputDescription) inputDescription.value = descriptionValue;
  if (inputImage) inputImage.value = imageUrl;
  if (inputPrice) inputPrice.value = String(priceValue);
  if (inputStock) inputStock.value = String(stockValue);
  if (selectCategory) selectCategory.innerHTML = categoriesOptions;
  if (offerToggle) offerToggle.checked = offerEnabled;
  if (offerFields) {
    offerFields.hidden = !offerEnabled;
    offerFields.setAttribute('aria-hidden', offerEnabled ? 'false' : 'true');
  }
  if (offerDiscount) {
    offerDiscount.value = discountValue;
    offerDiscount.required = offerEnabled;
  }
  if (previewImage) {
    previewImage.src = imageUrl;
    previewImage.hidden = true;
  }
  if (previewEmpty) previewEmpty.hidden = false;


  return modal;
}

export function openProductModal({ mode = 'create', product = {}, container } = {}) {
  const snapshot = product && Object.keys(product).length ? product : { ...product };
  const originalOffer = snapshot?.offer || null;
  const modalNode = buildProductFormNode({ mode, product: snapshot });
  if (!modalNode) return;
  openModal(modalNode, '#field-name');

  const form = document.getElementById('products-form');
  if (!form) return;

  const offerToggle = form.querySelector('#field-offer-enabled');
  const offerFields = form.querySelector('[data-offer-fields]');
  const discountInput = form.querySelector('#field-offer-discount');
  const imageInput = form.querySelector('#field-image-url');
  const previewImage = form.querySelector('[data-image-preview-img]');
  const previewEmpty = form.querySelector('[data-image-preview-empty]');
  let previewRequestId = 0;

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

  if (previewImage) {
    previewImage.addEventListener('load', () => {
      if (previewImage.dataset.previewRequestId !== String(previewRequestId)) return;
      previewImage.hidden = false;
      if (previewEmpty) {
        previewEmpty.hidden = true;
      }
    });
    previewImage.addEventListener('error', () => {
      if (previewImage.dataset.previewRequestId !== String(previewRequestId)) return;
      previewImage.src = '';
      previewImage.hidden = true;
      if (previewEmpty) {
        previewEmpty.hidden = false;
      }
    });
  }

  if (offerToggle) {
    offerToggle.addEventListener('change', (event) => {
      const checked = Boolean(event?.currentTarget?.checked);
      syncOfferVisibility(checked);
    });
  }

  const updateImagePreview = (rawValue) => {
    if (!previewImage || !previewEmpty) return;

    previewRequestId += 1;
    const currentRequestId = String(previewRequestId);
    const value = (rawValue || '').toString().trim();
    const isHttp = /^https?:\/\//i.test(value);

    previewImage.dataset.previewRequestId = currentRequestId;
    previewImage.hidden = true;
    previewEmpty.hidden = false;
    previewImage.src = '';

    if (!isHttp || !value) {
      return;
    }

    previewImage.src = value;
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
      notifyToast('Revisá los campos marcados.', { type: 'warning' });
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

      notifyToast(successMessage, { type: 'success' });
      closeModal();
    } finally {
      setFormSubmitting(form, false);
    }
  });
}

export function openDeleteModal(product, container) {
  if (!product) return;
  const modalNode = getTemplateNode('tpl-product-delete');
  if (!modalNode) return;
  const deleteMessage = modalNode.querySelector('#product-delete-message');
  if (deleteMessage) {
    deleteMessage.textContent = `Esta acción es definitiva. ¿Querés eliminar “${product.name ?? ''}”?`;
  }

  openModal(modalNode.outerHTML, '#confirm-delete');
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
      notifyToast('Producto eliminado.', { type: 'success' });
      closeModal();
    } catch (error) {
      notifyToast(error.message || 'No se pudo eliminar el producto.', { type: 'error' });
      confirm.disabled = false;
    }
  });
}

function buildProductViewNode(product = {}) {
  const modal = getTemplateNode('tpl-product-view');
  if (!modal) return null;

  const statusLabel = STATUS_LABELS[product?.status] || '—';
  const categoryLabel = formatCategoryName(product);
  const pricing = resolveOfferPricing(product);
  const offer = product?.offer || null;
  const offerActive = offer?.isActive === true;
  const discountNumber = Number(offer?.discountPercent);
  const discountLabel = Number.isFinite(discountNumber)
    ? `${discountNumber % 1 === 0 ? discountNumber : discountNumber.toFixed(2)}%`
    : '—';
  const priceLabel = formatMoney(product?.price ?? pricing.originalPrice ?? 0);
  const finalPriceLabel = formatMoney(pricing.finalPrice ?? pricing.originalPrice ?? 0);
  const stockNumber = Number(product?.stock);
  const stockLabel = Number.isFinite(stockNumber) ? String(stockNumber) : '0';
  const descriptionValue = product?.description || '—';
  const imageUrl = product?.imageUrl ? String(product.imageUrl) : '';
  const offerStatusLabel = offerActive ? 'Activa' : 'Sin oferta activa';

  const title = modal.querySelector('#product-view-title');
  const image = modal.querySelector('[data-view-image]');
  const imageEmpty = modal.querySelector('[data-view-image-empty]');
  const setField = (name, value) => {
    const element = modal.querySelector(`[data-field="${name}"]`);
    if (element) element.textContent = value;
  };

  if (title) title.textContent = product?.name ?? 'Producto';
  setField('price', priceLabel);
  setField('stock', stockLabel);
  setField('status', statusLabel);
  setField('category', categoryLabel);
  setField('description', descriptionValue);
  setField('offer-status', offerStatusLabel);
  setField('final-price', finalPriceLabel);
  setField('discount', discountLabel);

  const offerTag = modal.querySelector('[data-field="offer-status"]');
  if (offerTag) {
    offerTag.classList.toggle('products__view-tag--active', offerActive);
  }

  if (image && imageEmpty) {
    if (imageUrl) {
      image.src = imageUrl;
      image.alt = product?.name ? `Imagen de ${product.name}` : 'Imagen del producto';
      image.hidden = false;
      imageEmpty.hidden = true;
    } else {
      image.hidden = true;
      imageEmpty.hidden = false;
    }
  }

  return modal;
}

export function openProductViewModal(product = {}) {
  const modalNode = buildProductViewNode(product);
  if (!modalNode) return;
  openModal(modalNode.outerHTML, '#product-view-close');
}
