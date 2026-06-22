import { useEffect, useRef, useState } from 'react';
import { offersApi } from '@/utils/apis.js';
import { Button } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import styles from './ProductOfferForm.module.css';

export default function ProductOfferDeleteDialog({
  onClose,
  onDeleted,
  open = false,
  product = null,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button };
  const dialogRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setPending(false);
    setErrorMessage('');
  }, [open, product]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#product-offer-delete-cancel',
    onClose,
    open,
  });

  if (!open || !product) return null;

  async function handleDelete() {
    if (!product.offer?.id) {
      setErrorMessage('No pudimos identificar la oferta.');
      return;
    }

    setPending(true);
    setErrorMessage('');

    try {
      const response = await offersApi.remove(product.offer.id);
      if (!response?.ok) {
        throw new Error('No se pudo quitar la oferta.');
      }
      onDeleted?.(product);
    } catch (error) {
      setErrorMessage(error?.message || 'No se pudo quitar la oferta.');
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
        aria-labelledby="product-offer-delete-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="alertdialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Quitar oferta</p>
            <h2 className={styles.title} id="product-offer-delete-title">
              Confirmar accion
            </h2>
          </div>
          <button
            aria-label="Cerrar confirmacion de oferta"
            className={styles.closeButton}
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.description}>
            Vas a quitar la oferta de <span className={styles.productName}>{product.name}</span>.
          </p>
          {product.offer?.discountPercent ? (
            <p className={styles.summary}>
              Descuento actual: {Math.round(product.offer.discountPercent)}%.
            </p>
          ) : null}
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <Button
            disabled={pending}
            id="product-offer-delete-cancel"
            onClick={onClose}
            variant="ghost"
          >
            Cancelar
          </Button>
          <Button
            id="product-offer-delete-confirm"
            loading={pending}
            onClick={handleDelete}
            variant="danger"
          >
            Quitar oferta
          </Button>
        </footer>
      </section>
    </div>
  );
}
