import { useEffect, useRef, useState } from 'react';
import { offersApi } from '@/utils/apis.js';
import { Button, Input } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import {
  buildOfferCreatePayload,
  buildOfferUpdatePayload,
  createOfferFormState,
  estimateOfferFinalPrice,
  hasPersistedOffer,
  hasOfferFormErrors,
  mapOfferApiError,
  validateOfferForm,
} from './productOffer.helpers.js';
import styles from './ProductOfferForm.module.css';

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  currency: 'ARS',
  minimumFractionDigits: 2,
  style: 'currency',
});

export default function ProductOfferForm({
  canDeleteOffer = true,
  canSaveOffer = true,
  embedded = false,
  mode = 'create',
  onClose,
  onDeleteRequest,
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
  const [currentOffer, setCurrentOffer] = useState(product?.offer ?? null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(createOfferFormState(product));
    setErrors({});
    setGeneralError('');
    setCurrentOffer(product?.offer ?? null);
    setPending(false);
  }, [open, product]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#product-offer-discount-percent',
    onClose,
    open: open && !embedded,
  });

  if (!open || !product) return null;

  const productWithCurrentOffer = { ...product, offer: currentOffer };
  const offerExists = hasPersistedOffer(productWithCurrentOffer);
  const offerEnabled = Boolean(values.enabled);
  const finalPrice = estimateOfferFinalPrice(product, values);
  const canSubmitOffer = canSaveOffer && offerEnabled && !pending;
  const shouldShowFields = offerEnabled;

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setGeneralError('');
  }

  function handleToggleOffer(event) {
    const checked = event.target.checked;
    setGeneralError('');

    if (!checked && offerExists) {
      setValues((current) => ({ ...current, enabled: true }));
      onDeleteRequest?.(productWithCurrentOffer);
      return;
    }

    setValues((current) => ({ ...current, enabled: checked }));
    if (!checked) {
      setErrors({});
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!offerEnabled) return;

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

    if (isEdit && !currentOffer?.id) {
      setGeneralError('No pudimos identificar la oferta.');
      return;
    }

    setPending(true);
    setGeneralError('');

    try {
      const response =
        isEdit && currentOffer?.id
          ? await offersApi.update(currentOffer.id, buildOfferUpdatePayload(values))
          : await offersApi.create(buildOfferCreatePayload(product, values));

      if (!response?.ok) {
        throw new Error(
          isEdit ? 'No se pudo actualizar la oferta.' : 'No se pudo crear la oferta.',
        );
      }

      const savedOffer = response.data ?? null;
      setCurrentOffer(savedOffer);
      setValues(createOfferFormState({ ...product, offer: savedOffer }));
      onSaved?.({ embedded, mode: currentOffer?.id ? 'edit' : mode, offer: savedOffer, product });
    } catch (error) {
      const mapped = mapOfferApiError(error);
      setErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalError);
    } finally {
      setPending(false);
    }
  }

  function renderContent() {
    const ContentTag = embedded ? 'div' : 'form';

    return (
      <ContentTag
        className={embedded ? styles.inlineBody : styles.body}
        {...(embedded ? {} : { noValidate: true, onSubmit: handleSubmit })}
      >
        <div className={styles.offerSwitchRow}>
          <div className={styles.offerSwitchText}>
            <label className={styles.switchLabel} htmlFor="product-offer-enabled">
              Aplicar oferta
            </label>
            <p className={styles.description} id="product-offer-enabled-description">
              {offerExists
                ? 'La oferta se conserva hasta que confirmes quitarla.'
                : 'Activala para cargar un porcentaje y guardarlo como oferta separada.'}
            </p>
          </div>
          <input
            aria-describedby="product-offer-enabled-description"
            checked={offerEnabled}
            className={styles.switchInput}
            disabled={pending}
            id="product-offer-enabled"
            onChange={handleToggleOffer}
            role="switch"
            type="checkbox"
          />
        </div>

        {generalError ? (
          <p className={styles.error} role="alert">
            {generalError}
          </p>
        ) : null}

        {!shouldShowFields ? (
          <p className={styles.summary} role="status">
            Sin oferta aplicada. No se enviara ninguna mutacion de oferta.
          </p>
        ) : (
          <>
            <p className={styles.summary} role="status">
              {offerExists
                ? `Oferta actual: ${Math.round(currentOffer.discountPercent)}% de descuento.`
                : 'Oferta nueva pendiente de guardar.'}
            </p>
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
            <p className={styles.estimate} role="status">
              Precio final estimado: <strong>{moneyFormatter.format(finalPrice)}</strong>
            </p>
            <p className={styles.description}>
              La oferta se guarda de forma separada del producto.
            </p>
          </>
        )}

        <footer className={embedded ? styles.inlineFooter : styles.footer}>
          {!embedded ? (
            <Button disabled={pending} onClick={onClose} variant="ghost">
              Cancelar
            </Button>
          ) : null}
          {offerExists && embedded && canDeleteOffer ? (
            <Button
              disabled={pending}
              onClick={() => onDeleteRequest?.(productWithCurrentOffer)}
              type="button"
              variant="ghost"
            >
              Quitar oferta
            </Button>
          ) : null}
          <Button
            disabled={!canSubmitOffer}
            loading={pending}
            onClick={embedded ? handleSubmit : undefined}
            type={embedded ? 'button' : 'submit'}
            variant="primary"
          >
            Guardar oferta
          </Button>
        </footer>
      </ContentTag>
    );
  }

  if (embedded) {
    return (
      <section className={styles.inlinePanel} aria-labelledby="product-offer-form-title">
        <div className={styles.inlineHeader}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Oferta</p>
            <h3 className={styles.inlineTitle} id="product-offer-form-title">
              Oferta del producto
            </h3>
          </div>
        </div>
        {renderContent()}
      </section>
    );
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

        {renderContent()}
      </section>
    </div>
  );
}
