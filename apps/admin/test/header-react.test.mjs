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

function testRouterMountsReactHeader() {
  const routerSource = read('src/utils/router.js');

  assert.match(routerSource, /import React from ['"]react['"]/);
  assert.match(routerSource, /import \{ createRoot \} from ['"]react-dom\/client['"]/);
  assert.match(routerSource, /let headerRootRef = null/);
  assert.match(routerSource, /let headerContainerRef = null/);
  assert.match(routerSource, /import\(['"]\.\.\/react\/header\/AdminHeader\.jsx['"]\)/);
  assert.match(
    routerSource,
    /React\.createElement\(AdminHeader,\s*\{ featureSettings: FEATURE_SETTINGS \}\)/,
  );
  assert.match(routerSource, /headerRootRef\.unmount\(\)/);
  assert.match(routerSource, /headerContainer\.replaceChildren\(\)/);
  assert.doesNotMatch(routerSource, /headerModuleRef/);
  assert.doesNotMatch(routerSource, /components\/header\/header\.html/);
  assert.doesNotMatch(routerSource, /components\/header\/header\.js/);
  assert.doesNotMatch(routerSource, /styles\/core\/header\.css|header\.css\?url/);
  assert.doesNotMatch(
    routerSource,
    /import\(['"].*components\/(login|dashboard|products|categories|users|settings)\//,
  );
}

function testHeaderRouteContracts() {
  const routerSource = read('src/utils/router.js');

  for (const [routeName, nextRouteName] of [
    ['login', 'dashboard'],
    ['dashboard', 'products'],
    ['products', 'categories'],
    ['categories', 'users'],
    ['users', 'settings'],
    ['settings', "'not-authorized'"],
  ]) {
    assert.equal(routeType(routerSource, routeName, nextRouteName), 'ROUTE_TYPE_REACT');
  }

  assert.equal(routeType(routerSource, "'not-authorized'", null), 'ROUTE_TYPE_LEGACY');
  assert.match(routerSource, /if \(isLoginRoute\) \{\s*destroyAdminHeaderIfNeeded\(\);/);
  assert.match(
    routerSource,
    /async function renderNoAccess\(\) \{\s*destroyAdminHeaderIfNeeded\(\);/,
  );
  assert.match(routerSource, /hashRoute === ['"]settings['"] && !FEATURE_SETTINGS/);
  assert.match(routerSource, /const routeConfig = routes\[hashRoute\]/);
  assert.match(routerSource, /const moduleKey = moduleKeyFromHash\(hashRoute\)/);
  assert.ok(
    routerSource.indexOf('const routeConfig = routes[hashRoute]') <
      routerSource.indexOf('const moduleKey = moduleKeyFromHash(hashRoute)'),
    '404 route lookup should stay before RBAC guard',
  );
}

function testHeaderComponentContract() {
  const componentSource = read('src/react/header/AdminHeader.jsx');
  const drawerSource = read('src/react/header/useHeaderDrawer.js');
  const brandingSource = read('src/react/header/useHeaderBranding.js');
  const brandingHelpersSource = read('src/react/header/headerBranding.helpers.js');
  const dialogFocusTrapSource = read('src/react/hooks/useDialogFocusTrap.js');

  assert.match(componentSource, /data-admin-react-header="true"/);
  assert.match(componentSource, /getVisibleHeaderNavItems/);
  assert.match(componentSource, /canRead/);
  assert.doesNotMatch(componentSource, /applyRBAC/);
  assert.match(componentSource, /aria-current=\{isActive \? ['"]page['"] : undefined\}/);
  assert.match(componentSource, /aria-controls="adminHeaderDrawer"/);
  assert.match(componentSource, /aria-expanded=\{isDrawerOpen\}/);
  assert.match(componentSource, /inert=\{isDrawerOpen \? undefined : ['"]['"]\}/);
  assert.match(componentSource, /tabIndex=\{-1\}/);
  assert.match(
    componentSource,
    /openModal\(modalHtml,\s*['"]#cancelHeaderLogoutBtn['"],\s*['"]Cerrar sesion['"]\)/,
  );
  assert.match(componentSource, /id="cancelHeaderLogoutBtn"/);
  assert.match(componentSource, /logout\(\)/);
  assert.match(componentSource, /getCurrentUser/);
  assert.match(componentSource, /canAccessUserManagement\(getCurrentUser\(\)\?\.roleId\)/);
  assert.match(componentSource, /getIconHref/);
  assert.doesNotMatch(componentSource, /lucide-react/);

  assert.match(drawerSource, /createFocusTrap/);
  assert.match(drawerSource, /event\.key !== ['"]Escape['"]/);
  assert.match(drawerSource, /document\.addEventListener\(['"]keydown['"]/);
  assert.match(drawerSource, /document\.removeEventListener\(['"]keydown['"]/);
  assert.match(drawerSource, /toggleButtonRef\.current\?\.focus/);
  assert.match(drawerSource, /setBodyScrollLock\(true\)/);
  assert.match(drawerSource, /setBodyScrollLock\(false\)/);

  assert.match(dialogFocusTrapSource, /createFocusTrap/);
  assert.match(dialogFocusTrapSource, /escapeDeactivates:\s*false/);
  assert.match(dialogFocusTrapSource, /returnFocusOnDeactivate:\s*false/);
  assert.match(dialogFocusTrapSource, /previousFocusRef/);
  assert.match(dialogFocusTrapSource, /event\.key !== ['"]Escape['"]/);

  const modalsSource = read('src/utils/modals.js');
  assert.match(modalsSource, /modalTitleEl\s*=\s*document\.getElementById\(['"]modal-title['"]\)/);
  assert.match(
    modalsSource,
    /openModal\(content = ['"]['"], focusSelector = ['"]#modal-close['"], title = ['"]['"]\)/,
  );
  assert.match(modalsSource, /modalTitleEl\.textContent = String\(title \|\| ['"]Dialogo['"]\)/);
  assert.match(modalsSource, /modalTitleEl\.textContent = ['"]['"]/);

  assert.match(brandingHelpersSource, /admin\.settings\.brand\.logo/);
  assert.match(brandingHelpersSource, /admin:settings-brand-logo-updated/);
  assert.match(brandingSource, /document\.addEventListener\(SETTINGS_BRAND_LOGO_EVENT/);
  assert.match(brandingSource, /getBrandLogoFromEvent\(event\) \|\| readCachedBrandLogo\(\)/);
}

function testNavigationContract() {
  const navSource = read('src/react/header/headerNavigation.helpers.js');
  const componentSource = read('src/react/header/AdminHeader.jsx');

  for (const hash of ['#dashboard', '#products', '#categories', '#users', '#settings']) {
    assert.match(navSource, new RegExp(`hash:\\s*['"]${hash}['"]`));
  }

  assert.doesNotMatch(`${navSource}\n${componentSource}`, /#config|config:\s*\{/);
  assert.match(navSource, /item\.key === ['"]settings['"] && !featureSettings/);
  assert.match(navSource, /item\.key === ['"]users['"] && !canAccessUsers\(\)/);
  assert.match(navSource, /canRead\(item\.key\)/);
  assert.match(navSource, /getActiveHeaderRoute/);
}

function testSingleMainLandmarkContract() {
  const indexSource = fs.readFileSync(path.join(adminRoot, 'index.html'), 'utf8');
  const routerSource = read('src/utils/router.js');
  const renderViewSource = read('src/utils/renderView.js');

  assert.doesNotMatch(indexSource, /<div id="app" role="main">/);
  assert.doesNotMatch(routerSource, /setAttribute\(['"]role['"],\s*['"]main['"]\)/);
  assert.doesNotMatch(renderViewSource, /setAttribute\(['"]role['"],\s*['"]main['"]\)/);

  for (const relativePath of [
    'src/react/pages/LoginPage.jsx',
    'src/react/pages/UsersPage.jsx',
    'src/react/pages/SettingsPage.jsx',
  ]) {
    const source = read(relativePath);
    assert.doesNotMatch(source, /<main\b/);
    assert.doesNotMatch(source, /<\/main>/);
  }
}

function testNoReactRouterOrForbiddenScope() {
  const checkedSources = [
    'src/utils/router.js',
    'src/react/header/AdminHeader.jsx',
    'src/react/header/headerNavigation.helpers.js',
    'src/react/header/adminHeader.helpers.js',
    'src/react/header/headerBranding.helpers.js',
    'src/react/header/useHeaderBranding.js',
    'src/react/header/useHeaderDrawer.js',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(
    checkedSources,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter|<Routes\b|<Route\b/,
  );
  assert.doesNotMatch(checkedSources, /lucide-react|@refinedev|antd|@ant-design/);

  for (const relativePath of [
    'apps/admin/src/react/header/AdminHeader.jsx',
    'apps/admin/src/react/header/headerBranding.helpers.js',
    'apps/admin/src/react/header/headerNavigation.helpers.js',
    'apps/admin/src/react/pages/LoginPage.jsx',
    'apps/admin/src/react/pages/DashboardPage.jsx',
    'apps/admin/src/react/pages/ProductsPage.jsx',
    'apps/admin/src/react/pages/CategoriesPage.jsx',
    'apps/admin/src/react/pages/UsersPage.jsx',
    'apps/admin/src/react/pages/SettingsPage.jsx',
    'apps/admin/package.json',
    'pnpm-lock.yaml',
  ]) {
    assert.ok(
      fs.existsSync(path.join(repoRoot, relativePath)),
      `${relativePath} should remain present`,
    );
  }

  for (const relativePath of [
    'apps/admin/src/components/header/header.js',
    'apps/admin/src/components/header/header.html',
    'apps/admin/src/styles/core/header.css',
  ]) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, relativePath)),
      false,
      `${relativePath} should be removed`,
    );
  }
}

export function runHeaderReactTests() {
  testRouterMountsReactHeader();
  testHeaderRouteContracts();
  testHeaderComponentContract();
  testNavigationContract();
  testSingleMainLandmarkContract();
  testNoReactRouterOrForbiddenScope();
}
