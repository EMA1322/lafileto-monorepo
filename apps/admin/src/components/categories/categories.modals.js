// Admin / Categories modals
// Comentarios en español, código en inglés.

import { openModal, closeModal } from '@/utils/modals.js';
import { showToast } from '@/utils/snackbar.js';

import {
  createCategory,
  updateCategory,
  deleteCategory,
  findCategoryById,
  getSnapshot,
} from './categories.state.js';
import { escapeHTML, mapErrorToMessage } from './categories.helpers.js';
import { renderCategoriesTable } from './categories.render.table.js';

function getCategoriesContainer() {
  return document.querySelector('#categories-view');
}

function renderSnapshot() {
  const container = getCategoriesContainer();
  if (!container) return;
  renderCategoriesTable(getSnapshot(), container);
}

function setInputError(form, fieldId, message) {
  const input = form.querySelector(`#${fieldId}`);
  const error = form.querySelector(`#${fieldId}-error`);
  if (input) {
    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }
  }
  if (error) {
    if (message) {
      error.textContent = message;
      error.hidden = false;
    } else {
      error.hidden = true;
    }
  }
}

function resetFormErrors(form) {
  form.querySelectorAll('.is-invalid').forEach((el) => {
    el.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
  });
  form.querySelectorAll('.form-error').forEach((el) => {
    el.hidden = true;
  });
}

function normalizeImageUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL debe ser http(s).');
    }
    return parsed.toString();
  } catch {
    throw Object.assign(new Error('Ingresá una URL válida (https://…)'), { code: 'VALIDATION_ERROR_IMAGE_URL' });
  }
}

function toastError(err, fallback) {
  const message = mapErrorToMessage(err, fallback);
  const code = err?.code ? String(err.code) : '';
  const composed = code ? `${message} (${code})` : message;
  showToast({ message: composed, type: 'error', timeout: 4000 });
}

function toastSuccess(message) {
  showToast({ message, type: 'success', timeout: 2600 });
}

function applyServerFieldErrors(form, error) {
  const fields = error?.details?.fields;
  if (!Array.isArray(fields)) return;
  fields.forEach((entry) => {
    const path = Array.isArray(entry?.path) ? entry.path[0] : entry?.path;
    const key = String(path || '').includes('image') ? 'category-imageUrl' : 'category-name';
    setInputError(form, key, entry?.message || 'Dato inválido.');
  });
}

export function openCreateCategoryModal() {
  const template = document.getElementById('tpl-category-form');
  if (!template) return;

  openModal(template.innerHTML, '#category-name');

  const modal = document.getElementById('modal-body');
  if (!modal) return;

  const form = modal.querySelector('#category-form');
  const title = modal.querySelector('#category-modal-title');
  const submit = modal.querySelector('#category-submit');

  if (title) title.textContent = 'Nueva categoría';
  if (submit) submit.textContent = 'Crear';

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form || !submit) return;

    resetFormErrors(form);

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const imageValue = String(formData.get('imageUrl') || '').trim();

    if (name.length < 2) {
      setInputError(form, 'category-name', 'Ingresá un nombre válido (2-80 caracteres).');
      form.querySelector('#category-name')?.focus();
      return;
    }

    let imageUrl = '';
    if (imageValue) {
      try {
        imageUrl = normalizeImageUrl(imageValue);
      } catch (err) {
        setInputError(form, 'category-imageUrl', err.message);
        form.querySelector('#category-imageUrl')?.focus();
        return;
      }
    }

    submit.disabled = true;
    try {
      await createCategory({ name, imageUrl });
      toastSuccess('Categoría creada correctamente.');
      closeModal();
      renderSnapshot();
    } catch (err) {
      applyServerFieldErrors(form, err);
      toastError(err, 'No se pudo crear la categoría.');
    } finally {
      submit.disabled = false;
    }
  });
}

export function openEditCategoryModal(categoryId) {
  const category = findCategoryById(categoryId);
  if (!category) {
    toastError({ code: 'RESOURCE_NOT_FOUND', message: 'Categoría no encontrada.' }, 'No se encontró la categoría.');
    return;
  }

  const template = document.getElementById('tpl-category-form');
  if (!template) return;

  openModal(template.innerHTML, '#category-name');

  const modal = document.getElementById('modal-body');
  if (!modal) return;

  const form = modal.querySelector('#category-form');
  const title = modal.querySelector('#category-modal-title');
  const submit = modal.querySelector('#category-submit');
  const inputName = modal.querySelector('#category-name');
  const inputImage = modal.querySelector('#category-imageUrl');

  if (title) title.textContent = 'Editar categoría';
  if (submit) submit.textContent = 'Guardar cambios';
  if (inputName) inputName.value = category.name || '';
  if (inputImage) inputImage.value = category.imageUrl || '';

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form || !submit) return;

    resetFormErrors(form);

    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const imageValue = String(formData.get('imageUrl') || '').trim();

    if (name.length < 2) {
      setInputError(form, 'category-name', 'Ingresá un nombre válido (2-80 caracteres).');
      form.querySelector('#category-name')?.focus();
      return;
    }

    let imageUrl = '';
    if (imageValue) {
      try {
        imageUrl = normalizeImageUrl(imageValue);
      } catch (err) {
        setInputError(form, 'category-imageUrl', err.message);
        form.querySelector('#category-imageUrl')?.focus();
        return;
      }
    }

    submit.disabled = true;
    try {
      await updateCategory(category.id, { name, imageUrl });
      toastSuccess('Categoría actualizada correctamente.');
      closeModal();
      renderSnapshot();
    } catch (err) {
      applyServerFieldErrors(form, err);
      toastError(err, 'No se pudo actualizar la categoría.');
    } finally {
      submit.disabled = false;
    }
  });
}

export function openDeleteCategoryModal(categoryId) {
  const category = findCategoryById(categoryId);
  if (!category) {
    toastError({ code: 'RESOURCE_NOT_FOUND', message: 'Categoría no encontrada.' }, 'No se encontró la categoría.');
    return;
  }

  const template = document.getElementById('tpl-category-delete');
  if (!template) return;

  openModal(template.innerHTML, '#category-confirm-delete');

  const modal = document.getElementById('modal-body');
  if (!modal) return;

  const message = modal.querySelector('#category-delete-message');
  const confirmBtn = modal.querySelector('#category-confirm-delete');

  if (message) {
    message.innerHTML = `¿Eliminar la categoría <strong>${escapeHTML(category.name || '')}</strong>?`;
  }

  confirmBtn?.addEventListener('click', async () => {
    if (!confirmBtn) return;
    confirmBtn.disabled = true;
    try {
      await deleteCategory(category.id);
      toastSuccess('Categoría eliminada correctamente.');
      closeModal();
      renderSnapshot();
    } catch (err) {
      toastError(err, 'No se pudo eliminar la categoría.');
      confirmBtn.disabled = false;
    }
  }, { once: true });
}
