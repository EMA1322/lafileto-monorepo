import { useEffect, useRef, useState } from 'react';
import { usersApi } from '@/utils/apis.js';
import { Button } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import { mapUserApiError } from './userForm.helpers.js';
import styles from './UserForm.module.css';

export default function UserDeleteDialog({
  currentUserId = null,
  onClose,
  onDeleted,
  open = false,
  user = null,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button };
  const dialogRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isSelfDelete = String(currentUserId || '') === String(user?.id || '');

  useEffect(() => {
    if (!open) return;
    setPending(false);
    setErrorMessage(isSelfDelete ? 'No podes eliminar tu propio usuario.' : '');
  }, [isSelfDelete, open, user]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#user-delete-cancel',
    onClose,
    open,
  });

  if (!open || !user) return null;

  async function handleDelete() {
    if (isSelfDelete) return;
    setPending(true);
    setErrorMessage('');
    try {
      const response = await usersApi.remove(user.id);
      if (!response?.ok) throw new Error('No se pudo eliminar el usuario.');
      onDeleted?.(user);
    } catch (error) {
      setErrorMessage(mapUserApiError(error).generalError);
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) onClose?.();
  }

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <section
        aria-labelledby="user-delete-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="alertdialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Accion peligrosa</p>
            <h2 className={styles.title} id="user-delete-title">
              Eliminar usuario
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
          <p className={styles.description}>
            Esta accion elimina a{' '}
            <span className={styles.strong}>{user.fullName || user.email}</span>. No se puede
            deshacer.
          </p>
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <footer className={styles.footer}>
          <Button disabled={pending} id="user-delete-cancel" onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={isSelfDelete}
            id="user-delete-confirm"
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
