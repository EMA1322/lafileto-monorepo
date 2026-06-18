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

function testSettingsRouteIsReactOnly() {
  const source = read('src/utils/router.js');
  const settingsRoute = routeBlock(source, 'settings', "'not-authorized'");

  assert.equal(routeType(source, 'settings', "'not-authorized'"), 'ROUTE_TYPE_REACT');
  assert.match(settingsRoute, /import\(['"]\.\.\/react\/pages\/SettingsPage\.jsx['"]\)/);
  assert.doesNotMatch(settingsRoute, /viewHtmlPath|settings\.html|settings\.css/);
  assert.doesNotMatch(settingsRoute, /ROUTE_TYPE_LEGACY/);
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

  assert.equal(routeType(source, "'not-authorized'", null), 'ROUTE_TYPE_LEGACY');
}

function testFeatureFlagContract() {
  const routerSource = read('src/utils/router.js');
  const headerNavigationSource = read('src/react/header/headerNavigation.helpers.js');
  const dashboardSource = read('src/react/pages/DashboardPage.jsx');

  assert.match(
    routerSource,
    /const FEATURE_SETTINGS = isFeatureEnabled\(import\.meta\.env\.VITE_FEATURE_SETTINGS\)/,
  );
  assert.match(routerSource, /hashRoute === ['"]settings['"] && !FEATURE_SETTINGS/);
  assert.match(routerSource, /window\.location\.hash = ['"]#dashboard['"]/);
  assert.match(headerNavigationSource, /item\.key === ['"]settings['"] && !featureSettings/);
  assert.match(headerNavigationSource, /canRead\(item\.key\)/);
  assert.match(dashboardSource, /FEATURE_SETTINGS[\s\S]*href:\s*['"]#settings['"]/);
}

function testSettingsCanonicalHashContract() {
  const routerSource = read('src/utils/router.js');
  const headerNavigationSource = read('src/react/header/headerNavigation.helpers.js');
  const dashboardSource = read('src/react/pages/DashboardPage.jsx');
  const rbacSeedSource = read('public/data/rbac_permissions.json');
  const productiveSources = [routerSource, headerNavigationSource, dashboardSource].join('\n');

  assert.match(headerNavigationSource, /key:\s*['"]settings['"][\s\S]*hash:\s*['"]#settings['"]/);
  assert.match(dashboardSource, /href:\s*['"]#settings['"][\s\S]*module:\s*['"]settings['"]/);
  assert.match(rbacSeedSource, /"settings":\s*\{\s*"r":\s*true/);
  assert.doesNotMatch(
    productiveSources,
    /#config|canRead\(['"]config['"]\)|canWrite\(['"]config['"]\)/,
  );
  assert.doesNotMatch(routerSource, /config:\s*\{/);

  const routeConfigIndex = routerSource.indexOf('const routeConfig = routes[hashRoute]');
  const permissionGuardIndex = routerSource.indexOf(
    'const moduleKey = moduleKeyFromHash(hashRoute)',
  );
  assert.ok(routeConfigIndex > -1, 'router should resolve routeConfig');
  assert.ok(permissionGuardIndex > -1, 'router should keep RBAC guard');
  assert.ok(
    routeConfigIndex < permissionGuardIndex,
    'unknown routes such as #config should hit 404 before RBAC',
  );
}

function testSettingsApiContract() {
  const apiSource = read('src/utils/apis.js');
  const settingsApiBlock = apiSource.slice(
    apiSource.indexOf('export const settingsApi'),
    apiSource.indexOf('export const apis'),
  );

  assert.match(settingsApiBlock, /export const settingsApi = \{/);
  assert.match(settingsApiBlock, /async get\(\{ signal \} = \{\}\)/);
  assert.match(settingsApiBlock, /apiFetch\(['"]\/settings['"]/);
  assert.match(settingsApiBlock, /method:\s*['"]GET['"]/);
  assert.match(settingsApiBlock, /async update\(payload\)/);
  assert.match(settingsApiBlock, /method:\s*['"]PUT['"]/);
  assert.match(settingsApiBlock, /redirectOn401:\s*false/g);
  assert.match(settingsApiBlock, /showErrorToast:\s*false/g);
  assert.match(apiSource, /settings:\s*settingsApi/);
  assert.doesNotMatch(settingsApiBlock, /\bfetch\s*\(/);
}

function testNoReactRouterOrLegacyDom() {
  const files = [
    'src/react/pages/SettingsPage.jsx',
    'src/react/settings/SettingsForm.jsx',
    'src/react/settings/BrandingSection.jsx',
    'src/react/settings/ContactSection.jsx',
    'src/react/settings/SocialSection.jsx',
    'src/react/settings/HoursSection.jsx',
    'src/react/settings/PaymentsSection.jsx',
    'src/react/settings/DeliverySection.jsx',
    'src/react/settings/settingsForm.helpers.js',
    'src/react/settings/settingsPayload.helpers.js',
    'src/react/settings/settingsValidation.helpers.js',
  ];
  const combined = files.map(read).join('\n');
  const routerSource = read('src/utils/router.js');

  assert.doesNotMatch(
    `${routerSource}\n${combined}`,
    /react-router-dom|react-router|BrowserRouter|HashRouter|RouterProvider|createBrowserRouter|<Routes\b|<Route\b/,
  );
  assert.doesNotMatch(combined, /\bfetch\s*\(/);
  assert.doesNotMatch(combined, /components\/settings|settings\.html|styles\/settings\.css/);
  assert.doesNotMatch(combined, /localStorage|sessionStorage|auth_token/);
}

function testSettingsLegacyFilesAreRemoved() {
  const legacyFiles = [
    'apps/admin/src/components/settings/settings.js',
    'apps/admin/src/components/settings/settings.html',
    'apps/admin/src/styles/settings.css',
  ];

  for (const relativePath of legacyFiles) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, relativePath)),
      false,
      `${relativePath} should be removed after Settings React migration`,
    );
  }

  const productiveFiles = [
    'src/utils/router.js',
    'src/utils/apis.js',
    'src/react/pages/SettingsPage.jsx',
    'src/react/settings/SettingsForm.jsx',
    'src/react/settings/BrandingSection.jsx',
    'src/react/settings/ContactSection.jsx',
    'src/react/settings/SocialSection.jsx',
    'src/react/settings/HoursSection.jsx',
    'src/react/settings/PaymentsSection.jsx',
    'src/react/settings/DeliverySection.jsx',
    'src/react/settings/settingsForm.helpers.js',
    'src/react/settings/settingsPayload.helpers.js',
    'src/react/settings/settingsSideEffects.js',
    'src/react/settings/settingsValidation.helpers.js',
  ];
  const combined = productiveFiles.map(read).join('\n');

  assert.doesNotMatch(combined, /components\/settings|settings\.html|styles\/settings\.css/);
}

function testSettingsPageContract() {
  const pageSource = read('src/react/pages/SettingsPage.jsx');
  const formSource = read('src/react/settings/SettingsForm.jsx');
  const sideEffectsSource = read('src/react/settings/settingsSideEffects.js');
  const headerBrandingSource = read('src/react/header/headerBranding.helpers.js');

  assert.match(pageSource, /settingsApi\.get/);
  assert.match(pageSource, /settingsApi\.update/);
  assert.match(pageSource, /canRead\('settings'\)/);
  assert.match(pageSource, /canWrite\('settings'\)/);
  assert.match(pageSource, /VIEW_STATUS/);
  assert.match(pageSource, /saving/);
  assert.match(pageSource, /isDirty/);
  assert.match(pageSource, /validateSettingsDraft/);
  assert.match(pageSource, /mapSettingsApiError/);
  assert.match(pageSource, /syncSettingsBranding/);
  assert.match(pageSource, /No tenes permiso para editar/);
  assert.match(formSource, /BrandingSection/);
  assert.match(formSource, /ContactSection/);
  assert.match(formSource, /SocialSection/);
  assert.match(formSource, /HoursSection/);
  assert.match(formSource, /PaymentsSection/);
  assert.match(formSource, /DeliverySection/);
  assert.match(sideEffectsSource, /admin\.settings\.brand\.logo/);
  assert.match(sideEffectsSource, /admin:settings-brand-logo-updated/);
  assert.match(headerBrandingSource, /admin\.settings\.brand\.logo/);
  assert.match(headerBrandingSource, /admin:settings-brand-logo-updated/);
  assert.match(sideEffectsSource, /new CustomEvent/);
  assert.match(sideEffectsSource, /localStorage\.setItem/);
  assert.match(sideEffectsSource, /localStorage\.removeItem/);
}

function testSettingsFieldsAndValidationContract() {
  const payloadSource = read('src/react/settings/settingsPayload.helpers.js');
  const validationSource = read('src/react/settings/settingsValidation.helpers.js');
  const combined = payloadSource + validationSource;

  for (const field of [
    'identity',
    'whatsapp',
    'socialLinks',
    'map',
    'payments',
    'hours',
    'brand',
    'seo',
    'openingHours',
    'override',
    'alert',
  ]) {
    assert.match(combined, new RegExp(`\\b${field}\\b`));
  }

  assert.match(validationSource, /EMAIL_REGEX/);
  assert.match(validationSource, /isValidHttpUrl/);
  assert.match(validationSource, /isValidGoogleMapsEmbed/);
  assert.match(validationSource, /CBU_LENGTH = 22/);
  assert.match(validationSource, /HH_MM_REGEX/);
  assert.match(validationSource, /toMinutes\(slot\.open\) >= toMinutes\(slot\.close\)/);
  assert.match(validationSource, /SEO_TITLE_MAX_LENGTH = 70/);
  assert.match(validationSource, /SEO_DESCRIPTION_MAX_LENGTH = 180/);
  assert.match(validationSource, /normalizeBackendFieldPath/);
  assert.match(payloadSource, /buildSettingsPayload/);
  assert.match(payloadSource, /\.\.\.original/);
}

function testScopeBoundaries() {
  const forbiddenExistingFiles = [
    'apps/backend/src/routes/settings.routes.js',
    'apps/client/src/api/public.js',
    'apps/admin/package.json',
    'pnpm-lock.yaml',
    'apps/admin/vite.config.js',
    'apps/admin/src/utils/reactViewAdapter.js',
    'apps/admin/src/react/pages/LoginPage.jsx',
    'apps/admin/src/react/pages/DashboardPage.jsx',
    'apps/admin/src/react/pages/ProductsPage.jsx',
    'apps/admin/src/react/pages/CategoriesPage.jsx',
    'apps/admin/src/react/pages/UsersPage.jsx',
    'apps/admin/src/react/header/AdminHeader.jsx',
    'apps/admin/src/react/header/headerBranding.helpers.js',
    'apps/admin/src/react/header/headerNavigation.helpers.js',
  ];

  for (const relativePath of forbiddenExistingFiles) {
    assert.ok(fs.existsSync(path.join(repoRoot, relativePath)), `${relativePath} should exist`);
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

  const scriptSource = read('scripts/test.mjs');
  assert.match(scriptSource, /runSettingsReactTests/);
  assert.match(scriptSource, /settings react contract/);
}

export function runSettingsReactTests() {
  testSettingsRouteIsReactOnly();
  testRouteBoundariesStayIntact();
  testFeatureFlagContract();
  testSettingsCanonicalHashContract();
  testSettingsApiContract();
  testNoReactRouterOrLegacyDom();
  testSettingsLegacyFilesAreRemoved();
  testSettingsPageContract();
  testSettingsFieldsAndValidationContract();
  testScopeBoundaries();
}
