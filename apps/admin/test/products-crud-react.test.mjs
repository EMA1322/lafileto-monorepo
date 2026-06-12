import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function testProductsPageStillOwnsReactList() {
  const routerSource = read('src/utils/router.js');
  const pageSource = read('src/react/pages/ProductsPage.jsx');

  assert.match(routerSource, /products:\s*\{[\s\S]*type:\s*ROUTE_TYPE_REACT/);
  assert.match(routerSource, /import\(['"]\.\.\/react\/pages\/ProductsPage\.jsx['"]\)/);
  assert.match(pageSource, /productsApi\.list/);
  assert.match(pageSource, /categoriesApi\.listAll/);
  assert.match(pageSource, /serializeFiltersToHash/);
  assert.match(pageSource, /ProductsTable/);
  assert.match(pageSource, /ProductsCards/);
}

function testProductsPageHasVisibleStates() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');

  assert.match(pageSource, /status === VIEW_STATUS\.loading[\s\S]*<StateBlock/);
  assert.match(pageSource, /status === VIEW_STATUS\.error[\s\S]*<StateBlock/);
  assert.match(pageSource, /status === VIEW_STATUS\.empty[\s\S]*<StateBlock/);
  assert.match(pageSource, /hasData[\s\S]*<ProductsTable/);
  assert.match(pageSource, /hasData[\s\S]*<ProductsCards/);
  assert.match(pageSource, /productsApi\.list\(buildProductsQuery\(filters\)\)/);
  assert.match(pageSource, /categoriesApi\.listAll/);
  assert.doesNotMatch(
    pageSource,
    /Promise\.all\(\[[\s\S]*productsApi\.list[\s\S]*categoriesApi\.listAll/,
    'categories failure should not block products rendering',
  );
  assert.match(pageSource, /catch\s*\{\s*setCategories\(\[\]\);?\s*\}/);
}

function testCrudApisAndExclusions() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const formSource = read('src/react/products/ProductForm.jsx');
  const deleteSource = read('src/react/products/ProductDeleteDialog.jsx');
  const helperSource = read('src/react/products/productForm.helpers.js');
  const combined = `${pageSource}\n${formSource}\n${deleteSource}\n${helperSource}`;

  assert.match(formSource, /productsApi\.create/);
  assert.match(formSource, /productsApi\.update/);
  assert.match(deleteSource, /productsApi\.remove/);
  assert.doesNotMatch(combined, /productsApi\.changeStatus/);
  assert.doesNotMatch(combined, /offersApi/);
  assert.doesNotMatch(combined, /products\.modals|openProductModal|openDeleteModal/);
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|auth_token/);
  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter|<Routes\b|<Route\b/,
  );
}

function testFormContract() {
  const formSource = read('src/react/products/ProductForm.jsx');
  const helperSource = read('src/react/products/productForm.helpers.js');
  const combined = `${formSource}\n${helperSource}`;

  for (const field of [
    'name',
    'description',
    'price',
    'stock',
    'imageUrl',
    'categoryId',
    'status',
  ]) {
    assert.match(combined, new RegExp(`\\b${field}\\b`), `${field} should be present`);
  }

  assert.match(helperSource, /PRODUCT_STATUS_OPTIONS/);
  assert.match(
    helperSource,
    /const source = product && typeof product === 'object' \? product : \{\}/,
  );
  assert.match(formSource, /product = null/);
  assert.match(formSource, /createProductFormState\(product\)/);
  assert.match(helperSource, /draft/);
  assert.match(helperSource, /active/);
  assert.match(helperSource, /archived/);
  assert.match(helperSource, /validateProductForm/);
  assert.match(helperSource, /Number\.isFinite\(price\)/);
  assert.match(helperSource, /Number\.isInteger\(stock\)/);
  assert.match(helperSource, /new URL\(imageUrl\)/);
  assert.match(helperSource, /buildProductPayload/);
  assert.match(helperSource, /mapProductApiError/);
  assert.doesNotMatch(combined, /\bslug\b|\bsku\b|\bisFeatured\b/);
  assert.doesNotMatch(combined, /\bcurrency\b/);
}

function testUiFlowAndRbac() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const formSource = read('src/react/products/ProductForm.jsx');
  const deleteSource = read('src/react/products/ProductDeleteDialog.jsx');

  assert.match(pageSource, /canWrite\('products'\)/);
  assert.match(pageSource, /canUpdate\('products'\)/);
  assert.match(pageSource, /canDelete\('products'\)/);
  assert.match(pageSource, /permissions\.canWrite/);
  assert.match(pageSource, /permissions\.canUpdate/);
  assert.match(pageSource, /permissions\.canDelete/);
  assert.match(pageSource, /setFormState\(\{ mode: 'create'/);
  assert.match(pageSource, /setFormState\(\{ mode: 'edit'/);
  assert.match(pageSource, /setDeleteTarget\(product\)/);
  assert.match(pageSource, /syncFilters\(\{ page: 1 \}\)/);
  assert.match(pageSource, /syncFilters\(\{ page: page - 1 \}\)/);
  assert.match(formSource, /role="dialog"/);
  assert.match(formSource, /aria-modal="true"/);
  assert.match(formSource, /event\.key === 'Escape'/);
  assert.match(formSource, /loading=\{pending\}/);
  assert.match(deleteSource, /role="dialog"/);
  assert.match(deleteSource, /aria-modal="true"/);
  assert.match(deleteSource, /event\.key === 'Escape'/);
  assert.match(deleteSource, /loading=\{pending\}/);
}

function testScopeBoundaries() {
  const forbiddenFiles = [
    'package.json',
    '../../package.json',
    '../client/package.json',
    '../backend/package.json',
    'vite.config.js',
    'src/utils/router.js',
    'src/utils/reactViewAdapter.js',
    'src/react/pages/LoginPage.jsx',
    'src/react/pages/DashboardPage.jsx',
    'src/components/products/products.js',
    'src/components/products/products.modals.js',
  ];

  for (const relativePath of forbiddenFiles) {
    const fullPath = path.join(adminRoot, relativePath);
    assert.ok(fs.existsSync(fullPath), `${relativePath} should remain an existing boundary file`);
  }

  const scriptSource = read('scripts/test.mjs');
  assert.match(scriptSource, /runProductsCrudReactTests/);
  assert.match(scriptSource, /products crud react contract/);
}

export function runProductsCrudReactTests() {
  testProductsPageStillOwnsReactList();
  testProductsPageHasVisibleStates();
  testCrudApisAndExclusions();
  testFormContract();
  testUiFlowAndRbac();
  testScopeBoundaries();
}
