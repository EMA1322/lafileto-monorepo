import { useEffect, useRef, useState } from 'react';
import { categoriesApi } from '@/utils/apis.js';
import { Button } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import { formatProductCount } from './categoriesList.helpers.js';
import styles from './CategoryForm.module.css';

export default function CategoryDeleteDialog({
  category = null,
  onClose,
  onDeleted,
  open = false,
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
  }, [category, open]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#category-delete-cancel',
    onClose,
    open,
  });

  if (!open || !category) return null;

  async function handleDelete() {
    setPending(true);
    setErrorMessage('');

    try {
      const response = await categoriesApi.remove(category.id);
      if (!response?.ok) {
        throw new Error('No se pudo eliminar la categoria.');
      }
      onDeleted?.(category);
    } catch (error) {
      setErrorMessage(error?.message || 'No se pudo eliminar la categoria.');
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) {
      onClose?.();
    }
  }

  const productCountText = formatProductCount(category.productCount);

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <section
        aria-labelledby="category-delete-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="alertdialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Eliminar</p>
            <h2 className={styles.title} id="category-delete-title">
              Eliminar categoria
            </h2>
          </div>
          <button
            aria-label="Cerrar confirmacion"
            className={styles.closeButton}
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className={styles.body}>
          <p className={styles.dangerText}>
            Vas a eliminar <span className={styles.categoryName}>{category.name}</span> de forma
            fisica. Esta accion no es soft delete y no tiene restauracion en el contrato actual.
          </p>
          <p className={styles.dangerText}>
            Productos asociados: <span className={styles.categoryName}>{productCountText}</span>. La
            eliminacion puede afectar productos asociados segun el comportamiento actual del
            backend.
          </p>
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <Button disabled={pending} id="category-delete-cancel" onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button
            id="category-delete-confirm"
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
