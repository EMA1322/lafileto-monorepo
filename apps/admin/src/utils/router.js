// ================================
// router.js - ADMIN PANEL (refactor)
// Controla la navegación SPA, autenticación y RBAC (Read)
// ================================

import { renderView } from './renderView.js';
import { mountReactView, unmountReactView } from './reactViewAdapter.js';
import headerCssUrl from '@/styles/core/header.css?url';
import { ensureStylesheetLoaded } from './styles.js';
import { isAuthenticated, ensureAuthReady, pickHomeRoute, logout } from './auth.js';
import notify from './notify.js';
import { isFeatureEnabled } from './featureFlags.js';
import {
  ensureRbacLoaded,
  moduleKeyFromHash, // convención única de moduleKey (UI ↔ RBAC ↔ API)
  canRead,
} from './rbac.js';
import { uiNotFound } from './ui-templates.js';

const FEATURE_SETTINGS = isFeatureEnabled(import.meta.env.VITE_FEATURE_SETTINGS);
let headerModuleRef = null;
const ROUTE_TYPE_LEGACY = 'legacy';
const ROUTE_TYPE_REACT = 'react';

// Rutas centralizadas (mantener en sync con /src/components/*)
const routes = {
  login: {
    type: ROUTE_TYPE_REACT,
    component: () => import('../react/pages/LoginPage.jsx'),
  },
  dashboard: {
    type: ROUTE_TYPE_REACT,
    component: () => import('../react/pages/DashboardPage.jsx'),
  },
  products: {
    type: ROUTE_TYPE_REACT,
    component: () => import('../react/pages/ProductsPage.jsx'),
  },
  categories: {
    type: ROUTE_TYPE_LEGACY,
    viewHtmlPath: '/src/components/categories/categories.html',
    cssHref: '/src/styles/categories.css',
  },
  users: {
    type: ROUTE_TYPE_LEGACY,
    viewHtmlPath: '/src/components/users/users.html',
    cssHref: '/src/styles/users.css',
  },
  settings: {
    type: ROUTE_TYPE_LEGACY,
    viewHtmlPath: '/src/components/settings/settings.html',
    cssHref: '/src/styles/settings.css',
  },
  'not-authorized': {
    type: ROUTE_TYPE_LEGACY,
    viewHtmlPath: '/src/components/no-access.html',
    cssHref: '/src/styles/no-access.css',
  },
};

/** Scrollea arriba en cada navegación (mejora UX) */
function scrollToTop() {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    window.scrollTo(0, 0);
  }
}

/** Renderiza No-Access con CTA dinámico (según permisos) */
async function renderNoAccess() {
  unmountReactView();
  const routeConfig = routes['not-authorized'];
  await ensureStylesheetLoaded(routeConfig?.cssHref);
  await renderView(routeConfig?.viewHtmlPath || '/src/components/no-access.html');

  const cta = document.querySelector('#noaccess-cta');
  if (cta) {
    if (canRead('dashboard')) {
      cta.href = '#dashboard';
      cta.textContent = 'Ir al Dashboard';
    } else {
      cta.href = '#login';
      cta.textContent = 'Volver al Inicio de sesión';
      if (!cta.dataset.logoutBound) {
        cta.dataset.logoutBound = 'true';
        cta.addEventListener('click', async (event) => {
          event.preventDefault();
          await logout();
        });
      }
    }
  }
}

async function loadAdminHeader() {
  const headerContainer = document.getElementById('admin-header');
  if (!headerContainer) return;

  // Si ya existe contenido, no recargar (performance)
  if (headerContainer.innerHTML.trim() !== '') return;

  try {
    // Header styles are loaded by router to prevent FOUC.
    await ensureStylesheetLoaded(headerCssUrl);
  } catch (err) {
    console.warn('Header stylesheet could not be preloaded. Continuing with fallback render.', err);
  }

  try {
    const res = await fetch('/src/components/header/header.html', { cache: 'no-store' });
    headerContainer.innerHTML = await res.text();

    // header.js hace su propio ensureRbacLoaded() y filtrado de menú
    const moduleHeader = await import('../components/header/header.js');
    headerModuleRef = moduleHeader;
    if (moduleHeader && typeof moduleHeader.initAdminHeader === 'function') {
      await moduleHeader.initAdminHeader();
    }
  } catch (err) {
    console.error('Error cargando el header del admin:', err);
  }
}

function destroyAdminHeaderIfNeeded() {
  const headerContainer = document.getElementById('admin-header');
  if (!headerContainer) return;

  if (headerModuleRef && typeof headerModuleRef.destroyAdminHeader === 'function') {
    headerModuleRef.destroyAdminHeader();
  }
  headerModuleRef = null;
  headerContainer.innerHTML = '';
}

async function loadReactComponent(routeConfig) {
  if (typeof routeConfig.component === 'function') {
    const componentModule = await routeConfig.component();
    return componentModule?.default || componentModule;
  }

  return routeConfig.component;
}

