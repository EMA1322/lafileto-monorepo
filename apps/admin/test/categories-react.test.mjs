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

function testCategoriesRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const categoriesRoute = routeBlock(source, 'categories', 'users');

  assert.match(categoriesRoute, /type:\s*ROUTE_TYPE_REACT/);
  assert.match(categoriesRoute, /import\(['"]\.\.\/react\/pages\/CategoriesPage\.jsx['"]\)/);
  assert.doesNotMatch(categoriesRoute, /viewHtmlPath|categories\.html|categories\.css/);
  assert.doesNotMatch(source, /components\/categories\/categories\.js/);
}

function testRouteBoundariesStayIntact() {
  const source = read('src/utils/router.js');

  for (const [routeName, nextRouteName] of [
    ['login', 'dashboard'],
    ['dashboard', 'products'],
    ['products', 'categories'],
    ['categories', 'users'],
  ]) {
    assert.match(routeBlock(source, routeName, nextRouteName), /type:\s*ROUTE_TYPE_REACT/);
  }

  for (const [routeName, nextRouteName] of [
    ['users', 'settings'],
    ['settings', "'not-authorized'"],
    ["'not-authorized'", null],
  ]) {
    assert.match(routeBlock(source, routeName, nextRouteName), /type:\s*ROUTE_TYPE_LEGACY/);
  }
}

function testNoReactRouter() {
  const files = [
    'src/utils/router.js',
    'src/react/pages/CategoriesPage.jsx',
    'src/react/categories/CategoryForm.jsx',
    'src/react/categories/CategoryDeleteDialog.jsx',
  ];
  const combined = files.map(read).join('\n');

  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter|<Routes\b|<Route\b/,
  );
}

function testCategoriesApiContract() {
  const apiSource = read('src/utils/apis.js');
  const productsSource = read('src/react/pages/ProductsPage.jsx');

  assert.match(apiSource, /export const categoriesApi = \{/);
  assert.match(apiSource, /async listAll\(params = \{\}\)/);
  assert.match(
    apiSource,
    /params:\s*\{\s*\.\.\.params,\s*all:\s*params\.all\s*\?\?\s*1,\s*pageSize:\s*params\.pageSize\s*\?\?\s*100\s*\}/,
  );
  assert.match(apiSource, /async list\(params = \{\}, \{ signal \} = \{\}\)/);
  assert.match(apiSource, /async get\(id\)/);
  assert.match(apiSource, /async create\(payload\)/);
  assert.match(apiSource, /async update\(id, payload\)/);
  assert.match(apiSource, /async toggleActive\(id, active\)/);
  assert.match(
    apiSource,
    /method:\s*['"]PATCH['"][\s\S]*body:\s*\{\s*active:\s*Boolean\(active\)\s*\}/,
  );
  assert.match(apiSource, /async remove\(id\)/);
  assert.doesNotMatch(apiSource, /restore/);
  assert.match(productsSource, /categoriesApi\.listAll/);
}

function testCategoriesPageContract() {
  const pageSource = read('src/react/pages/CategoriesPage.jsx');
  const helperSource = read('src/react/categories/categoriesList.helpers.js');
  const formSource = read('src/react/categories/CategoryForm.jsx');
  const deleteSource = read('src/react/categories/CategoryDeleteDialog.jsx');
  const formHelperSource = read('src/react/categories/categoryForm.helpers.js');
  const combined = `${pageSource}\n${helperSource}\n${formSource}\n${deleteSource}\n${formHelperSource}`;

  assert.match(pageSource, /categoriesApi\.list\(buildCategoriesQuery\(filters\)\)/);
  assert.match(formSource, /categoriesApi\.create/);
  assert.match(formSource, /categoriesApi\.update/);
  assert.match(deleteSource, /categoriesApi\.remove/);
  assert.match(pageSource, /categoriesApi\.toggleActive/);
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|auth_token/);
  assert.doesNotMatch(
    combined,
    /components\/categories|categories\.modals|categories\.state|categories\.render/,
  );
  assert.doesNotMatch(combined, /deletedAt|restoreCategory|categoriesApi\.restore|\/restore/i);
}

function testFieldsValidationAndUi() {
  const pageSource = read('src/react/pages/CategoriesPage.jsx');
  const stylesSource = read('src/react/pages/CategoriesPage.module.css');
  const formSource = read('src/react/categories/CategoryForm.jsx');
  const deleteSource = read('src/react/categories/CategoryDeleteDialog.jsx');
  const formHelperSource = read('src/react/categories/categoryForm.helpers.js');
  const listHelperSource = read('src/react/categories/categoriesList.helpers.js');

  for (const field of ['name', 'imageUrl']) {
    assert.match(formHelperSource, new RegExp(`\\b${field}\\b`));
  }
  for (const field of ['active', 'productCount']) {
    assert.match(listHelperSource, new RegExp(`\\b${field}\\b`));
  }

  assert.match(formHelperSource, /name\.length < 2/);
  assert.match(formHelperSource, /name\.length > 50/);
  assert.match(formHelperSource, /new URL\(value\)/);
  assert.match(formHelperSource, /http:|https:/);
  assert.match(formSource, /role="dialog"/);
  assert.match(formSource, /aria-modal="true"/);
  assert.match(formSource, /event\.key === 'Escape'/);
  assert.match(formSource, /loading=\{pending\}/);
  assert.match(formSource, /preview/);
  assert.match(deleteSource, /role="dialog"/);
  assert.match(deleteSource, /aria-modal="true"/);
  assert.match(deleteSource, /category-delete-confirm/);
  assert.match(deleteSource, /formatProductCount\(category\.productCount\)/);
  assert.match(deleteSource, /fisica/);
  assert.match(deleteSource, /Productos asociados/);
  assert.match(pageSource, /canWrite\('categories'\)/);
  assert.match(pageSource, /canUpdate\('categories'\)/);
  assert.match(pageSource, /canDelete\('categories'\)/);
  assert.match(pageSource, /VIEW_STATUS\.loading/);
  assert.match(pageSource, /VIEW_STATUS\.error/);
  assert.match(pageSource, /VIEW_STATUS\.empty/);
  assert.match(pageSource, /VIEW_STATUS\.success/);
  assert.match(pageSource, /CategoriesTable/);
  assert.match(pageSource, /CategoriesCards/);
  assert.match(stylesSource, /\.mobileList/);
  assert.match(stylesSource, /@media \(max-width: 760px\)/);
}

function testScopeBoundaries() {
  const forbiddenFiles = [
    'apps/backend/src/routes/categories.routes.js',
    'apps/client/package.json',
    'apps/admin/package.json',
    'pnpm-lock.yaml',
    'apps/admin/vite.config.js',
    'apps/admin/src/utils/reactViewAdapter.js',
    'apps/admin/src/react/pages/LoginPage.jsx',
    'apps/admin/src/react/pages/DashboardPage.jsx',
    'apps/admin/src/react/pages/ProductsPage.jsx',
    'apps/admin/src/components/categories/categories.js',
    'apps/admin/src/styles/categories.css',
  ];

  for (const relativePath of forbiddenFiles) {
    assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} should exist`);
  }

  const scriptSource = read('scripts/test.mjs');
  assert.match(scriptSource, /runCategoriesReactTests/);
  assert.match(scriptSource, /categories react contract/);
}

export function runCategoriesReactTests() {
  testCategoriesRouteIsReactOnly();
  testRouteBoundariesStayIntact();
  testNoReactRouter();
  testCategoriesApiContract();
  testCategoriesPageContract();
  testFieldsValidationAndUi();
  testScopeBoundaries();
}
