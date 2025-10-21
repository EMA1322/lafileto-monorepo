import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/utils/snackbar.js', () => ({ showSnackbar: vi.fn() }));
vi.mock('@/utils/api.js', () => ({ apiFetch: vi.fn(), getDataSource: () => 'json' }));
vi.mock('@/utils/helpers.js', () => ({
  normalizeText: (value) => String(value).toLowerCase(),
  createId: (prefix) => `${prefix}-mock`,
}));
vi.mock('@/utils/rbac.js', () => ({
  canWrite: vi.fn(() => true),
  canUpdate: vi.fn(() => true),
  canDelete: vi.fn(() => true),
  ensureRbacLoaded: vi.fn(),
}));

describe('admin users module', () => {
  let state;
  let renderUsersTable;
  let applyRBAC;
  let buildRolePermsMap;

  beforeEach(async () => {
    document.body.innerHTML = '';

    const stateModule = await import('../src/components/users/users.state.js');
    state = stateModule.state;
    state.users = [];
    state.roles = [];
    state.filters.query = '';
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
  });

  it('renderUsersTable pinta filas y contador básicos', () => {
    document.body.innerHTML = `
      <div>
        <div id="users-status"></div>
        <button id="btn-user-new"></button>
        <table>
          <tbody id="users-tbody"></tbody>
        </table>
        <span id="users-count"></span>
        <button id="users-page-prev"></button>
        <button id="users-page-next"></button>
        <span id="users-page-info"></span>
        <div id="tab-users"></div>
        <div id="tab-roles"></div>
        <section id="panel-users"></section>
        <section id="panel-roles"></section>
      </div>
    `;

    state.roles = [{ id: 'role-1', name: 'Admin' }];
    state.users = [{
      id: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '12345678',
      roleId: 'role-1',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
    }];

    renderUsersTable();

    const rows = document.querySelectorAll('#users-tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector('td')?.textContent).toBe('Ada');
    expect(document.querySelector('#users-count')?.textContent).toContain('Mostrando 1–1 de 1 usuarios');
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
    document.body.innerHTML = `
      <div>
        <div id="tab-users"></div>
        <div id="tab-roles"></div>
        <section id="panel-users"></section>
        <section id="panel-roles"></section>
        <button id="btn-user-new"></button>
        <table><tbody id="users-tbody"><tr><td><button data-action="view"></button></td></tr></tbody></table>
      </div>
    `;

    state.rbac.isAdmin = false;
    applyRBAC();

    expect(document.querySelector('#tab-roles')?.hasAttribute('hidden')).toBe(true);
  });
});
