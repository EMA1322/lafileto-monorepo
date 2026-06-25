import { useEffect, useRef, useState } from 'react';
import { rolesApi } from '@/utils/apis.js';
import { Button, Input } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import {
  buildRolePayload,
  createRoleFormState,
  hasRoleFormErrors,
  mapRoleApiError,
  validateRoleForm,
} from './roles.helpers.js';
import styles from './UserForm.module.css';

export default function RoleForm({ mode = 'create', onClose, onSaved, open = false, role = null }) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, Input };
  const isEdit = mode === 'edit';
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => createRoleFormState(role));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(createRoleFormState(role));
    setErrors({});
    setGeneralError('');
    setPending(false);
  }, [open, role]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: isEdit ? '#role-form-name' : '#role-form-roleId',
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
    const nextErrors = validateRoleForm(values, { mode });
    setErrors(nextErrors);
    if (hasRoleFormErrors(nextErrors)) {
      setGeneralError('Revisa los campos marcados.');
      window.requestAnimationFrame(() => {
        document
          .querySelector(
            '#role-form-roleId[aria-invalid="true"], #role-form-name[aria-invalid="true"]',
          )
          ?.focus?.({ preventScroll: true });
      });
      return;
    }

    setPending(true);
    setGeneralError('');
    try {
      const payload = buildRolePayload(values, { mode });
      const response =
        isEdit && role?.roleId
          ? await rolesApi.update(role.roleId, payload)
          : await rolesApi.create(payload);
      if (!response?.ok) throw new Error('No se pudo guardar el rol.');
      onSaved?.({ mode, role: response.data ?? null });
    } catch (error) {
      setGeneralError(mapRoleApiError(error));
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) onClose?.();
  }

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <aside
        aria-labelledby="role-form-title"
        aria-modal="true"
        className={styles.drawer}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Roles</p>
            <h2 className={styles.title} id="role-form-title">
              {isEdit ? 'Editar rol' : 'Crear rol'}
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
          <section className={styles.formSection} aria-labelledby="role-details-section">
            <div className={styles.sectionHeader}>
              <h3 id="role-details-section">Datos del rol</h3>
              <p>El nombre ayuda a reconocer el rol; los permisos se editan desde la matriz.</p>
            </div>
            <div className={styles.grid}>
              {!isEdit ? (
                <Input
                  error={errors.roleId}
                  hint="Opcional. Si se omite, se genera role-* desde el nombre."
                  id="role-form-roleId"
                  label="Identificador"
                  maxLength={50}
                  onChange={(event) => updateValue('roleId', event.target.value)}
                  placeholder="role-operador"
                  value={values.roleId}
                />
              ) : (
                <div className={styles.readOnlyBox}>
                  <span className={styles.readOnlyLabel}>Identificador</span>
                  <strong>{values.roleId}</strong>
                  <p>No se edita para mantener las relaciones existentes de usuarios y permisos.</p>
                </div>
              )}
              <Input
                error={errors.name}
                id="role-form-name"
                label="Nombre visible"
                maxLength={80}
                onChange={(event) => updateValue('name', event.target.value)}
                required
                value={values.name}
              />
            </div>
          </section>
          <footer className={styles.footer}>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              Cancelar
            </Button>
            <Button loading={pending} type="submit" variant="primary">
              {isEdit ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
