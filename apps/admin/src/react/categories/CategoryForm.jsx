import { useEffect, useRef, useState } from 'react';
import { categoriesApi } from '@/utils/apis.js';
import { Button, Input } from '../ui/index.js';
import {
  buildCategoryPayload,
  createCategoryFormState,
  hasFormErrors,
  mapCategoryApiError,
  validateCategoryForm,
} from './categoryForm.helpers.js';
import styles from './CategoryForm.module.css';

export default function CategoryForm({
  category = null,
  mode = 'create',
  onClose,
  onSaved,
  open = false,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, Input };
  const isEdit = mode === 'edit';
  const previousFocusRef = useRef(null);
  const [values, setValues] = useState(() => createCategoryFormState(category));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(createCategoryFormState(category));
    setErrors({});
    setGeneralError('');
    setPending(false);
  }, [category, open]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      const firstField = document.getElementById('category-form-name');
      if (firstField instanceof HTMLElement) {
        firstField.focus();
      }
    }, 0);

    const handleKeydown = (event) => {
      if (event.key === 'Escape' && !pending) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeydown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeydown);
      previousFocusRef.current?.focus?.();
    };
  }, [onClose, open, pending]);

  if (!open) return null;

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setGeneralError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateCategoryForm(values);
    setErrors(nextErrors);

    if (hasFormErrors(nextErrors)) {
      setGeneralError('Revisa los campos marcados.');
      return;
    }

    setPending(true);
    setGeneralError('');

    try {
      const payload = buildCategoryPayload(values);
      const response =
        isEdit && category?.id
          ? await categoriesApi.update(category.id, payload)
          : await categoriesApi.create(payload);

      if (!response?.ok) {
        throw new Error(
          isEdit ? 'No se pudo actualizar la categoria.' : 'No se pudo crear la categoria.',
        );
      }

      onSaved?.({ category: response.data ?? null, mode });
    } catch (error) {
      const mapped = mapCategoryApiError(error);
      setErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalError);
    } finally {
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) {
      onClose?.();
    }
  }

  const imageUrl = values.imageUrl.trim();

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <aside
        aria-labelledby="category-form-title"
        aria-modal="true"
        className={styles.drawer}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Categoria</p>
            <h2 className={styles.title} id="category-form-title">
              {isEdit ? 'Editar categoria' : 'Crear categoria'}
            </h2>
          </div>
          <button
            aria-label="Cerrar formulario"
            className={styles.closeButton}
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          {generalError ? (
            <p className={styles.error} role="alert">
              {generalError}
            </p>
          ) : null}

          <Input
            error={errors.name}
            id="category-form-name"
            label="Nombre"
            maxLength={50}
            onChange={(event) => updateValue('name', event.target.value)}
            required
            value={values.name}
          />
          <Input
            error={errors.imageUrl}
            hint="Opcional. Debe ser una URL absoluta http(s)."
            id="category-form-image-url"
            label="Imagen"
            maxLength={2048}
            onChange={(event) => updateValue('imageUrl', event.target.value)}
            placeholder="https://..."
            type="url"
            value={values.imageUrl}
          />

          <section className={styles.preview} aria-label="Vista previa de imagen">
            {imageUrl ? (
              <img
                alt={`Imagen de ${values.name || 'categoria'}`}
                className={styles.previewImage}
                decoding="async"
                loading="lazy"
                src={imageUrl}
              />
            ) : (
              <span className={styles.previewPlaceholder}>Sin imagen</span>
            )}
            <p className={styles.hint}>
              La imagen es opcional. Si falla la carga, el listado mostrara el placeholder.
            </p>
          </section>

          <footer className={styles.footer}>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              Cancelar
            </Button>
            <Button loading={pending} type="submit" variant="primary">
              {isEdit ? 'Guardar cambios' : 'Crear categoria'}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
