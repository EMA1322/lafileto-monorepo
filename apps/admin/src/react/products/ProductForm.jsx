import { useEffect, useRef, useState } from 'react';
import { productsApi } from '@/utils/apis.js';
import { Button, Input, Select } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import {
  PRODUCT_STATUS_OPTIONS,
  buildProductPayload,
  createProductFormState,
  hasFormErrors,
  mapProductApiError,
  validateProductForm,
} from './productForm.helpers.js';
import styles from './ProductForm.module.css';

export default function ProductForm({
  categories = [],
  mode = 'create',
  onClose,
  onSaved,
  open = false,
  product = null,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, Input, Select };
  const isEdit = mode === 'edit';
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => createProductFormState(product));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(createProductFormState(product));
    setErrors({});
    setGeneralError('');
    setPending(false);
  }, [open, product]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#product-form-name',
    onClose,
    open,
  });

  if (!open) return null;

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setGeneralError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);

    if (hasFormErrors(nextErrors)) {
      setGeneralError('Revisá los campos marcados.');
      window.requestAnimationFrame(() => {
        document
          .querySelector(
            '#product-form-name[aria-invalid="true"], #product-form-price[aria-invalid="true"], #product-form-stock[aria-invalid="true"], #product-form-image-url[aria-invalid="true"], #product-form-category[aria-invalid="true"], #product-form-status[aria-invalid="true"]',
          )
          ?.focus?.({ preventScroll: true });
      });
      return;
    }

    setPending(true);
    setGeneralError('');

    try {
      const payload = buildProductPayload(values);
      const response =
        isEdit && product?.id
          ? await productsApi.update(product.id, payload)
          : await productsApi.create(payload);

      if (!response?.ok) {
        throw new Error(
          isEdit ? 'No se pudo actualizar el producto.' : 'No se pudo crear el producto.',
        );
      }

      onSaved?.({ mode, product: response.data ?? null });
    } catch (error) {
      const mapped = mapProductApiError(error);
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

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <aside
        aria-labelledby="product-form-title"
        aria-modal="true"
        className={styles.drawer}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Producto</p>
            <h2 className={styles.title} id="product-form-title">
              {isEdit ? 'Editar producto' : 'Crear producto'}
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
          <div className={styles.formGrid}>
            {generalError ? (
              <p className={styles.error} role="alert">
                {generalError}
              </p>
            ) : null}

            <Input
              error={errors.name}
              id="product-form-name"
              label="Nombre"
              maxLength={80}
              onChange={(event) => updateValue('name', event.target.value)}
              required
              value={values.name}
            />

            <label className={styles.titleGroup} htmlFor="product-form-description">
              <span>Descripción</span>
              <textarea
                className={styles.textArea}
                id="product-form-description"
                maxLength={1024}
                onChange={(event) => updateValue('description', event.target.value)}
                rows={4}
                value={values.description}
              />
              <span className={styles.hint}>Opcional.</span>
            </label>

            <div className={styles.twoColumns}>
              <Input
                error={errors.price}
                id="product-form-price"
                label="Precio"
                min="0"
                onChange={(event) => updateValue('price', event.target.value)}
                required
                step="0.01"
                type="number"
                value={values.price}
              />
              <Input
                error={errors.stock}
                id="product-form-stock"
                label="Stock"
                min="0"
                onChange={(event) => updateValue('stock', event.target.value)}
                required
                step="1"
                type="number"
                value={values.stock}
              />
            </div>

            <Input
              error={errors.imageUrl}
              hint="Opcional. Si se informa, debe comenzar con http:// o https://."
              id="product-form-image-url"
              label="Imagen (URL)"
              onChange={(event) => updateValue('imageUrl', event.target.value)}
              type="url"
              value={values.imageUrl}
            />

            <div className={styles.twoColumns}>
              <Select
                error={errors.categoryId}
                id="product-form-category"
                label="Categoría"
                onChange={(event) => updateValue('categoryId', event.target.value)}
                required
                value={values.categoryId}
              >
                <option value="">Seleccionar</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>

              <Select
                error={errors.status}
                id="product-form-status"
                label="Estado"
                onChange={(event) => updateValue('status', event.target.value)}
                required
                value={values.status}
              >
                {PRODUCT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <footer className={styles.footer}>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              Cancelar
            </Button>
            <Button loading={pending} type="submit" variant="primary">
              {isEdit ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
