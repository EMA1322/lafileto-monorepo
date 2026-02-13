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
  let fetchData;
  let renderUsersTable;
  let applyRBAC;
  let buildRolePermsMap;

  beforeEach(async () => {
    document.body.innerHTML = usersTemplate;

    const stateModule = await import('../src/components/users/users.state.js');
    state = stateModule.state;
    fetchData = stateModule.fetchData;
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

  it('mantiene contrato de layout: CTA, toolbar, pageSize, tabla y wrappers', () => {
    const moduleRoot = document.querySelector('.users');
    const usersPanel = document.querySelector('#panel-users');
    const header = moduleRoot?.querySelector('.users__header');
    const createButton = document.querySelector('#btn-user-new');
    const toolbar = document.querySelector('#users-filters');
    const pageSizeSelect = document.querySelector('#users-filter-page-size');
    const tableHeaders = Array.from(document.querySelectorAll('#users-table thead th')).map((th) => th.textContent?.trim());

    expect(moduleRoot?.classList.contains('users')).toBe(true);
    expect(moduleRoot?.classList.contains('container')).toBe(true);
    expect(createButton?.querySelector('.icon-label')?.textContent?.trim()).toBe('Crear usuario');
    expect(createButton?.closest('.users__header-actions')?.closest('.users__header')).toBe(header ?? null);

    expect(toolbar).not.toBeNull();
    expect(toolbar?.closest('.users__panel')).toBe(usersPanel ?? null);
    expect(toolbar?.closest('.users__header')).toBeNull();
    expect(pageSizeSelect?.closest('.users__filters-group')).not.toBeNull();
    expect(toolbar?.querySelector('.users__filters-group--actions #users-filter-clear')).not.toBeNull();

    expect(document.querySelector('#users-table-wrapper')?.classList.contains('table-wrapper')).toBe(true);
    expect(document.querySelector('#users-table')?.classList.contains('data-table')).toBe(true);
    expect(tableHeaders).toEqual(['Nombre completo', 'Email', 'Teléfono', 'Rol', 'Estado', 'Acciones']);
    expect(document.querySelector('th.users__th-actions.adminList__th--actions')).not.toBeNull();
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
    expect(rows[0].querySelectorAll('td')[3]?.textContent).toBe('Admin');
    const row = document.querySelector('#users-tbody tr[data-id="user-1"]');
    const actionCell = row?.querySelector('.users__td-actions.adminList__td--actions');
    const actionGroup = actionCell?.querySelector('.users__row-actions.adminList__rowActions');
    const buttons = actionGroup?.querySelectorAll('button') ?? [];

    expect(actionCell).not.toBeNull();
    expect(buttons).toHaveLength(3);
    expect(Array.from(buttons).map((button) => button.textContent?.trim())).toEqual(['Editar', 'Activo', 'Eliminar']);
    expect(Array.from(buttons).map((button) => button.getAttribute('data-action'))).toEqual([
      'user-edit',
      'user-toggle-status',
      'user-delete',
    ]);
    expect(Array.from(buttons).every((button) => button.className.includes('adminList__actionBtn'))).toBe(true);
    expect(buttons[0]?.className).toContain('btn--ghost');
    expect(buttons[1]?.className).toContain('btn--ghost');
    expect(buttons[2]?.className).toContain('btn--danger');
  });

  it('renderUsersTable usa fallback de rol cuando no hay match', () => {
    state.roles = [{ id: 'role-1', name: 'Admin' }];
    state.users = [
      {
        id: 'user-404',
        fullName: 'Linus Torvalds',
        email: 'linus@example.com',
        phone: '555551111',
        roleId: 'role-missing',
        status: 'active',
      },
    ];

    renderUsersTable();

    const roleCellText = document.querySelector('#users-tbody tr[data-id="user-404"] td:nth-child(4)')?.textContent?.trim();
    expect(roleCellText).toBe('—');
    expect(document.querySelector('#users-tbody')?.textContent).not.toContain('role-missing');
  });

  it('fetchData re-renderiza users al cargar roles y reemplaza fallback por label', async () => {
    const originalFetch = globalThis.fetch;
    const tableRoleSnapshots = [];

    const delayedOk = (payload, delayMs) => new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          text: async () => JSON.stringify(payload),
        });
      }, delayMs);
    });

    globalThis.fetch = (url) => {
      const href = String(url);
      if (href.includes('/users')) {
        return delayedOk({
          ok: true,
          data: {
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
            meta: { page: 1, pageSize: 10, total: 1, pageCount: 1 },
          },
        }, 0);
      }
      if (href.includes('/roles')) {
        return delayedOk({
          ok: true,
          data: { items: [{ roleId: 'role-1', name: 'Admin' }] },
        }, 20);
      }
      if (href.includes('/modules')) {
        return delayedOk({
          ok: true,
          data: { items: [] },
        }, 20);
      }
      throw new Error(`Unexpected URL in test: ${href}`);
    };

    try {
      await fetchData({
        onUsersTable: () => {
          renderUsersTable();
          const roleCell = document.querySelector('#users-tbody tr[data-id="user-2"] td:nth-child(4)')?.textContent?.trim();
          if (roleCell) tableRoleSnapshots.push(roleCell);
        },
        onRolesView: () => {},
        onUsersStatus: () => {},
        onRolesStatus: () => {},
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(tableRoleSnapshots).toContain('—');
    expect(tableRoleSnapshots.at(-1)).toBe('Admin');
    expect(document.querySelector('#users-tbody')?.textContent).not.toContain('role-1');
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
