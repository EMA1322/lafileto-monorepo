// Admin / Categories modals
// Comentarios en español, código en inglés.

import { openModal, closeModal } from '@/utils/modals.js';
import { showToast } from '@/utils/snackbar.js';

import {
  createCategory,
  updateCategoryDetails,
  deleteCategory,
  findCategoryById,
  patchCategoryActive,
} from './categories.state.js';
import { escapeHTML, mapErrorToMessage, renderStatusBadge } from './categories.helpers.js';
function modalResultPromise(setup) {
  return new Promise((resolve) => {
    const modalRoot = document.getElementById('global-modal');
    let resolved = false;
    let observer = null;
    let ignoreMutations = true;

    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      if (observer) observer.disconnect();
      resolve(Boolean(value));
    };

    if (modalRoot instanceof HTMLElement) {
      observer = new MutationObserver(() => {
        if (ignoreMutations) return;
        const hidden =
          modalRoot.classList.contains('hidden') ||
          modalRoot.getAttribute('aria-hidden') === 'true';
        if (hidden) finish(false);
      });
      observer.observe(modalRoot, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
      const schedule =
        typeof queueMicrotask === 'function'
          ? queueMicrotask
          : (cb) => Promise.resolve().then(cb);
      schedule(() => {
        ignoreMutations = false;
      });
    }

    try {
      setup(finish);
    } catch (err) {
      finish(false);
      throw err;
    }
  });
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
  if (!template) return Promise.resolve(false);

  return modalResultPromise((resolveResult) => {
    openModal(template.innerHTML, '#category-name');

    const modal = document.getElementById('modal-body');
    if (!modal) {
      resolveResult(false);
      return;
    }

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
        resolveResult(true);
        closeModal();
      } catch (err) {
        applyServerFieldErrors(form, err);
        toastError(err, 'No se pudo crear la categoría.');
      } finally {
        submit.disabled = false;
      }
    });
  });
}

export function openEditCategoryModal(categoryId) {
  const template = document.getElementById('tpl-category-form');
  if (!template) return Promise.resolve(false);

  const category = findCategoryById(categoryId);
  if (!category) {
    toastError({ code: 'RESOURCE_NOT_FOUND', message: 'Categoría no encontrada.' }, 'No se encontró la categoría.');
    return Promise.resolve(false);
  }

  return modalResultPromise((resolveResult) => {
    openModal(template.innerHTML, '#category-name');

    const modal = document.getElementById('modal-body');
    if (!modal) {
      resolveResult(false);
      return;
    }

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
        await updateCategoryDetails(category.id, { name, imageUrl });
        toastSuccess('Categoría actualizada correctamente.');
        resolveResult(true);
        closeModal();
      } catch (err) {
        applyServerFieldErrors(form, err);
        toastError(err, 'No se pudo actualizar la categoría.');
      } finally {
        submit.disabled = false;
      }
    });
  });
}

export function openDeleteCategoryModal(categoryId) {
  const template = document.getElementById('tpl-category-delete');
  if (!template) return Promise.resolve(false);

  const category = findCategoryById(categoryId);
  if (!category) {
    toastError({ code: 'RESOURCE_NOT_FOUND', message: 'Categoría no encontrada.' }, 'No se encontró la categoría.');
    return Promise.resolve(false);
  }

  return modalResultPromise((resolveResult) => {
    openModal(template.innerHTML, '#category-confirm-delete');

    const modal = document.getElementById('modal-body');
    if (!modal) {
      resolveResult(false);
      return;
    }

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
        resolveResult(true);
        closeModal();
      } catch (err) {
        toastError(err, 'No se pudo eliminar la categoría.');
        confirmBtn.disabled = false;
      }
    }, { once: true });
  });
}

export function openViewCategoryModal(categoryId) {
  const template = document.getElementById('tpl-category-view');
  if (!template) return Promise.resolve(false);

  const category = findCategoryById(categoryId);
  if (!category) {
    toastError({ code: 'RESOURCE_NOT_FOUND', message: 'Categoría no encontrada.' }, 'No se encontró la categoría.');
    return Promise.resolve(false);
  }

  return modalResultPromise((resolveResult) => {
    openModal(template.innerHTML, '#category-view-switch');

    const modal = document.getElementById('modal-body');
    if (!modal) {
      resolveResult(false);
      return;
    }

    const nameField = modal.querySelector('[data-field="category-name"]');
    const statusField = modal.querySelector('[data-field="category-status"]');
    const imageWrapper = modal.querySelector('[data-field="category-image-wrapper"]');
    const imageEl = modal.querySelector('[data-field="category-image"]');
    const imageFallback = modal.querySelector('[data-field="category-image-fallback"]');
    const switchControl = modal.querySelector('[data-role="active-switch"]');
    const switchLabel = modal.querySelector('[data-role="active-switch-label"]');
    const confirmBtn = modal.querySelector('#category-view-confirm');

    if (nameField) nameField.textContent = category.name || '—';
    if (statusField) statusField.innerHTML = renderStatusBadge(category.active);

    if (imageEl && category.imageUrl) {
      imageEl.src = category.imageUrl;
      imageEl.alt = category.name ? `Imagen de ${category.name}` : 'Imagen de categoría';
      imageEl.hidden = false;
      if (imageFallback) imageFallback.hidden = true;
      if (imageWrapper) imageWrapper.removeAttribute('data-empty');
    } else {
      if (imageWrapper) imageWrapper.setAttribute('data-empty', 'true');
      if (imageFallback) imageFallback.hidden = false;
      if (imageEl) imageEl.hidden = true;
    }

    let nextActive = Boolean(category.active);
    let dirty = false;

    const updateSwitchUI = (value) => {
      nextActive = Boolean(value);
      dirty = nextActive !== Boolean(category.active);
      if (switchControl) {
        switchControl.setAttribute('aria-checked', nextActive ? 'true' : 'false');
        switchControl.classList.toggle('is-active', nextActive);
        switchControl.classList.toggle('is-inactive', !nextActive);
      }
      if (switchLabel) switchLabel.textContent = nextActive ? 'Activo' : 'Inactivo';
      if (statusField) statusField.innerHTML = renderStatusBadge(nextActive);
      if (confirmBtn) {
        confirmBtn.disabled = !dirty;
      }
    };

    const toggleSwitch = () => {
      updateSwitchUI(!nextActive);
    };

    if (switchControl) {
      switchControl.addEventListener('click', () => {
        toggleSwitch();
      });
      switchControl.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter' || event.key === 'Spacebar') {
          event.preventDefault();
          toggleSwitch();
        }
      });
    }

    updateSwitchUI(nextActive);

    confirmBtn?.addEventListener('click', async () => {
      if (!confirmBtn) return;
      if (!dirty) {
        closeModal();
        resolveResult(false);
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.setAttribute('aria-busy', 'true');
      try {
        await patchCategoryActive(category.id, nextActive);
        toastSuccess('Estado actualizado correctamente.');
        resolveResult(true);
        closeModal();
      } catch (err) {
        toastError(err, 'No se pudo actualizar el estado.');
        confirmBtn.disabled = false;
        confirmBtn.removeAttribute('aria-busy');
      }
    });
  });
}
