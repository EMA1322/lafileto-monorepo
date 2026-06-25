import { useEffect, useRef, useState } from 'react';
import { modulesApi, rolesApi } from '@/utils/apis.js';
import { Button, StateBlock } from '../ui/index.js';
import useDialogFocusTrap from '../hooks/useDialogFocusTrap.js';
import {
  buildPermissionsMatrix,
  buildPermissionsPayload,
  normalizeModulesResponse,
  normalizePermissionsResponse,
} from './permissions.helpers.js';
import { ADMIN_ROLE_ID } from './roles.helpers.js';
import styles from '../pages/UsersPage.module.css';
import formStyles from './UserForm.module.css';

const PERMISSION_LABELS = {
  r: 'Leer',
  w: 'Crear',
  u: 'Editar',
  d: 'Eliminar',
};

function SensitivePermissionState({ enabled }) {
  return (
    <span className={enabled ? styles.sensitiveEnabled : styles.sensitiveMuted}>
      {enabled ? 'Cambio de estado habilitado' : 'Sin cambio de estado'}
    </span>
  );
}

export default function PermissionsMatrix({
  currentRoleId = '',
  onClose,
  onSaved,
  open = false,
  role = null,
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, StateBlock };
  const dialogRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [confirmedSensitiveChange, setConfirmedSensitiveChange] = useState(false);
  const roleId = role?.roleId || '';
  const isCurrentRole = roleId && String(roleId) === String(currentRoleId);
  const isAdminRole = roleId === ADMIN_ROLE_ID;
  const requiresStrongConfirmation = isCurrentRole || isAdminRole;

  useEffect(() => {
    if (!open || !roleId) return undefined;
    const controller = new AbortController();
    setStatus('loading');
    setErrorMessage('');
    setRows([]);
    setPending(false);
    setConfirmedSensitiveChange(false);

    Promise.all([modulesApi.list({ signal: controller.signal }), rolesApi.getPermissions(roleId)])
      .then(([modulesResponse, permissionsResponse]) => {
        const modules = normalizeModulesResponse(modulesResponse);
        const permissions = normalizePermissionsResponse(permissionsResponse);
        setRows(buildPermissionsMatrix({ modules, permissions }));
        setStatus(modules.length ? 'success' : 'empty');
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error?.message || 'No se pudieron cargar los permisos.');
        setStatus('error');
      });

    return () => controller.abort();
  }, [open, roleId]);

  useDialogFocusTrap({
    closeOnEscape: !pending,
    containerRef: dialogRef,
    initialFocus: requiresStrongConfirmation
      ? '#permissions-sensitive-confirm'
      : '#permissions-save',
    onClose,
    open,
  });

  if (!open || !role) return null;

  function updatePermission(moduleKey, permission, checked) {
    setRows((current) =>
      current.map((row) =>
        row.moduleKey === moduleKey ? { ...row, [permission]: Boolean(checked) } : row,
      ),
    );
    setErrorMessage('');
  }

  async function handleSave() {
    if (requiresStrongConfirmation && !confirmedSensitiveChange) {
      setErrorMessage('Confirma que entendes el impacto antes de guardar permisos sensibles.');
      return;
    }

    setPending(true);
    setErrorMessage('');
    try {
      const payload = buildPermissionsPayload(rows);
      const response = await rolesApi.updatePermissions(roleId, payload);
      if (!response?.ok) throw new Error('No se pudieron guardar los permisos.');
      await onSaved?.({ role, permissions: response.data?.permissions || rows });
      onClose?.();
    } catch (error) {
      setErrorMessage(error?.message || 'No se pudieron guardar los permisos.');
      setPending(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !pending) onClose?.();
  }

  const content = (() => {
    if (status === 'loading') return <StateBlock status="loading" title="Cargando permisos" />;
    if (status === 'error') {
      return (
        <StateBlock
          action={
            <Button onClick={() => setStatus('loading')} variant="secondary">
              Reintentar
            </Button>
          }
          description={errorMessage}
          status="error"
          title="No pudimos cargar permisos"
        />
      );
    }
    if (status === 'empty') {
      return <StateBlock status="empty" title="No hay modulos disponibles" />;
    }

    return (
      <>
        <div className={styles.matrixTableWrap}>
          <table className={styles.matrixTable}>
            <caption>Matriz de permisos por modulo</caption>
            <thead>
              <tr>
                <th scope="col">Modulo</th>
                <th scope="col">Leer</th>
                <th scope="col">Crear</th>
                <th scope="col">Editar</th>
                <th scope="col">Eliminar</th>
                <th scope="col">Accion sensible</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.moduleKey}>
                  <th scope="row">{row.name}</th>
                  {Object.keys(PERMISSION_LABELS).map((permission) => (
                    <td key={permission}>
                      <input
                        aria-label={`${PERMISSION_LABELS[permission]} en ${row.name}`}
                        checked={Boolean(row[permission])}
                        onChange={(event) =>
                          updatePermission(row.moduleKey, permission, event.target.checked)
                        }
                        type="checkbox"
                      />
                    </td>
                  ))}
                  <td>
                    <SensitivePermissionState enabled={row.changeStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.matrixCards}>
          {rows.map((row) => (
            <article className={styles.matrixCard} key={row.moduleKey}>
              <h3>{row.name}</h3>
              <div className={styles.permissionSwitches}>
                {Object.keys(PERMISSION_LABELS).map((permission) => (
                  <label className={styles.permissionToggle} key={permission}>
                    <span>{PERMISSION_LABELS[permission]}</span>
                    <input
                      checked={Boolean(row[permission])}
                      onChange={(event) =>
                        updatePermission(row.moduleKey, permission, event.target.checked)
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
              <SensitivePermissionState enabled={row.changeStatus} />
            </article>
          ))}
        </div>
      </>
    );
  })();

  return (
    <div className={formStyles.overlay} onMouseDown={handleOverlayMouseDown}>
      <aside
        aria-labelledby="permissions-title"
        aria-modal="true"
        className={formStyles.drawer}
        ref={dialogRef}
        role="dialog"
      >
        <header className={formStyles.header}>
          <div className={formStyles.titleGroup}>
            <p className={formStyles.eyebrow}>Permisos</p>
            <h2 className={formStyles.title} id="permissions-title">
              {role.name || roleId}
            </h2>
          </div>
          <button
            aria-label="Cerrar matriz"
            className={formStyles.closeButton}
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </header>

        <div className={formStyles.body}>
          <div className={formStyles.readOnlyBox}>
            <p className={formStyles.description}>
              Los permisos se guardan por modulo. La accion sensible de cambio de estado se muestra
              como dato de solo lectura y se conserva al guardar.
            </p>
          </div>
          {requiresStrongConfirmation ? (
            <div className={formStyles.warningBox}>
              <p className={formStyles.description}>
                Estas modificaciones pueden afectar la sesion actual o el rol administrador.
              </p>
              <label className={formStyles.checkboxRow}>
                <input
                  checked={confirmedSensitiveChange}
                  id="permissions-sensitive-confirm"
                  onChange={(event) => setConfirmedSensitiveChange(event.target.checked)}
                  type="checkbox"
                />
                Confirmo que quiero modificar permisos sensibles.
              </label>
            </div>
          ) : null}
          {errorMessage ? (
            <p className={formStyles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
          {content}
        </div>

        <footer className={formStyles.footer}>
          <Button disabled={pending} onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button
            disabled={status !== 'success'}
            id="permissions-save"
            loading={pending}
            onClick={handleSave}
            variant="primary"
          >
            Guardar permisos
          </Button>
        </footer>
      </aside>
    </div>
  );
}
