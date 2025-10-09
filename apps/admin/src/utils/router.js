// ================================
// router.js - ADMIN PANEL (refactor)
// Controla la navegación SPA, autenticación y RBAC (Read)
// ================================

import { renderView } from './renderView.js';
import { isAuthenticated } from './auth.js';
import { showSnackbar } from './snackbar.js';
import {
  ensureRbacLoaded,
  moduleKeyFromHash, // convención única de moduleKey (UI ↔ RBAC ↔ API)
  canRead
} from './rbac.js';
import { uiNotFound } from './ui-templates.js';

// Rutas centralizadas (mantener en sync con /src/components/*)
const routes = {
  login: '/src/components/login/login.html',
  dashboard: '/src/components/dashboard/dashboard.html',
  products: '/src/components/products/products.html',
  categories: '/src/components/categories/categories.html',
  users: '/src/components/users/users.html',
  settings: '/src/components/settings/settings.html', // si no existe, el 404 se encargará
};

/** Scrollea arriba en cada navegación (mejora UX) */
function scrollToTop() {
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
}

/** Renderiza No-Access con CTA dinámico (según permisos) */
async function renderNoAccess() {
  await renderView('/src/components/no-access.html');
  const cta = document.querySelector('#noaccess-cta');
  if (cta) {
    if (canRead('dashboard')) {
      cta.href = '#dashboard';
      cta.textContent = 'Ir al Dashboard';
    } else {
      cta.href = '#login';
      cta.textContent = 'Volver al Inicio de sesión';
    }
  }
}

/** Carga perezosa del header (una sola vez por sesión) */
async function loadAdminHeader() {
  const headerContainer = document.getElementById('admin-header');
  if (!headerContainer) return;

  // Si ya existe contenido, no recargar (performance)
  if (headerContainer.innerHTML.trim() !== '') return;

  try {
    const res = await fetch('/src/components/header/header.html', { cache: 'no-store' });
    headerContainer.innerHTML = await res.text();

    // header.js hace su propio ensureRbacLoaded() y filtrado de menú
    const moduleHeader = await import('../components/header/header.js');
    if (moduleHeader && typeof moduleHeader.initAdminHeader === 'function') {
      moduleHeader.initAdminHeader();
    }
  } catch (err) {
    console.error('Error cargando el header del admin:', err);
  }
}

/** Router principal */
async function router() {
  // Hash normalizado (sin '#', minúsculas)
  const raw = window.location.hash || '#login';
  const hash = raw.replace(/^#/, '').toLowerCase();

  // -------- Guard: autenticación
  if (hash !== 'login' && !isAuthenticated()) {
    window.location.hash = '#login';
    return;
  }

  // -------- Guard: cargar RBAC (una vez por sesión)
  await ensureRbacLoaded();

  // -------- Guard: permiso de lectura (R)
  const moduleKey = moduleKeyFromHash(hash);
  if (hash !== 'login' && !canRead(moduleKey)) {
    await renderNoAccess();
    // Emite snackbar con código estandarizado (sin cambiar texto visible)
    showSnackbar('No autorizado', { type: 'warning', code: 'PERMISSION_DENIED' });
    return;
  }

  // -------- 404 si la ruta no existe
  const path = routes[hash];
  if (!path) {
    const app = document.getElementById('app');
    if (app) app.innerHTML = uiNotFound(hash);
    return;
  }

  // -------- Carga de vista
  try {
    scrollToTop();
    await renderView(path);

    // Import dinámico del JS correspondiente (mismo patrón que ya usás)
    switch (hash) {
      case 'login': {
        // Ocultar header en login
        const header = document.getElementById('admin-header');
        if (header) header.innerHTML = '';
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
        if (mod && typeof mod.initProducts === 'function') mod.initProducts();
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
     /*  case 'settings': {
        await loadAdminHeader();
        try {
          const mod = await import('../components/settings/settings.js');
          if (mod && typeof mod.initSettings === 'function') mod.initSettings();
        } catch {
          // Si no existe el módulo todavía, no rompemos la navegación
        }
        break;
      } */
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
