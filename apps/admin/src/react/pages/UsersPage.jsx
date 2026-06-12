import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchMe, getCurrentUser, getPermissions } from '@/utils/auth.js';
import { canDelete, canUpdate, canWrite } from '@/utils/rbac.js';
import { rolesApi, usersApi } from '@/utils/apis.js';
import {
  AdminThemeScope,
  Badge,
  Button,
  Input,
  Select,
  StateBlock,
  TableScroll,
  TableShell,
  TableToolbar,
  Tabs,
} from '../ui/index.js';
import PermissionsMatrix from '../users/PermissionsMatrix.jsx';
import RoleDeleteDialog from '../users/RoleDeleteDialog.jsx';
import RoleForm from '../users/RoleForm.jsx';
import RolesPanel from '../users/RolesPanel.jsx';
import UserDeleteDialog from '../users/UserDeleteDialog.jsx';
import UserForm from '../users/UserForm.jsx';
import { ADMIN_ROLE_ID, normalizeRole, normalizeRolesResponse } from '../users/roles.helpers.js';
import {
  buildUsersQuery,
  DEFAULT_USER_FILTERS,
  formatUserStatus,
  getRoleLabel,
  normalizeUserFilters,
  normalizeUsersResponse,
  parseUsersFiltersFromHash,
  serializeUsersFiltersToHash,
  USER_ORDER_DIRECTIONS,
  USER_ORDER_FIELDS,
  USER_PAGE_SIZE_OPTIONS,
} from '../users/usersList.helpers.js';
import styles from './UsersPage.module.css';

const VIEW_STATUS = {
  loading: 'loading',
  error: 'error',
  empty: 'empty',
  success: 'success',
};

function getInitialFilters() {
  if (typeof window === 'undefined') return DEFAULT_USER_FILTERS;
  return parseUsersFiltersFromHash(window.location.hash);
}

function hasFullPermissions(permissions = {}) {
  const values = Object.values(permissions || {});
  return values.length > 0 && values.every((perm) => perm?.r && perm?.w && perm?.u && perm?.d);
}

function getEffectiveCurrentUser(userFromState = null) {
  return userFromState || getCurrentUser?.() || null;
}

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span className={`${styles.badge} ${isActive ? styles.badgeSuccess : styles.badgeWarning}`}>
      {formatUserStatus(status)}
    </span>
  );
}

function UserActions({ currentUserId, onDelete, onEdit, permissions, user }) {
  const isCurrentUser = String(currentUserId || '') === String(user.id || '');
  const hasActions = permissions.canUpdate || (permissions.canDelete && !isCurrentUser);

  if (!hasActions) return <span className={styles.muted}>Sin acciones</span>;

  return (
    <div className={styles.actions} aria-label="Acciones de usuario">
      {permissions.canUpdate ? (
        <Button onClick={() => onEdit(user)} size="sm" variant="ghost">
          Editar
        </Button>
      ) : null}
      {permissions.canDelete && !isCurrentUser ? (
        <Button onClick={() => onDelete(user)} size="sm" variant="danger">
          Eliminar
        </Button>
      ) : null}
    </div>
  );
}

