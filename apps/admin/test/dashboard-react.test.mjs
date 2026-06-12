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

function testDashboardRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const dashboardRoute = routeBlock(source, 'dashboard', 'products');

  assert.match(dashboardRoute, /type:\s*ROUTE_TYPE_REACT/, 'dashboard route should be React');
  assert.match(
    dashboardRoute,
    /component:\s*\(\)\s*=>\s*import\(['"]\.\.\/react\/pages\/DashboardPage\.jsx['"]\)/,
    'dashboard route should lazy-load DashboardPage',
  );
  assert.doesNotMatch(
    dashboardRoute,
    /viewHtmlPath|dashboard\.html|dashboard\.css|initDashboard/,
    'dashboard route should not load the legacy fragment',
  );
  assert.match(
    source,
    /if\s*\(isLoginRoute\)\s*\{\s*destroyAdminHeaderIfNeeded\(\);\s*\}\s*else\s*\{\s*await\s+loadAdminHeader\(\);\s*\}/,
    'React protected routes should keep the legacy admin header',
  );
}

function testRouteBoundariesStayIntact() {
  const source = read('src/utils/router.js');
  const loginRoute = routeBlock(source, 'login', 'dashboard');
  const legacyRoutes = [
    ['products', 'categories'],
    ['categories', 'users'],
    ['users', 'settings'],
    ['settings', "'not-authorized'"],
    ["'not-authorized'", null],
  ];

  assert.match(loginRoute, /type:\s*ROUTE_TYPE_REACT/, 'login should stay React');

  for (const [routeName, nextRouteName] of legacyRoutes) {
    const block = routeBlock(source, routeName, nextRouteName);
    assert.match(block, /type:\s*ROUTE_TYPE_LEGACY/, `${routeName} should stay legacy`);
  }
}

function testNoReactRouter() {
  const sourceRoots = [
    'src/utils/router.js',
    'src/react/pages/DashboardPage.jsx',
    'src/react/pages/index.js',
    'package.json',
  ];
  const combined = sourceRoots.map(read).join('\n');

  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter/,
  );
  assert.doesNotMatch(combined, /<Routes\b|<Route\b/);
}

function testDashboardPageContract() {
  const source = read('src/react/pages/DashboardPage.jsx');

  assert.match(source, /apiFetch\('\/dashboard\/summary',\s*\{\s*method:\s*'GET'\s*\}\)/);
  assert.doesNotMatch(source, /\bfetch\s*\(/, 'DashboardPage should not call fetch directly');
  assert.doesNotMatch(source, /localStorage|sessionStorage|auth_token/);
  assert.match(source, /AdminThemeScope/);
  assert.match(source, /Card/);
  assert.match(source, /Badge/);
  assert.match(source, /StateBlock/);
  assert.match(source, /Button/);
  assert.match(source, /VIEW_STATUS\s*=\s*\{[\s\S]*loading[\s\S]*error[\s\S]*empty[\s\S]*success/);
  assert.match(source, /href:\s*['"]#products['"]/);
  assert.match(source, /href:\s*['"]#categories['"]/);
  assert.match(source, /href:\s*['"]#settings['"]/);
  assert.match(source, /canRead/);
  assert.match(source, /canWrite/);
  assert.match(source, /window\.location\.hash\s*=\s*href/);
  assert.match(source, /Todavia no hay actividad para mostrar/);
  assert.doesNotMatch(
    source,
    /Google Maps|mapbox|leaflet|chart\.js|recharts|echarts|recent orders|trending products|timeline fake/i,
  );
}

function testDashboardStylesContract() {
  const source = read('src/react/pages/DashboardPage.module.css');

  assert.match(source, /--admin-react-/, 'styles should use admin React tokens');
  assert.match(source, /#faa718/i, 'styles should preserve La Fileto orange fallback');
  assert.doesNotMatch(source, /\.dashboard\b|\.btn\b|\.card\b|\.badge\b|\.modal\b|\.adminList\b/);
}

function testRunnerRegisteredOnly() {
  const source = read('scripts/test.mjs');

  assert.match(source, /runDashboardReactTests/);
  assert.match(source, /dashboard react contract/);
  assert.doesNotMatch(source, /process\.exit\(0\)/, 'runner should not force a passing exit');
}

export function runDashboardReactTests() {
  testDashboardRouteIsReactOnly();
  testRouteBoundariesStayIntact();
  testNoReactRouter();
  testDashboardPageContract();
  testDashboardStylesContract();
  testRunnerRegisteredOnly();
}
