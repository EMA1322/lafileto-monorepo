import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(adminRoot, relativePath));
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

function testLoginRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const loginRoute = routeBlock(source, 'login', 'dashboard');

  assert.match(loginRoute, /type:\s*ROUTE_TYPE_REACT/, 'login route should be React');
  assert.match(
    loginRoute,
    /component:\s*\(\)\s*=>\s*import\(['"]\.\.\/react\/pages\/LoginPage\.jsx['"]\)/,
    'login route should lazy-load LoginPage',
  );
  assert.doesNotMatch(
    loginRoute,
    /viewHtmlPath|login\.html|login\.css/,
    'login should not load legacy fragment',
  );
  assert.match(
    source,
    /if\s*\(isLoginRoute\)\s*\{\s*destroyAdminHeaderIfNeeded\(\);\s*\}/,
    'React login should clear the admin header',
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

function testLoginLegacyRemoved() {
  const routerSource = read('src/utils/router.js');
  const legacyReferences = /components\/login|login\.html|login\.js|login\.css|initLogin/;

  assert.doesNotMatch(routerSource, legacyReferences);
  assert.equal(exists('src/components/login/login.html'), false);
  assert.equal(exists('src/components/login/login.js'), false);
  assert.equal(exists('src/styles/login.css'), false);
}

function testNoReactRouter() {
  const sourceRoots = [
    'src/utils/router.js',
    'src/react/pages/LoginPage.jsx',
    'src/react/pages/index.js',
    'package.json',
  ];
  const combined = sourceRoots.map(read).join('\n');

  assert.doesNotMatch(
    combined,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider/,
  );
  assert.doesNotMatch(combined, /<Routes\b|<Route\b/);
}

function testLoginPageContract() {
  const source = read('src/react/pages/LoginPage.jsx');

  assert.match(source, /import\s+\{\s*login\s*\}\s+from\s+['"]@\/utils\/auth\.js['"]/);
  assert.match(source, /await\s+login\(/, 'LoginPage should call the auth helper');
  assert.doesNotMatch(source, /\bfetch\s*\(/, 'LoginPage should not call fetch directly');
  assert.doesNotMatch(source, /apiFetch\s*\(/, 'LoginPage should not call apiFetch directly');
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|auth_token/,
    'LoginPage should not touch session storage directly',
  );
  assert.match(
    source,
    /window\.location\.hash\s*=\s*result\?\.nextRoute\s*\|\|\s*['"]#dashboard['"]/,
  );
  assert.match(source, /AdminThemeScope/);
  assert.match(source, /Button/);
  assert.match(source, /Card/);
  assert.match(source, /Input/);
  assert.match(source, /StateBlock/);
  assert.match(source, /submitting/);
  assert.match(source, /authError/);
}

function testLoginPageStylesContract() {
  const source = read('src/react/pages/LoginPage.module.css');

  assert.match(source, /--admin-react-/, 'styles should use admin React tokens');
  assert.match(source, /#faa718/i, 'styles should preserve La Fileto orange fallback');
  assert.doesNotMatch(source, /\.login\b|\.btn\b|\.card\b|\.badge\b|\.modal\b|\.adminList\b/);
}

export function runLoginReactTests() {
  testLoginRouteIsReactOnly();
  testRouteBoundariesStayIntact();
  testLoginLegacyRemoved();
  testNoReactRouter();
  testLoginPageContract();
  testLoginPageStylesContract();
}
