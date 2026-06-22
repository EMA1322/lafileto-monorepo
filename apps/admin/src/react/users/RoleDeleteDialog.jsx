import { useEffect, useRef, useState } from 'react';
import { rolesApi } from '@/utils/apis.js';
import { Button } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import { isProtectedRole, mapRoleApiError } from './roles.helpers.js';
import styles from './UserForm.module.css';

export default function RoleDeleteDialog({ onClose, onDeleted, open = false, role = null }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button };
  const dialogRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const protectedRole = isProtectedRole(role?.roleId);

  useEffect(() => {
    if (!open) return;
    setPending(false);
    setErrorMessage(protectedRole ? 'El rol administrador no se puede eliminar.' : '');
  }, [open, protectedRole, role]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#role-delete-cancel',
    onClose,
    open,
  });

  if (!open || !role) return null;

  async function handleDelete() {
    if (protectedRole) return;
    setPending(true);
    setErrorMessage('');
    try {
      const response = await rolesApi.remove(role.roleId);
      if (!response?.ok) throw new Error('No se pudo eliminar el rol.');
      onDeleted?.(role);
    } catch (error) {
      setErrorMessage(mapRoleApiError(error));
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) onClose?.();
  }

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <section
        aria-labelledby="role-delete-title"
        aria-modal="true"
        className={styles.dialog}
        ref={dialogRef}
        role="alertdialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Accion peligrosa</p>
            <h2 className={styles.title} id="role-delete-title">
              Eliminar rol
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
            Esta accion elimina el rol <span className={styles.strong}>{role.name}</span>. No se
            puede deshacer.
          </p>
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
        <footer className={styles.footer}>
          <Button disabled={pending} id="role-delete-cancel" onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={protectedRole}
            id="role-delete-confirm"
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