function UsersTable({ currentUserId, items, onDelete, onEdit, permissions, roles }) {
  return (
    <TableScroll className={styles.tableWrap}>
      <table className={styles.table}>
        <caption>Listado de usuarios</caption>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Email</th>
            <th scope="col">Telefono</th>
            <th scope="col">Rol</th>
            <th scope="col">Estado</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.fullName || '-'}</td>
              <td>{user.email || '-'}</td>
              <td>{user.phone || '-'}</td>
              <td>
                <Badge>{getRoleLabel(user.roleId, roles)}</Badge>
              </td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              <td>
                <UserActions
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  permissions={permissions}
                  user={user}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function UsersCards({ currentUserId, items, onDelete, onEdit, permissions, roles }) {
  return (
    <div className={styles.mobileList}>
      {items.map((user) => (
        <article className={styles.mobileItem} key={user.id}>
          <div className={styles.mobileHeader}>
            <h2>{user.fullName || '-'}</h2>
            <StatusBadge status={user.status} />
          </div>
          <div className={styles.mobileMeta}>
            <span>{user.email || '-'}</span>
            <span>{user.phone || '-'}</span>
            <span>{getRoleLabel(user.roleId, roles)}</span>
          </div>
          <UserActions
            currentUserId={currentUserId}
            onDelete={onDelete}
            onEdit={onEdit}
            permissions={permissions}
            user={user}
          />
        </article>
      ))}
    </div>
  );
}

export default function UsersPage() {
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const Ui = {
    AdminThemeScope,
    Badge,
    Button,
    Input,
    Select,
    StateBlock,
    TableScroll,
    TableShell,
    TableToolbar,
    Tabs,
  };
  // eslint-disable-next-line no-unused-vars -- This ESLint setup does not count JSX member expressions as usage.
  const View = {
    PermissionsMatrix,
    RoleDeleteDialog,
    RoleForm,
    RolesPanel,
    UserDeleteDialog,
    UserForm,
    UserActions,
    UsersCards,
    UsersTable,
    StatusBadge,
  };

  const [activeTab, setActiveTab] = useState('users');
  const [filters, setFilters] = useState(getInitialFilters);
  const [draftFilters, setDraftFilters] = useState(getInitialFilters);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 10, total: 0, pageCount: 1 });
  const [status, setStatus] = useState(VIEW_STATUS.loading);
  const [rolesStatus, setRolesStatus] = useState(VIEW_STATUS.loading);
  const [errorMessage, setErrorMessage] = useState('');
  const [rolesErrorMessage, setRolesErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(() => getEffectiveCurrentUser());
  const [userFormState, setUserFormState] = useState({ open: false, mode: 'create', user: null });
  const [deleteUser, setDeleteUser] = useState(null);
  const [roleFormState, setRoleFormState] = useState({ open: false, mode: 'create', role: null });
  const [deleteRole, setDeleteRole] = useState(null);
  const [permissionsRole, setPermissionsRole] = useState(null);

  const permissions = useMemo(
    () => ({
      canWrite: canWrite('users') || canWrite('user'),
      canUpdate: canUpdate('users') || canUpdate('user'),
      canDelete: canDelete('users') || canDelete('user'),
    }),
    [],
  );

  const currentRoleId = currentUser?.roleId || '';
  const canManageRoles =
    currentRoleId === ADMIN_ROLE_ID || hasFullPermissions(getPermissions?.() || {});

  const loadUsers = useCallback(
    async (nextFilters = filters, { signal } = {}) => {
      setStatus(VIEW_STATUS.loading);
      setErrorMessage('');
      try {
        const response = await usersApi.list(buildUsersQuery(nextFilters), { signal });
        const normalized = normalizeUsersResponse(response);
        setUsers(normalized.items);
        setMeta(normalized.meta);
        setStatus(normalized.items.length ? VIEW_STATUS.success : VIEW_STATUS.empty);
      } catch (error) {
        if (signal?.aborted) return;
        setErrorMessage(error?.message || 'No se pudieron cargar los usuarios.');
        setStatus(VIEW_STATUS.error);
      }
    },
    [filters],
  );

  const loadRoles = useCallback(async ({ signal } = {}) => {
    setRolesStatus(VIEW_STATUS.loading);
    setRolesErrorMessage('');
    try {
      const response = await rolesApi.list({}, { signal });
      const normalized = normalizeRolesResponse(response);
      setRoles(normalized);
      setRolesStatus(normalized.length ? VIEW_STATUS.success : VIEW_STATUS.empty);
    } catch (error) {
      if (signal?.aborted) return;
      setRolesErrorMessage(error?.message || 'No se pudieron cargar los roles.');
      setRolesStatus(VIEW_STATUS.error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const existingUser = getEffectiveCurrentUser();
    if (existingUser) {
      setCurrentUser(existingUser);
      return undefined;
    }
    fetchMe({ force: false, silent: true })
      .then((result) => {
        if (mounted) setCurrentUser(result?.user || getEffectiveCurrentUser());
      })
      .catch(() => {
        if (mounted) setCurrentUser(getEffectiveCurrentUser());
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(filters, { signal: controller.signal });
    void loadRoles({ signal: controller.signal });
    return () => controller.abort();
  }, [filters, loadRoles, loadUsers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextHash = serializeUsersFiltersToHash(filters);
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [filters]);

  function updateDraftFilter(field, value) {
    setDraftFilters((current) => normalizeUserFilters({ ...current, [field]: value, page: 1 }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setFilters(normalizeUserFilters({ ...draftFilters, page: 1 }));
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_USER_FILTERS);
    setFilters(DEFAULT_USER_FILTERS);
  }

  function setPage(page) {
    setFilters((current) => normalizeUserFilters({ ...current, page }));
    setDraftFilters((current) => normalizeUserFilters({ ...current, page }));
  }

  async function handleUserSaved() {
    setUserFormState({ open: false, mode: 'create', user: null });
    await loadUsers(filters);
  }

  async function handleUserDeleted() {
    setDeleteUser(null);
    await loadUsers(filters);
  }

  async function handleRoleSaved({ role }) {
    setRoleFormState({ open: false, mode: 'create', role: null });
    if (role)
      setRoles((current) => [
        ...current.filter((item) => item.roleId !== role.roleId),
        normalizeRole(role),
      ]);
    await loadRoles();
  }

  async function handleRoleDeleted(role) {
    setDeleteRole(null);
    setRoles((current) => current.filter((item) => item.roleId !== role.roleId));
    await loadRoles();
  }

  async function handlePermissionsSaved({ role }) {
    if (role?.roleId && role.roleId === currentRoleId) {
      const result = await fetchMe({ force: true, silent: true });
      setCurrentUser(result?.user || getEffectiveCurrentUser());
    }
  }

  const usersContent = (() => {
    if (status === VIEW_STATUS.loading)
      return <StateBlock status="loading" title="Cargando usuarios" />;
    if (status === VIEW_STATUS.error) {
      return (
        <StateBlock
          action={
            <Button onClick={() => loadUsers(filters)} variant="secondary">
              Reintentar
            </Button>
          }
          description={errorMessage}
          status="error"
          title="No pudimos cargar usuarios"
        />
      );
    }
    if (status === VIEW_STATUS.empty) {
      return <StateBlock status="empty" title="No hay usuarios para mostrar" />;
    }

    return (
      <>
        <UsersTable
          currentUserId={currentUser?.id}
          items={users}
          onDelete={setDeleteUser}
          onEdit={(user) => setUserFormState({ open: true, mode: 'edit', user })}
          permissions={permissions}
          roles={roles}
        />
        <UsersCards
          currentUserId={currentUser?.id}
          items={users}
          onDelete={setDeleteUser}
          onEdit={(user) => setUserFormState({ open: true, mode: 'edit', user })}
          permissions={permissions}
          roles={roles}
        />
        <footer className={styles.footer}>
          <span>
            {meta.total
              ? `${(meta.page - 1) * meta.pageSize + 1}-${Math.min(meta.total, meta.page * meta.pageSize)} de ${meta.total} usuarios`
              : 'Sin resultados'}
          </span>
          <div className={styles.pagination}>
            <Button disabled={meta.page <= 1} onClick={() => setPage(1)} size="sm" variant="ghost">
              Primero
            </Button>
            <Button
              disabled={meta.page <= 1}
              onClick={() => setPage(meta.page - 1)}
              size="sm"
              variant="ghost"
            >
              Anterior
            </Button>
            <Button
              disabled={meta.page >= meta.pageCount}
              onClick={() => setPage(meta.page + 1)}
              size="sm"
              variant="ghost"
            >
              Siguiente
            </Button>
            <Button
              disabled={meta.page >= meta.pageCount}
              onClick={() => setPage(meta.pageCount)}
              size="sm"
              variant="ghost"
            >
              Ultimo
            </Button>
          </div>
        </footer>
      </>
    );
  })();

  return (
    <AdminThemeScope className={styles.theme}>
      <main className={styles.page} aria-labelledby="users-page-title">
        <header className={styles.header}>
          <div>
            <h1 id="users-page-title">Usuarios</h1>
            <p>Gestiona usuarios, roles y permisos del panel.</p>
          </div>
          {permissions.canWrite ? (
            <Button
              onClick={() => setUserFormState({ open: true, mode: 'create', user: null })}
              variant="primary"
            >
              Crear usuario
            </Button>
          ) : null}
        </header>

        <Tabs
          activeValue={activeTab}
          aria-label="Usuarios y roles"
          items={[
            {
              value: 'users',
              label: 'Usuarios',
              content: (
                <TableShell>
                  <TableToolbar>
                    <form className={styles.toolbar} onSubmit={applyFilters}>
                      <Input
                        id="users-filter-q"
                        label="Buscar"
                        onChange={(event) => updateDraftFilter('q', event.target.value)}
                        placeholder="Nombre o email"
                        type="search"
                        value={draftFilters.q}
                      />
                      <Select
                        id="users-filter-orderBy"
                        label="Ordenar por"
                        onChange={(event) => updateDraftFilter('orderBy', event.target.value)}
                        value={draftFilters.orderBy}
                      >
                        {USER_ORDER_FIELDS.map((field) => (
                          <option key={field} value={field}>
                            {field === 'fullName' ? 'Nombre' : field}
                          </option>
                        ))}
                      </Select>
                      <Select
                        id="users-filter-orderDir"
                        label="Direccion"
                        onChange={(event) => updateDraftFilter('orderDir', event.target.value)}
                        value={draftFilters.orderDir}
                      >
                        {USER_ORDER_DIRECTIONS.map((direction) => (
                          <option key={direction} value={direction}>
                            {direction === 'asc' ? 'Ascendente' : 'Descendente'}
                          </option>
                        ))}
                      </Select>
                      <Select
                        id="users-filter-pageSize"
                        label="Por pagina"
                        onChange={(event) => updateDraftFilter('pageSize', event.target.value)}
                        value={draftFilters.pageSize}
                      >
                        {USER_PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </Select>
                      <div className={styles.actions}>
                        <Button type="submit" variant="secondary">
                          Aplicar
                        </Button>
                        <Button onClick={clearFilters} variant="ghost">
                          Limpiar
                        </Button>
                      </div>
                    </form>
                  </TableToolbar>
                  {usersContent}
                </TableShell>
              ),
            },
            {
              value: 'roles',
              label: 'Roles & Permisos',
              disabled: !canManageRoles,
              content: (
                <RolesPanel
                  canManageRoles={canManageRoles}
                  errorMessage={rolesErrorMessage}
                  loading={rolesStatus === VIEW_STATUS.loading}
                  onCreate={() => setRoleFormState({ open: true, mode: 'create', role: null })}
                  onDelete={setDeleteRole}
                  onEdit={(role) => setRoleFormState({ open: true, mode: 'edit', role })}
                  onPermissions={setPermissionsRole}
                  roles={roles}
                />
              ),
            },
          ]}
          onValueChange={setActiveTab}
        />
      </main>

      <UserForm
        mode={userFormState.mode}
        onClose={() => setUserFormState({ open: false, mode: 'create', user: null })}
        onSaved={handleUserSaved}
        open={userFormState.open}
        roles={roles}
        user={userFormState.user}
      />
      <UserDeleteDialog
        currentUserId={currentUser?.id}
        onClose={() => setDeleteUser(null)}
        onDeleted={handleUserDeleted}
        open={Boolean(deleteUser)}
        user={deleteUser}
      />
      <RoleForm
        mode={roleFormState.mode}
        onClose={() => setRoleFormState({ open: false, mode: 'create', role: null })}
        onSaved={handleRoleSaved}
        open={roleFormState.open}
        role={roleFormState.role}
      />
      <RoleDeleteDialog
        onClose={() => setDeleteRole(null)}
        onDeleted={handleRoleDeleted}
        open={Boolean(deleteRole)}
        role={deleteRole}
      />
      <PermissionsMatrix
        currentRoleId={currentRoleId}
        onClose={() => setPermissionsRole(null)}
        onSaved={handlePermissionsSaved}
        open={Boolean(permissionsRole)}
        role={permissionsRole}
      />
    </AdminThemeScope>
  );
}
