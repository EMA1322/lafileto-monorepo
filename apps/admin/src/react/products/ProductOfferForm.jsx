import { useEffect, useRef, useState } from 'react';
import { offersApi } from '@/utils/apis.js';
import { Button, Input } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import {
  buildOfferCreatePayload,
  buildOfferUpdatePayload,
  createOfferFormState,
  hasOfferFormErrors,
  mapOfferApiError,
  validateOfferForm,
} from './productOffer.helpers.js';
import styles from './ProductOfferForm.module.css';

export default function ProductOfferForm({
  mode = 'create',
  onClose,
  onSaved,
  open = false,
  product = null,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, Input };
  const isEdit = mode === 'edit';
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => createOfferFormState(product));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(createOfferFormState(product));
    setErrors({});
    setGeneralError('');
    setPending(false);
  }, [open, product]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#product-offer-discount-percent',
    onClose,
    open,
  });

  if (!open || !product) return null;

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setGeneralError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateOfferForm(values);
    setErrors(nextErrors);

    if (hasOfferFormErrors(nextErrors)) {
      setGeneralError('Revisa los campos marcados.');
      window.requestAnimationFrame(() => {
        document
          .querySelector('#product-offer-discount-percent[aria-invalid="true"]')
          ?.focus?.({ preventScroll: true });
      });
      return;
    }

    if (isEdit && !product.offer?.id) {
      setGeneralError('No pudimos identificar la oferta.');
      return;
    }

    setPending(true);
    setGeneralError('');

    try {
      const response =
        isEdit && product.offer?.id
          ? await offersApi.update(product.offer.id, buildOfferUpdatePayload(values))
          : await offersApi.create(buildOfferCreatePayload(product, values));

      if (!response?.ok) {
        throw new Error(
          isEdit ? 'No se pudo actualizar la oferta.' : 'No se pudo crear la oferta.',
        );
      }

      onSaved?.({ mode, offer: response.data ?? null, product });
    } catch (error) {
      const mapped = mapOfferApiError(error);
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
      <section
        aria-labelledby="product-offer-form-title"
        aria-modal="true"
        className={styles.drawer}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Oferta</p>
            <h2 className={styles.title} id="product-offer-form-title">
              {isEdit ? 'Editar oferta' : 'Crear oferta'}
            </h2>
          </div>
          <button
            aria-label="Cerrar formulario de oferta"
            className={styles.closeButton}
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit} noValidate>
          <p className={styles.description}>
            Producto: <span className={styles.productName}>{product.name}</span>
          </p>
          {product.offer ? (
            <p className={styles.summary}>
              Oferta actual: {Math.round(product.offer.discountPercent)}% de descuento.
            </p>
          ) : null}
          {generalError ? (
            <p className={styles.error} role="alert">
              {generalError}
            </p>
          ) : null}
          <Input
            error={errors.discountPercent}
            id="product-offer-discount-percent"
            label="Descuento (%)"
            max="100"
            min="1"
            onChange={(event) => updateValue('discountPercent', event.target.value)}
            required
            step="1"
            type="number"
            value={values.discountPercent}
          />
          <footer className={styles.footer}>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              Cancelar
            </Button>
            <Button loading={pending} type="submit" variant="primary">
              {isEdit ? 'Guardar oferta' : 'Crear oferta'}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}
