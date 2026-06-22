import { useEffect, useRef, useState } from 'react';
import { productsApi } from '@/utils/apis.js';
import { Button } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import styles from './ProductForm.module.css';

export default function ProductDeleteDialog({ onClose, onDeleted, open = false, product = null }) {
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
    initialFocus: '#product-delete-cancel',
    onClose,
    open,
  });

  if (!open || !product) return null;

  async function handleDelete() {
    setPending(true);
    setErrorMessage('');

    try {
      const response = await productsApi.remove(product.id);
      if (!response?.ok) {
        throw new Error('No se pudo eliminar el producto.');
      }
      onDeleted?.(product);
    } catch (error) {
      setErrorMessage(error?.message || 'No se pudo eliminar el producto.');
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
        aria-labelledby="product-delete-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="alertdialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Eliminar</p>
            <h2 className={styles.title} id="product-delete-title">
              Eliminar producto
            </h2>
          </div>
          <button
            aria-label="Cerrar confirmación"
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
            Esta acción elimina <span className={styles.productName}>{product.name}</span> del
            catálogo.
          </p>
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <Button disabled={pending} id="product-delete-cancel" onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button
            id="product-delete-confirm"
            loading={pending}
            onClick={handleDelete}
            variant="danger"
          >
            Eliminar
          </Button>
        </footer>
      </section>
    </div>
  );
}
