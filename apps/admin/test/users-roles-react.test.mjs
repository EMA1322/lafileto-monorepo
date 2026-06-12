import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(adminRoot, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function routeBlock(source, routeName, nextRouteName) {
  const start = source.indexOf(`${routeName}: {`);
  assert.notEqual(start, -1, `${routeName} route should exist`);
  const end = nextRouteName
    ? source.indexOf(`${nextRouteName}: {`, start + 1)
    : source.indexOf('\n};', start + 1);
  assert.notEqual(end, -1, `${routeName} route should have an end boundary`);
  return source.slice(start, end);
}

function routeType(source, routeName, nextRouteName) {
  const match = routeBlock(source, routeName, nextRouteName).match(
    /^\s*type:\s*(ROUTE_TYPE_[A-Z]+),/m,
  );
  assert.ok(match, `${routeName} route should declare a route type`);
  return match[1];
}

function testUsersRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const usersRoute = routeBlock(source, 'users', 'settings');

  assert.equal(routeType(source, 'users', 'settings'), 'ROUTE_TYPE_REACT');
  assert.match(usersRoute, /import\(['"]\.\.\/react\/pages\/UsersPage\.jsx['"]\)/);
  assert.doesNotMatch(usersRoute, /viewHtmlPath|users\.html|users\.css/);
  assert.doesNotMatch(usersRoute, /ROUTE_TYPE_LEGACY/);
}

function testRouteBoundariesStayIntact() {
  const source = read('src/utils/router.js');

  for (const [routeName, nextRouteName] of [
    ['login', 'dashboard'],
    ['dashboard', 'products'],
    ['products', 'categories'],
    ['categories', 'users'],
    ['users', 'settings'],
  ]) {
    assert.equal(routeType(source, routeName, nextRouteName), 'ROUTE_TYPE_REACT');
  }

  for (const [routeName, nextRouteName] of [
    ['settings', "'not-authorized'"],
    ["'not-authorized'", null],
  ]) {
    assert.equal(routeType(source, routeName, nextRouteName), 'ROUTE_TYPE_LEGACY');
  }
}

function testNoReactRouter() {
  const files = [
    'src/utils/router.js',
    'src/react/pages/UsersPage.jsx',
    'src/react/users/UserForm.jsx',
    'src/react/users/UserDeleteDialog.jsx',
    'src/react/users/RoleForm.jsx',
    'src/react/users/RoleDeleteDialog.jsx',
    'src/react/users/RolesPanel.jsx',
    'src/react/users/PermissionsMatrix.jsx',
  ];
  const combined = files.map(read).join('\n');

  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter|<Routes\b|<Route\b/,
  );
}

function testAdminApisContract() {
  const apiSource = read('src/utils/apis.js');

  for (const apiName of ['usersApi', 'rolesApi', 'modulesApi']) {
    assert.match(apiSource, new RegExp(`export const ${apiName} = \\{`));
  }

  for (const method of ['list', 'create', 'update', 'remove']) {
    assert.match(apiSource, new RegExp(`usersApi[\\s\\S]*async ${method}\\(`));
  }

  for (const method of [
    'list',
    'create',
    'update',
    'remove',
    'getPermissions',
    'updatePermissions',
  ]) {
    assert.match(apiSource, new RegExp(`rolesApi[\\s\\S]*async ${method}\\(`));
  }

  assert.match(apiSource, /modulesApi[\s\S]*async list\(/);
  assert.match(apiSource, /apiFetch\('/);
  assert.doesNotMatch(apiSource, /\bfetch\s*\(/);
  assert.match(apiSource, /categoriesApi[\s\S]*async listAll\(params = \{\}\)/);
}

function testUsersPageContract() {
  const pageSource = read('src/react/pages/UsersPage.jsx');
  const styleSource = read('src/react/pages/UsersPage.module.css');
  const formSource = read('src/react/users/UserForm.jsx');
  const deleteSource = read('src/react/users/UserDeleteDialog.jsx');
  const roleFormSource = read('src/react/users/RoleForm.jsx');
  const roleDeleteSource = read('src/react/users/RoleDeleteDialog.jsx');
  const rolesPanelSource = read('src/react/users/RolesPanel.jsx');
  const matrixSource = read('src/react/users/PermissionsMatrix.jsx');
  const helpersSource = [
    read('src/react/users/userForm.helpers.js'),
    read('src/react/users/usersList.helpers.js'),
    read('src/react/users/roles.helpers.js'),
    read('src/react/users/permissions.helpers.js'),
  ].join('\n');
  const combined = [
    pageSource,
    formSource,
    deleteSource,
    roleFormSource,
    roleDeleteSource,
    rolesPanelSource,
    matrixSource,
    helpersSource,
  ].join('\n');

  assert.match(pageSource, /usersApi\.list/);
  assert.match(formSource, /usersApi\.create/);
  assert.match(formSource, /usersApi\.update/);
  assert.match(deleteSource, /usersApi\.remove/);
  assert.match(roleFormSource, /rolesApi\.create/);
  assert.match(roleFormSource, /rolesApi\.update/);
  assert.match(roleDeleteSource, /rolesApi\.remove/);
  assert.match(matrixSource, /modulesApi\.list/);
  assert.match(matrixSource, /rolesApi\.getPermissions/);
  assert.match(matrixSource, /rolesApi\.updatePermissions/);
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|auth_token/);
  assert.doesNotMatch(combined, /components\/users|users\.modals|users\.state|users\.render/);
  assert.match(pageSource, /Usuarios/);
  assert.match(pageSource, /Roles & Permisos/);
  assert.match(pageSource, /canWrite\('users'\)/);
  assert.match(pageSource, /canUpdate\('users'\)/);
  assert.match(pageSource, /canDelete\('users'\)/);
  assert.match(deleteSource, /No podes eliminar tu propio usuario/);
  assert.match(roleDeleteSource, /El rol administrador no se puede eliminar/);
  assert.match(rolesPanelSource, /disabled=\{protectedRole\}/);
  assert.match(matrixSource, /buildPermissionsPayload\(rows\)/);
  assert.match(pageSource, /fetchMe\(\{ force: true, silent: true \}\)/);
  assert.match(helpersSource, /changeStatus/);
  assert.match(helpersSource, /permissions:\s*rows\.map/);
  assert.match(styleSource, /\.mobileList/);
  assert.match(styleSource, /\.matrixCards/);
  assert.match(styleSource, /@media \(max-width: 680px\)/);
}

function testFormsAndDangerousActions() {
  const formSource = read('src/react/users/UserForm.jsx');
  const formHelperSource = read('src/react/users/userForm.helpers.js');
  const deleteSource = read('src/react/users/UserDeleteDialog.jsx');
  const roleFormSource = read('src/react/users/RoleForm.jsx');
  const roleDeleteSource = read('src/react/users/RoleDeleteDialog.jsx');
  const matrixSource = read('src/react/users/PermissionsMatrix.jsx');

  for (const field of ['fullName', 'email', 'phone', 'password', 'roleId', 'status']) {
    assert.match(formSource, new RegExp(`\\b${field}\\b`));
    assert.match(formHelperSource, new RegExp(`\\b${field}\\b`));
  }

  assert.match(formHelperSource, /0000000000/);
  assert.match(formHelperSource, /password\.length < 8/);
  assert.match(formHelperSource, /mode === 'create'/);

  for (const source of [formSource, deleteSource, roleFormSource, roleDeleteSource, matrixSource]) {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /event\.key === 'Escape'/);
  }

  assert.match(deleteSource, /Accion peligrosa/);
  assert.match(roleDeleteSource, /Accion peligrosa/);
  assert.match(matrixSource, /confirmedSensitiveChange/);
  assert.match(matrixSource, /Confirmo que quiero modificar permisos sensibles/);
}

function testScopeBoundaries() {
  const forbiddenExistingFiles = [
    'apps/backend/src/routes/users.routes.js',
    'apps/client/package.json',
    'apps/admin/package.json',
    'pnpm-lock.yaml',
    'apps/admin/vite.config.js',
    'apps/admin/src/utils/reactViewAdapter.js',
    'apps/admin/src/react/pages/LoginPage.jsx',
    'apps/admin/src/react/pages/DashboardPage.jsx',
    'apps/admin/src/react/pages/ProductsPage.jsx',
    'apps/admin/src/react/pages/CategoriesPage.jsx',
    'apps/admin/src/components/users/users.js',
    'apps/admin/src/styles/users.css',
  ];

  for (const relativePath of forbiddenExistingFiles) {
    assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} should exist`);
  }

  const scriptSource = read('scripts/test.mjs');
  assert.match(scriptSource, /runUsersRolesReactTests/);
  assert.match(scriptSource, /users roles react contract/);
}

export function runUsersRolesReactTests() {
  testUsersRouteIsReactOnly();
  testRouteBoundariesStayIntact();
  testNoReactRouter();
  testAdminApisContract();
  testUsersPageContract();
  testFormsAndDangerousActions();
  testScopeBoundaries();
}
