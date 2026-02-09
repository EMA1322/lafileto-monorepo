import { readFileSync } from 'node:fs';

import { describe, it, expect, beforeEach } from 'vitest';

const usersTemplate = readFileSync(
  new URL('../src/components/users/users.html', import.meta.url),
  'utf8',
);

function seedPermissions() {
  sessionStorage.setItem(
    'rbac.permMap',
    JSON.stringify({
      users: { r: true, w: true, u: true, d: true },
    }),
  );
}

describe('admin users module', () => {
  let state;
  let renderUsersTable;
  let applyRBAC;
  let buildRolePermsMap;

  beforeEach(async () => {
    document.body.innerHTML = usersTemplate;

    const stateModule = await import('../src/components/users/users.state.js');
    state = stateModule.state;
    state.users = [];
    state.roles = [];
    state.filters.q = '';
    state.filters.page = 1;
    state.filters.pageSize = 10;
    state.ui.loadingUsers = false;
    state.ui.loadingRoles = false;
    state.ui.errorUsers = null;
    state.ui.errorRoles = null;
    state.rbac.roleId = null;
    state.rbac.isAdmin = true;

    ({ renderUsersTable } = await import('../src/components/users/users.render.table.js'));
    ({ applyRBAC } = await import('../src/components/users/viewRBAC.js'));
    ({ buildRolePermsMap } = await import('../src/components/users/helpers.js'));

    seedPermissions();

    const container = document.querySelector('.users');
    if (container) {
      container.dataset.rbacModule = 'users';
      container.dataset.rbacRoleId = 'role-admin';
      container.dataset.rbacIsAdmin = 'true';
      container.dataset.rbacAdminRoles = 'role-admin';
      container.dataset.rbacActiveTab = 'users';
    }
  });

  it('renderUsersTable pinta filas con el template real', () => {
    state.roles = [{ id: 'role-1', name: 'Admin' }];
    state.users = [
      {
        id: 'user-1',
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '12345678',
        roleId: 'role-1',
        status: 'active',
      },
    ];

    renderUsersTable();

    const rows = document.querySelectorAll('#users-tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('td')?.textContent).toBe('Ada Lovelace');
    const normalized = document
      .querySelector('#users-tbody')
      ?.innerHTML.replace(/\s+/g, ' ')
      .trim();
    expect(normalized).toMatchInlineSnapshot(
      `"<tr data-id="user-1" data-role-id="role-1"> <td>Ada Lovelace</td> <td>ada@example.com</td> <td>12345678</td> <td>role-1</td> <td><span class=\\"badge badge--success\\">Activo</span></td> <td> <div class=\\"users__row-actions\\" role=\\"group\\" aria-label=\\"Acciones\\"> <button class=\\"btn btn-secondary btn--sm\\" type=\\"button\\" data-action=\\"user-edit\\" data-rbac-action=\\"update\\" data-rbac-hide=\\"\\"> <svg class=\\"icon icon--sm\\" viewBox=\\"0 0 24 24\\" stroke-width=\\"1.5\\" stroke=\\"currentColor\\" fill=\\"none\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" aria-hidden=\\"true\\"><path d=\\"M4 17.5V20h2.5L17.81 8.69a2 2 0 0 0-2.83-2.83L4 17.5z\\"></path><path d=\\"M14.88 6.12l2.99 2.99\\"></path></svg><span class=\\"icon-label\\">Editar</span> </button> <button class=\\"users__status-toggle is-active\\" type=\\"button\\" data-action=\\"user-toggle-status\\" data-rbac-action=\\"update\\" data-next-status=\\"INACTIVE\\" aria-pressed=\\"true\\" aria-label=\\"Cambiar estado a Inactivo\\">Activo</button> <button class=\\"btn btn-danger btn--sm\\" type=\\"button\\" data-action=\\"user-delete\\" data-rbac-action=\\"delete\\"> <svg class=\\"icon icon--sm\\" viewBox=\\"0 0 24 24\\" stroke-width=\\"1.5\\" stroke=\\"currentColor\\" fill=\\"none\\" stroke-linecap=\\"round\\" stroke-linejoin=\\"round\\" aria-hidden=\\"true\\"><path d=\\"M5 7h14\\"></path><path d=\\"M10 11v6\\"></path><path d=\\"M14 11v6\\"></path><path d=\\"M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-12\\"></path><path d=\\"M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2\\"></path></svg><span class=\\"icon-label\\">Eliminar</span> </button> </div> </td> </tr>"`
    );
  });

  it('incluye filtros y paginación en el template', () => {
    expect(document.querySelector('#users-filter-q')).not.toBeNull();
    expect(document.querySelector('#users-filter-order-by')).not.toBeNull();
    expect(document.querySelector('#users-filter-order-dir')).not.toBeNull();
    expect(document.querySelector('#users-filter-page-size')).not.toBeNull();
    expect(document.querySelector('#users-filter-clear')).not.toBeNull();
    expect(document.querySelector('#users-page-list')).not.toBeNull();
    expect(document.querySelector('#users-page-next')).not.toBeNull();
  });

  it('renderUsersTable muestra meta y paginación', () => {
    state.users = {
      items: [
        {
          id: 'user-2',
          fullName: 'Grace Hopper',
          email: 'grace@example.com',
          phone: '22222222',
          roleId: 'role-1',
          status: 'active',
        },
      ],
      meta: {
        page: 2,
        pageSize: 10,
        total: 25,
        pageCount: 3,
      },
    };

    renderUsersTable();

    expect(document.querySelector('#users-meta')?.textContent).toBe('11–20 de 25 usuarios');
    const pageButtons = document.querySelectorAll('#users-page-list button');
    expect(pageButtons.length).toBeGreaterThan(0);
  });

  it('renderUsersTable oculta estados en éxito', () => {
    state.users = [
      {
        id: 'user-3',
        fullName: 'Katherine Johnson',
        email: 'kj@example.com',
        phone: '33333333',
        roleId: 'role-1',
        status: 'active',
      },
    ];

    renderUsersTable();

    expect(document.querySelector('#users-loading')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-error')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-empty')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-table-wrapper')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('#users-footer')?.hasAttribute('hidden')).toBe(false);
  });

  it('renderUsersTable muestra solo error si falla', () => {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = 'No se pudieron cargar los usuarios.';
    state.users = [];

    renderUsersTable();

    expect(document.querySelector('#users-loading')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-error')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('#users-empty')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-table-wrapper')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-footer')?.hasAttribute('hidden')).toBe(true);
  });

  it('renderUsersTable muestra solo vacío si no hay datos', () => {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = null;
    state.users = [];

    renderUsersTable();

    expect(document.querySelector('#users-loading')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-error')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-empty')?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('#users-table-wrapper')?.hasAttribute('hidden')).toBe(true);
    expect(document.querySelector('#users-footer')?.hasAttribute('hidden')).toBe(true);
  });

  it('buildRolePermsMap normaliza estructura mixta', () => {
    const seed = {
      role_permissions: {
        admin: {
          users: { r: 1, w: 1, u: 1, d: 0 },
        },
      },
    };

    const result = buildRolePermsMap(seed);
    expect(result).toEqual({
      admin: {
        users: { r: true, w: true, u: true, d: false },
      },
    });
  });

  it('applyRBAC oculta pestaña de roles si no es admin', () => {
    const container = document.querySelector('.users');
    if (!container) throw new Error('Users template not loaded.');
    container.dataset.rbacModule = 'users';
    container.dataset.rbacIsAdmin = 'false';
    container.dataset.rbacRoleId = 'role-staff';
    container.dataset.rbacAdminRoles = 'role-admin';
    container.dataset.rbacActiveTab = 'users';

    applyRBAC();

    expect(document.querySelector('#tab-roles')?.hasAttribute('hidden')).toBe(true);
  });
});
