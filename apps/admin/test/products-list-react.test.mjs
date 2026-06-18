import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function routeBlock(source, routeName, nextRouteName) {
  const start = source.indexOf(`${routeName}: {`);
  assert.notEqual(start, -1, `${routeName} route should exist`);

  const end = nextRouteName
    ? source.indexOf(`${nextRouteName}: {`, start + 1)
    : source.indexOf('\n};', start + 1);
  assert.notEqual(end, -1, `${routeName} route block should have a boundary`);

  return source.slice(start, end);
}

function routeType(source, routeName, nextRouteName) {
  const match = routeBlock(source, routeName, nextRouteName).match(
    /^\s*type:\s*(ROUTE_TYPE_[A-Z]+),/m,
  );
  assert.ok(match, `${routeName} route should declare a route type`);
  return match[1];
}

function testProductsRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const productsRoute = routeBlock(source, 'products', 'categories');

  assert.match(productsRoute, /type:\s*ROUTE_TYPE_REACT/, 'products route should be React');
  assert.match(
    productsRoute,
    /component:\s*\(\)\s*=>\s*import\(['"]\.\.\/react\/pages\/ProductsPage\.jsx['"]\)/,
    'products route should lazy-load ProductsPage',
  );
  assert.doesNotMatch(
    productsRoute,
    /viewHtmlPath|products\.html|products\.css/,
    'products route should not load the legacy fragment',
  );
  assert.doesNotMatch(
    source,
    /components\/products|components\\products|styles\/products\.css|styles\\products\.css/,
    'router should not reference removed Products legacy assets',
  );
}

function testRouteBoundariesStayIntact() {
  const source = read('src/utils/router.js');
  const reactRoutes = [
    ['login', 'dashboard'],
    ['dashboard', 'products'],
    ['products', 'categories'],
    ['categories', 'users'],
    ['users', 'settings'],
    ['settings', "'not-authorized'"],
  ];
  const legacyRoutes = [["'not-authorized'", null]];

  for (const [routeName, nextRouteName] of reactRoutes) {
    assert.equal(routeType(source, routeName, nextRouteName), 'ROUTE_TYPE_REACT');
  }

  for (const [routeName, nextRouteName] of legacyRoutes) {
    assert.equal(routeType(source, routeName, nextRouteName), 'ROUTE_TYPE_LEGACY');
  }
}

function testNoReactRouter() {
  const combined = [
    'src/utils/router.js',
    'src/react/pages/ProductsPage.jsx',
    'src/react/pages/index.js',
    'src/react/products/productsList.helpers.js',
    'package.json',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter/,
  );
  assert.doesNotMatch(combined, /<Routes\b|<Route\b/);
}

function testProductsPageDataContract() {
  const pageSource = read('src/react/pages/ProductsPage.jsx');
  const helperSource = read('src/react/products/productsList.helpers.js');
  const combined = `${pageSource}\n${helperSource}`;

  assert.match(pageSource, /productsApi\.list/, 'ProductsPage should use productsApi.list');
  assert.match(
    pageSource,
    /categoriesApi\.listAll/,
    'ProductsPage should use categoriesApi.listAll',
  );
  assert.doesNotMatch(combined, /\bfetch\s*\(/, 'ProductsPage should not call fetch directly');
  assert.doesNotMatch(combined, /localStorage|sessionStorage|auth_token/);

  for (const param of [
    'q',
    'categoryId',
    'status',
    'hasOffer',
    'orderBy',
    'orderDir',
    'page',
    'pageSize',
  ]) {
    assert.match(combined, new RegExp(`\\b${param}\\b`), `${param} query param should be present`);
  }

  assert.match(
    combined,
    /hasOffer:\s*params\.get\(['"]hasOffer['"]\)\s*\|\|\s*params\.get\(['"]offer['"]\)\s*\|\|\s*['"]all['"]/,
    'legacy offer hash param should remain a temporary compatibility alias for hasOffer',
  );
  assert.match(
    combined,
    /if \(normalized\.hasOffer !== 'all'\) query\.hasOffer = normalized\.hasOffer;/,
    'products API query should use canonical hasOffer',
  );
  assert.doesNotMatch(
    combined,
    /\b(slug|sku|isFeatured)\b|raw\.currency|\bcurrency:\s*raw/,
    'React Products should not depend on removed product fields',
  );
}

function testProductsPageStatesAndUiFoundation() {
  const source = read('src/react/pages/ProductsPage.jsx');
  const styles = read('src/react/pages/ProductsPage.module.css');

  assert.match(source, /VIEW_STATUS\s*=\s*\{[\s\S]*loading[\s\S]*error[\s\S]*empty[\s\S]*success/);
  assert.match(source, /AdminThemeScope/);
  assert.match(source, /Button/);
  assert.match(source, /Badge/);
  assert.match(source, /Input/);
  assert.match(source, /Select/);
  assert.match(source, /StateBlock/);
  assert.match(source, /TableShell/);
  assert.match(source, /TableScroll/);
  assert.match(source, /aria-current=\{currentPage === page \? 'page' : undefined\}/);
  assert.match(styles, /--admin-react-/, 'styles should use admin React tokens');
  assert.doesNotMatch(styles, /\.products\b|\.btn\b|\.card\b|\.badge\b|\.modal\b|\.adminList\b/);
}

function testProductsScopeExclusions() {
  const combined = [
    'src/react/pages/ProductsPage.jsx',
    'src/react/products/productsList.helpers.js',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(combined, /products\.modals|openProductModal|openDeleteModal/);
  assert.doesNotMatch(
    combined,
    /components\/products|components\\products|styles\/products\.css|styles\\products\.css/,
  );
  assert.doesNotMatch(combined, /productsApi\.(create|update|delete|remove|changeStatus)/);
  assert.doesNotMatch(combined, /offersApi\.(create|update|remove)/);
  assert.doesNotMatch(
    combined,
    /mockProducts|fakeProducts|sampleProducts|Lorem ipsum|Google Maps|mapbox|leaflet|chart\.js|recharts|echarts/i,
  );
}

function testRunnerRegistered() {
  const source = read('scripts/test.mjs');

  assert.match(source, /runProductsListReactTests/);
  assert.match(source, /products list react contract/);
}

export function runProductsListReactTests() {
  testProductsRouteIsReactOnly();
  testRouteBoundariesStayIntact();
  testNoReactRouter();
  testProductsPageDataContract();
  testProductsPageStatesAndUiFoundation();
  testProductsScopeExclusions();
  testRunnerRegistered();
}
