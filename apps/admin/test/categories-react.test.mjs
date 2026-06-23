import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCategoriesQuery,
  normalizeCategory,
  normalizeFilters,
  serializeFiltersToHash,
} from '../src/react/categories/categoriesList.helpers.js';

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
    ['users', 'settings'],
    ['settings', "'not-authorized'"],
  ]) {
    assert.equal(routeType(source, routeName, nextRouteName), 'ROUTE_TYPE_REACT');
  }

  for (const [routeName, nextRouteName] of [["'not-authorized'", null]]) {
    assert.equal(routeType(source, routeName, nextRouteName), 'ROUTE_TYPE_LEGACY');
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

function testCategoriesDataContract() {
  assert.deepEqual(normalizeFilters({ status: 'active' }).status, 'active');
  assert.deepEqual(normalizeFilters({ status: 'inactive' }).status, 'inactive');
  assert.deepEqual(normalizeFilters({ status: 'all' }).status, 'all');
  assert.deepEqual(normalizeFilters({ status: 'archived' }).status, 'all');

  assert.deepEqual(buildCategoriesQuery({ status: 'all' }), {
    orderBy: 'name',
    orderDir: 'asc',
    page: 1,
    pageSize: 10,
  });
  assert.deepEqual(buildCategoriesQuery({ status: 'active' }).status, 'active');
  assert.deepEqual(buildCategoriesQuery({ status: 'inactive' }).status, 'inactive');
  assert.equal(serializeFiltersToHash({ status: 'active' }), '#categories?status=active');
  assert.equal(serializeFiltersToHash({ status: 'inactive' }), '#categories?status=inactive');
  assert.equal(serializeFiltersToHash({ status: 'all' }), '#categories');

  assert.deepEqual(
    normalizeCategory({
      id: 'cat-1',
      name: 'Pastas',
      active: false,
      productCount: 4,
    }),
    {
      id: 'cat-1',
      name: 'Pastas',
      imageUrl: null,
      active: false,
      productCount: 4,
    },
  );
  assert.equal(normalizeCategory({ id: 'cat-2', status: 'inactive' }).active, false);
  assert.equal(normalizeCategory({ id: 'cat-3', status: 'active' }).active, true);
  assert.equal(normalizeCategory({ id: 'cat-4', products_count: '7' }).productCount, 7);
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
  assert.match(formSource, /useDialogFocusTrap/);
  assert.match(formSource, /initialFocus:\s*['"]#category-form-name['"]/);
  assert.match(formSource, /loading=\{pending\}/);
  assert.match(formSource, /preview/);
  assert.match(deleteSource, /role="alertdialog"/);
  assert.match(deleteSource, /aria-modal="true"/);
  assert.match(deleteSource, /initialFocus:\s*['"]#category-delete-cancel['"]/);
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
  assert.match(pageSource, /ListSurface/);
  assert.match(pageSource, /ListSurfaceHeader/);
  assert.match(pageSource, /ListSurfaceFooter/);
  assert.match(pageSource, /ListPagination/);
  assert.match(pageSource, /metaId="categories-meta"/);
  assert.match(pageSource, /CategoriesTable/);
  assert.match(pageSource, /CategoriesCards/);
  assert.match(stylesSource, /\.mobileList/);
  assert.match(stylesSource, /@media \(max-width: 760px\)/);
}

function testScopeBoundaries() {
  const protectedFiles = [
    'apps/backend/src/routes/categories.routes.js',
    'apps/client/package.json',
    'apps/admin/package.json',
    'pnpm-lock.yaml',
    'apps/admin/vite.config.js',
    'apps/admin/src/utils/reactViewAdapter.js',
    'apps/admin/src/react/pages/LoginPage.jsx',
    'apps/admin/src/react/pages/DashboardPage.jsx',
    'apps/admin/src/react/pages/ProductsPage.jsx',
  ];

  for (const relativePath of protectedFiles) {
    assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} should exist`);
  }

  const legacyCategoriesDir = path.join(repoRoot, 'apps/admin/src/components/categories');
  const legacyCategoriesFiles = fs.existsSync(legacyCategoriesDir)
    ? fs.readdirSync(legacyCategoriesDir)
    : [];
  assert.deepEqual(
    legacyCategoriesFiles,
    [],
    'apps/admin/src/components/categories should stay empty',
  );

  const removedLegacyPaths = [
    'apps/admin/src/styles/categories.css',
    'apps/admin/test/categories.categories.test.js',
  ];
  for (const relativePath of removedLegacyPaths) {
    assert.ok(
      !fs.existsSync(path.join(repoRoot, relativePath)),
      `${relativePath} should stay removed`,
    );
  }

  const mainSource = read('src/main.js');
  assert.doesNotMatch(mainSource, /styles\/categories\.css/);

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
  testCategoriesDataContract();
  testFieldsValidationAndUi();
  testScopeBoundaries();
}
