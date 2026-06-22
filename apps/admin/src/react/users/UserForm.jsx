import { useEffect, useRef, useState } from 'react';
import { usersApi } from '@/utils/apis.js';
import { Button, Input, Select } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import {
  buildUserPayload,
  createUserFormState,
  hasUserFormErrors,
  mapUserApiError,
  USER_STATUS_OPTIONS,
  validateUserForm,
} from './userForm.helpers.js';
import styles from './UserForm.module.css';

export default function UserForm({
  mode = 'create',
  onClose,
  onSaved,
  open = false,
  roles = [],
  user = null,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, Input, Select };
  const isEdit = mode === 'edit';
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => createUserFormState(user));
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(createUserFormState(user));
    setErrors({});
    setGeneralError('');
    setPending(false);
  }, [open, user]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: '#user-form-fullName',
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
    const nextErrors = validateUserForm(values, { mode });
    setErrors(nextErrors);
    if (hasUserFormErrors(nextErrors)) {
      setGeneralError('Revisa los campos marcados.');
      window.requestAnimationFrame(() => {
        document
          .querySelector(
            '#user-form-fullName[aria-invalid="true"], #user-form-email[aria-invalid="true"], #user-form-phone[aria-invalid="true"], #user-form-password[aria-invalid="true"], #user-form-roleId[aria-invalid="true"], #user-form-status[aria-invalid="true"]',
          )
          ?.focus?.({ preventScroll: true });
      });
      return;
    }

    setPending(true);
    setGeneralError('');
    try {
      const payload = buildUserPayload(values, { mode });
      const response =
        isEdit && user?.id
          ? await usersApi.update(user.id, payload)
          : await usersApi.create(payload);
      if (!response?.ok) throw new Error('No se pudo guardar el usuario.');
      onSaved?.({ mode, user: response.data ?? null });
    } catch (error) {
      const mapped = mapUserApiError(error);
      setErrors(mapped.fieldErrors);
      setGeneralError(mapped.generalError);
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) onClose?.();
  }

  return (
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <aside
        aria-labelledby="user-form-title"
        aria-modal="true"
        className={styles.drawer}
        ref={dialogRef}
        role="dialog"
      >
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <p className={styles.eyebrow}>Usuarios</p>
            <h2 className={styles.title} id="user-form-title">
              {isEdit ? 'Editar usuario' : 'Crear usuario'}
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

          <div className={styles.grid}>
            <Input
              error={errors.fullName}
              id="user-form-fullName"
              label="Nombre completo"
              maxLength={120}
              onChange={(event) => updateValue('fullName', event.target.value)}
              required
              value={values.fullName}
            />
            {!isEdit ? (
              <Input
                error={errors.email}
                id="user-form-email"
                label="Email"
                onChange={(event) => updateValue('email', event.target.value)}
                required
                type="email"
                value={values.email}
              />
            ) : null}
            <Input
              error={errors.phone}
              hint="Solo numeros, espacios, +, - o ()."
              id="user-form-phone"
              label="Telefono"
              maxLength={20}
              onChange={(event) => updateValue('phone', event.target.value)}
              required
              type="tel"
              value={values.phone}
            />
            {!isEdit ? (
              <Input
                error={errors.password}
                id="user-form-password"
                label="Contrasena"
                minLength={8}
                onChange={(event) => updateValue('password', event.target.value)}
                required
                type="password"
                value={values.password}
              />
            ) : null}
            <Select
              error={errors.roleId}
              id="user-form-roleId"
              label="Rol"
              onChange={(event) => updateValue('roleId', event.target.value)}
              required
              value={values.roleId}
            >
              <option value="">Seleccionar rol</option>
              {roles.map((role) => (
                <option key={role.roleId} value={role.roleId}>
                  {role.name || role.roleId}
                </option>
              ))}
            </Select>
            <Select
              error={errors.status}
              id="user-form-status"
              label="Estado"
              onChange={(event) => updateValue('status', event.target.value)}
              required
              value={values.status}
            >
              {USER_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <footer className={styles.footer}>
            <Button disabled={pending} onClick={onClose} variant="ghost">
              Cancelar
            </Button>
            <Button loading={pending} type="submit" variant="primary">
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
