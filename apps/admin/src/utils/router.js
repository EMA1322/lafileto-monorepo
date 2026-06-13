// ================================
// router.js - ADMIN PANEL (refactor)
// Controla la navegación SPA, autenticación y RBAC (Read)
// ================================

import { renderView } from './renderView.js';
import { mountReactView, unmountReactView } from './reactViewAdapter.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
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
let headerRootRef = null;
let headerContainerRef = null;
const ROUTE_TYPE_LEGACY = 'legacy';
const ROUTE_TYPE_REACT = 'react';

// Rutas centralizadas. Las rutas funcionales ya montan React; #not-authorized
// conserva el fragment legacy hasta que se migre en una fase dedicada.
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
    type: ROUTE_TYPE_REACT,
    component: () => import('../react/pages/CategoriesPage.jsx'),
  },
  users: {
    type: ROUTE_TYPE_REACT,
    component: () => import('../react/pages/UsersPage.jsx'),
  },
  settings: {
    type: ROUTE_TYPE_REACT,
    component: () => import('../react/pages/SettingsPage.jsx'),
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
  destroyAdminHeaderIfNeeded();
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

  if (headerRootRef && headerContainerRef === headerContainer) return;

  try {
    if (headerRootRef) {
      destroyAdminHeaderIfNeeded();
    }

    headerContainer.replaceChildren();
    const { default: AdminHeader } = await import('../react/header/AdminHeader.jsx');
    headerRootRef = createRoot(headerContainer);
    headerContainerRef = headerContainer;
    headerRootRef.render(React.createElement(AdminHeader, { featureSettings: FEATURE_SETTINGS }));
  } catch (err) {
    console.error('Error cargando el header React del admin:', err);
  }
}

function destroyAdminHeaderIfNeeded() {
  const headerContainer = document.getElementById('admin-header');
  if (!headerContainer) return;

  if (headerRootRef) {
    headerRootRef.unmount();
  }
  headerRootRef = null;
  headerContainerRef = null;
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

  // -------- Guard: permiso de lectura (R)
  const moduleKey = moduleKeyFromHash(hashRoute);
  if (!isLoginRoute && moduleKey && !canRead(moduleKey)) {
    await renderNoAccess();
    // Emite notificación con código estandarizado (sin cambiar texto visible)
    notify('No autorizado', { type: 'warning', code: 'PERMISSION_DENIED' });
    return;
  }
  // -------- Carga de vista
  try {
    scrollToTop();
    if (routeConfig.type !== ROUTE_TYPE_REACT) {
      throw new Error(`Unsupported legacy route reached after guards: ${hashRoute}`);
    }

    if (isLoginRoute) {
      destroyAdminHeaderIfNeeded();
    } else {
      await loadAdminHeader();
    }
    await renderReactRoute(routeConfig);
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
