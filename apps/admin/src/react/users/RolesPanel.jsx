import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { Button, IconAction, StateBlock } from '../ui/index.js';
import { isProtectedRole } from './roles.helpers.js';
import styles from '../pages/UsersPage.module.css';

function getRoleScopeCopy(role) {
  if (isProtectedRole(role.roleId)) {
    return 'Rol protegido. Puede gestionar usuarios, roles, modulos y permisos.';
  }

  return 'El alcance real se define en la matriz de permisos por modulo.';
}

function RoleActions({ onDelete, onEdit, onPermissions, protectedRole, role }) {
  return (
    <div className={styles.actions} aria-label="Acciones de rol">
      <IconAction
        icon={<Pencil />}
        label={`Editar rol: ${role.name || role.roleId}`}
        onClick={() => onEdit(role)}
      />
      <IconAction
        icon={<KeyRound />}
        label={`Editar permisos del rol: ${role.name || role.roleId}`}
        onClick={() => onPermissions(role)}
      />
      <IconAction
        className={styles.deleteAction}
        disabled={protectedRole}
        icon={<Trash2 />}
        label={
          protectedRole
            ? `No se puede eliminar el rol administrador: ${role.name || role.roleId}`
            : `Eliminar rol: ${role.name || role.roleId}`
        }
        onClick={() => onDelete(role)}
      />
    </div>
  );
}

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
  const Ui = { Button, IconAction, StateBlock };

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
          <p>Revisa el alcance real de cada rol y administra permisos por modulo.</p>
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
              <th scope="col">Alcance</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => {
              const protectedRole = isProtectedRole(role.roleId);
              return (
                <tr key={role.roleId}>
                  <td>
                    <div className={styles.roleSummary}>
                      <strong>{role.name}</strong>
                      <span>{role.roleId}</span>
                    </div>
                  </td>
                  <td>
                    <p className={styles.roleScope}>{getRoleScopeCopy(role)}</p>
                  </td>
                  <td>
                    <RoleActions
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onPermissions={onPermissions}
                      protectedRole={protectedRole}
                      role={role}
                    />
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
                <div>
                  <h3>{role.name}</h3>
                  <p>{role.roleId}</p>
                </div>
              </div>
              <p className={styles.roleScope}>{getRoleScopeCopy(role)}</p>
              <RoleActions
                onDelete={onDelete}
                onEdit={onEdit}
                onPermissions={onPermissions}
                protectedRole={protectedRole}
                role={role}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