function resolveReactViewContainer() {
  const app = document.getElementById('app');
  const existingMain = document.getElementById('main-content');
  const main = existingMain || document.createElement('main');

  if (!existingMain && !app) {
    throw new Error('React route requires #app or #main-content.');
  }

  if (!existingMain) {
    main.id = 'main-content';
    main.setAttribute('role', 'main');
    main.setAttribute('tabindex', '-1');
    app?.replaceChildren(main);
  }

  const reactMount = document.createElement('div');
  reactMount.setAttribute('data-admin-react-view-root', 'true');
  main.replaceChildren(reactMount);

  return reactMount;
}

async function renderReactRoute(routeConfig) {
  const component = await loadReactComponent(routeConfig);
  if (!component) {
    throw new Error('React route is missing a component.');
  }

  if (routeConfig.cssHref) {
    await ensureStylesheetLoaded(routeConfig.cssHref);
  }

  const container = resolveReactViewContainer();
  mountReactView({
    container,
    component,
    props: routeConfig.props || {},
  });
}

/** Router principal */
async function router() {
  // Hash normalizado (sin '#', minúsculas)
  const raw = window.location.hash || '#login';
  const normalized = raw.replace(/^#/, '');
  const lower = normalized.toLowerCase();
  const [hashPath] = lower.split('?');
  const hashRoute = hashPath || 'login';
  const isLoginRoute = hashRoute === 'login';
  const isNoAccessRoute = hashRoute === 'not-authorized';

  if (isLoginRoute && isAuthenticated()) {
    const ready = await ensureAuthReady({ silent: true });
    if (ready) {
      const next = pickHomeRoute();
      if (next && next !== '#login') {
        window.location.hash = next;
        return;
      }
    }
  }

  // -------- Guard: autenticación
  if (!isLoginRoute && !isAuthenticated()) {
    window.location.hash = '#login';
    return;
  }

  if (!isLoginRoute) {
    const ready = await ensureAuthReady({ silent: true });
    if (!ready) {
      if (!isAuthenticated()) {
        window.location.hash = '#login';
      }
      return;
    }
    await ensureRbacLoaded();
  }

  if (isNoAccessRoute) {
    await renderNoAccess();
    return;
  }

  if (!isLoginRoute && hashRoute === 'settings' && !FEATURE_SETTINGS) {
    window.location.hash = '#dashboard';
    notify('Configuración deshabilitada en este entorno.', {
      type: 'warning',
      code: 'FEATURE_DISABLED',
    });
    return;
  }

  // -------- Guard: permiso de lectura (R)
  const moduleKey = moduleKeyFromHash(hashRoute);
  if (!isLoginRoute && moduleKey && !canRead(moduleKey)) {
    await renderNoAccess();
    // Emite notificación con código estandarizado (sin cambiar texto visible)
    notify('No autorizado', { type: 'warning', code: 'PERMISSION_DENIED' });
    return;
  }

  // -------- 404 si la ruta no existe
  const routeConfig = routes[hashRoute];
  if (!routeConfig) {
    unmountReactView();
    const app = document.getElementById('app');
    if (app) {
      const message = hashRoute ? `La ruta #${hashRoute} no existe.` : undefined;
      app.innerHTML = uiNotFound(message);
    }
    return;
  }

  // -------- Carga de vista
  try {
    scrollToTop();
    if (routeConfig.type === ROUTE_TYPE_REACT) {
      if (isLoginRoute) {
        destroyAdminHeaderIfNeeded();
      } else {
        await loadAdminHeader();
      }
      await renderReactRoute(routeConfig);
      return;
    }

    unmountReactView();
    await ensureStylesheetLoaded(routeConfig.cssHref);
    await renderView(routeConfig.viewHtmlPath);

    // Import dinámico del JS correspondiente (mismo patrón que ya usás)
    switch (hashRoute) {
      case 'login': {
        // Ocultar header en login
        destroyAdminHeaderIfNeeded();
        const mod = await import('../components/login/login.js');
        if (mod && typeof mod.initLogin === 'function') mod.initLogin();
        break;
      }
      case 'dashboard': {
        await loadAdminHeader();
        const mod = await import('../components/dashboard/dashboard.js');
        if (mod && typeof mod.initDashboard === 'function') mod.initDashboard();
        break;
      }
      case 'products': {
        await loadAdminHeader();
        const mod = await import('../components/products/products.js');
        if (mod) {
          if (typeof mod.initModule === 'function') mod.initModule();
          else if (typeof mod.initProducts === 'function') mod.initProducts();
        }
        break;
      }
      case 'categories': {
        await loadAdminHeader();
        const mod = await import('../components/categories/categories.js');
        if (mod && typeof mod.initCategories === 'function') mod.initCategories();
        break;
      }
      case 'users': {
        await loadAdminHeader();
        const mod = await import('../components/users/users.js');
        if (mod && typeof mod.initUsers === 'function') mod.initUsers();
        break;
      }
      case 'settings': {
        await loadAdminHeader();
        const mod = await import('../components/settings/settings.js');
        if (mod && typeof mod.initSettings === 'function') mod.initSettings();
        break;
      }
      default:
        // No-op (cubre futuras rutas)
        break;
    }
  } catch (err) {
    console.error('Error en router:', err);
  }
}

/**
 * initRouter:
 * - Bindea hashchange
 * - Hace el primer render inmediatamente
 */
export function initRouter() {
  window.addEventListener('hashchange', router);
  router(); // primer render
}
