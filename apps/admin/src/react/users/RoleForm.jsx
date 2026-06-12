import { useEffect, useRef, useState } from 'react';
import { rolesApi } from '@/utils/apis.js';
import { Button, Input } from '../ui/index.js';
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
  const previousFocusRef = useRef(null);
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

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      document.getElementById('role-form-name')?.focus();
    }, 0);
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && !pending) onClose?.();
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
    const nextErrors = validateRoleForm(values, { mode });
    setErrors(nextErrors);
    if (hasRoleFormErrors(nextErrors)) {
      setGeneralError('Revisa los campos marcados.');
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
          {!isEdit ? (
            <Input
              error={errors.roleId}
              hint="Opcional. Si se omite, backend genera role-* desde el nombre."
              id="role-form-roleId"
              label="Identificador"
              maxLength={50}
              onChange={(event) => updateValue('roleId', event.target.value)}
              placeholder="role-operador"
              value={values.roleId}
            />
          ) : null}
          <Input
            error={errors.name}
            id="role-form-name"
            label="Nombre visible"
            maxLength={80}
            onChange={(event) => updateValue('name', event.target.value)}
            required
            value={values.name}
          />
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
