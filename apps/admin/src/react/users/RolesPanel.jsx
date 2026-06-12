import { Button, StateBlock } from '../ui/index.js';
import { isProtectedRole } from './roles.helpers.js';
import styles from '../pages/UsersPage.module.css';

export default function RolesPanel({
  canManageRoles = false,
  errorMessage = '',
  loading = false,
  onCreate,
  onDelete,
  onEdit,
  onPermissions,
  roles = [],
}) {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = { Button, StateBlock };

  if (!canManageRoles) {
    return (
      <StateBlock
        description="La gestion de roles y permisos esta disponible solo para administradores."
        status="empty"
        title="Roles restringidos"
      />
    );
  }

  if (loading) return <StateBlock status="loading" title="Cargando roles" />;
  if (errorMessage) {
    return <StateBlock description={errorMessage} status="error" title="No pudimos cargar roles" />;
  }
  if (!roles.length) {
    return (
      <StateBlock
        action={
          <Button onClick={onCreate} variant="primary">
            Crear rol
          </Button>
        }
        status="empty"
        title="No hay roles registrados"
      />
    );
  }

  return (
    <section className={styles.panelBlock} aria-labelledby="roles-panel-title">
      <header className={styles.panelHeader}>
        <div>
          <h2 id="roles-panel-title">Roles & Permisos</h2>
          <p>Administra roles, restricciones y matriz RBAC.</p>
        </div>
        <Button onClick={onCreate} variant="primary">
          Crear rol
        </Button>
      </header>

      <div className={styles.rolesTableWrap}>
        <table className={styles.table}>
          <caption>Listado de roles</caption>
          <thead>
            <tr>
              <th scope="col">Rol</th>
              <th scope="col">Nombre visible</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const protectedRole = isProtectedRole(role.roleId);
              return (
                <tr key={role.roleId}>
                  <td>{role.roleId}</td>
                  <td>{role.name}</td>
                  <td>
                    <div className={styles.actions}>
                      <Button onClick={() => onEdit(role)} size="sm" variant="ghost">
                        Editar
                      </Button>
                      <Button onClick={() => onPermissions(role)} size="sm" variant="secondary">
                        Permisos
                      </Button>
                      <Button
                        disabled={protectedRole}
                        onClick={() => onDelete(role)}
                        size="sm"
                        title={
                          protectedRole ? 'El rol administrador no se puede eliminar.' : undefined
                        }
                        variant="danger"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {roles.map((role) => {
          const protectedRole = isProtectedRole(role.roleId);
          return (
            <article className={styles.mobileItem} key={role.roleId}>
              <div className={styles.mobileHeader}>
                <h3>{role.name}</h3>
                <span>{role.roleId}</span>
              </div>
              <div className={styles.actions}>
                <Button onClick={() => onEdit(role)} size="sm" variant="ghost">
                  Editar
                </Button>
                <Button onClick={() => onPermissions(role)} size="sm" variant="secondary">
                  Permisos
                </Button>
                <Button
                  disabled={protectedRole}
                  onClick={() => onDelete(role)}
                  size="sm"
                  variant="danger"
                >
                  Eliminar
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
