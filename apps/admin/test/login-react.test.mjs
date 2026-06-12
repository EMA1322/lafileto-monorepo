import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function testLoginRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const loginRoute = source.match(/login:\s*\{[\s\S]*?\n\s*\},\n\s*dashboard:/)?.[0] || '';

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

function testOtherRoutesStayLegacy() {
  const source = read('src/utils/router.js');
  const reactRoutes = ['dashboard', 'products'];
  const expectedRoutes = ['categories', 'users', 'settings', "'not-authorized'"];

  for (const route of reactRoutes) {
    const pattern = new RegExp(`${route}:\\s*\\{[\\s\\S]*?type:\\s*ROUTE_TYPE_REACT`);
    assert.match(source, pattern, `${route} should stay React`);
  }

  for (const route of expectedRoutes) {
    const pattern = new RegExp(`${route}:\\s*\\{[\\s\\S]*?type:\\s*ROUTE_TYPE_LEGACY`);
    assert.match(source, pattern, `${route} should stay legacy`);
  }
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
  testOtherRoutesStayLegacy();
  testNoReactRouter();
  testLoginPageContract();
  testLoginPageStylesContract();
}
