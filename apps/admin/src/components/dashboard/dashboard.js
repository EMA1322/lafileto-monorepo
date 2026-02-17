/**
 * MÓDULO: Dashboard (ADMIN)
 * Archivo: /src/components/dashboard/dashboard.js
 * Objetivo: Cargar datos del dashboard (API summary), renderizar KPIs y Acciones rápidas (RBAC)
 *           sin dependencia de actividad reciente tras remover auditoría. Manejo de estados: loading / empty / error.
 *
 * IMPORTANTE:
 * - Fuente de datos: GET /api/v1/dashboard/summary (vía apiFetch)
 *
 * Convenciones:
 * - Nombres de funciones/variables/IDs en inglés.
 * - Comentarios en español (documentación).
 */

import { ensureRbacLoaded, canRead, canWrite, canUpdate, canDelete } from '../../utils/rbac.js';
import { showSnackbar } from '../../utils/snackbar.js';
import { safeText } from '../../utils/helpers.js';
import { isFeatureEnabled } from '../../utils/featureFlags.js';
import { apiFetch } from '../../utils/api.js';

// ---------------------------------------------
// Estado interno del módulo (no persistente)
// ---------------------------------------------
const MODULE = {
  firstRender: true, // Para enfocar el título tras la primera carga
  cache: null, // Guarda la última respuesta válida del summary
};

const FEATURE_SETTINGS = isFeatureEnabled(import.meta.env.VITE_FEATURE_SETTINGS);
const STATUS = {
  LOADING: 'loading',
  ERROR: 'error',
  EMPTY: 'empty',
  SUCCESS: 'success',
};

// ---------------------------------------------
// Constantes del módulo
// ---------------------------------------------
/** Acciones rápidas base (se filtran por RBAC y rutas existentes) */
const QUICK_ACTIONS = [
  { label: 'Ver productos', icon: 'box', link: '#products', module: 'products', perm: 'read' },
  { label: 'Nuevo producto', icon: 'plus', link: '#products', module: 'products', perm: 'write' },
  {
    label: 'Ver categorías',
    icon: 'tags',
    link: '#categories',
    module: 'categories',
    perm: 'read',
  },
  {
    label: 'Nueva categoría',
    icon: 'plus',
    link: '#categories',
    module: 'categories',
    perm: 'write',
  },
  ...(FEATURE_SETTINGS
    ? [
        {
          label: 'Ir a configuración',
          icon: 'gear',
          link: '#settings',
          module: 'settings',
          perm: 'read',
        },
      ]
    : []),
];

/** Rutas conocidas por el router actual (para evitar links muertos en quick actions). */
const KNOWN_ROUTES = new Set([
  '#login',
  '#dashboard',
  '#products',
  '#categories',
  ...(FEATURE_SETTINGS ? ['#settings'] : []),
]);

// ===================================================================
// API PÚBLICA
// ===================================================================

/**
 * Punto de entrada del módulo. Idempotente.
 * - Asegura RBAC cargado.
 * - Vincula eventos una sola vez.
 * - Dispara la 1ra carga de datos.
 */
export async function initDashboard() {
  // 1) Obtener el root del módulo (inyectado por renderView)
  const root = getRoot();
  if (!root) {
    console.warn('[dashboard] Root element not found. Did renderView() load dashboard.html?');
    return;
  }

  // 2) Rehidratar RBAC (seguridad) antes de cualquier render
  await ensureRbacLoaded();

  // 3) Vincular eventos UNA sola vez por instancia del root
  //    Al salir de la vista, el DOM se destruye y este flag desaparece.
  if (!root.dataset.bound) {
    mountBindings(root);
    root.dataset.bound = 'true';
  }

  // 4) Cargar/recargar datos del tablero
  await reload();
}

// ===================================================================
// Carga de datos + estados (loading/empty/error)
// ===================================================================

/** Dispara una recarga completa del tablero (con UI de loading). */
async function reload() {
  const root = getRoot();
  const content = getContent();
  if (!root) return;

  setStatus(content, STATUS.LOADING, 'Cargando datos del panel…');

  try {
    const data = await loadDashboardData();
    MODULE.cache = data;

    renderAll(data);
    checkEmptyState(content, data);

    if (content?.dataset.status === STATUS.EMPTY) {
      announceStatus('No hay datos para mostrar en el panel.');
    } else {
      setStatus(content, STATUS.SUCCESS, 'Datos actualizados.');
    }

    if (MODULE.firstRender) {
      MODULE.firstRender = false;
      focusTitle();
    }
  } catch (err) {
    console.error('[dashboard] Error loading data:', err);
    setStatus(content, STATUS.ERROR, resolveErrorMessage(err));
  }
}

/** Fetch del summary + validación mínima. */
async function loadDashboardData() {
  const response = await apiFetch('/dashboard/summary', { method: 'GET' });
  const summary = response?.data || {};

  const mode = normalizeMode(summary?.status?.mode);
  const isOpen = resolveIsOpen(mode, summary?.status?.isOpen);

  const counts = summary?.counts || {};
  const products = toNumberNonNegative(counts.activeProducts);
  const categories = toNumberNonNegative(counts.activeCategories);
  const onSale = toNumberNonNegative(counts.activeOffers);

  return {
    mode,
    isOpen,
    kpis: { products, categories, onSale }, // Auditoría eliminada: sin colección de actividad
  };
}

function normalizeMode(mode) {
  const normalized = String(mode || '').trim().toUpperCase();
  if (normalized === 'FORCE_OPEN' || normalized === 'FORCE_CLOSED' || normalized === 'AUTO') {
    return normalized;
  }
  return 'AUTO';
}

function resolveIsOpen(mode, isOpen) {
  if (mode === 'FORCE_OPEN') return true;
  if (mode === 'FORCE_CLOSED') return false;
  return typeof isOpen === 'boolean' ? isOpen : null;
}

function toNumberNonNegative(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

// ===================================================================
// Render
// ===================================================================

/** Renderiza KPIs y accesos rápidos; sin bloques de auditoría. */
function renderAll(data) {
  renderKpis(data.kpis, data.mode, data.isOpen);
  renderQuickActions(); // Auditoría eliminada: ya no se pinta actividad reciente
}

/** KPIs: escribe valores y badge de estado */
function renderKpis(kpis, mode, isOpen) {
  const ids = {
    products: document.getElementById('kpi-products-count'),
    categories: document.getElementById('kpi-categories-count'),
    onSale: document.getElementById('kpi-onsale-count'),
    state: document.getElementById('kpi-isopen-badge'),
  };

  if (ids.products) ids.products.textContent = kpis.products;
  if (ids.categories) ids.categories.textContent = kpis.categories;
  if (ids.onSale) ids.onSale.textContent = kpis.onSale;

  if (ids.state) {
    const state = isOpen === true ? 'open' : isOpen === false ? 'closed' : 'unknown';
    ids.state.dataset.state = state;
    ids.state.dataset.mode = mode;
    ids.state.textContent = state === 'open' ? 'Abierto' : state === 'closed' ? 'Cerrado' : '—';
  }
}

/** Quick Actions: filtra por RBAC y existencia de ruta; si no hay, muestra mensaje vacío. */
function renderQuickActions() {
  const wrap = document.getElementById('dashboard-quick-actions');
  const emptyMsg = document.querySelector('.dashboard__quick-empty');
  if (!wrap) return;

  // Limpiar
  wrap.innerHTML = '';

  // Filtrado por RBAC y existencia de ruta
  const actions = QUICK_ACTIONS.filter((a) => {
    if (!routeExists(a.link)) return false;
    switch (a.perm) {
      case 'read':
        return canRead(a.module);
      case 'write':
        return canWrite(a.module);
      case 'update':
        return canUpdate(a.module);
      case 'delete':
        return canDelete(a.module);
      default:
        return false;
    }
  });

  if (actions.length === 0) {
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  } else {
    if (emptyMsg) emptyMsg.hidden = true;
  }

  const frag = document.createDocumentFragment();
  actions.forEach((a) => {
    const item = document.createElement('li');
    item.className = 'dashboard__quick-item';

    const btn = document.createElement('button');
    btn.className = 'dashboard__quick-btn btn btn--outline';
    btn.type = 'button';
    btn.dataset.link = a.link;
    btn.dataset.module = a.module;
    btn.dataset.perm = a.perm;
    btn.setAttribute('aria-label', a.label);

    // Ícono simple por tipo (SVG inline accesible como decorativo)
    btn.innerHTML = `${buildIcon(a.icon)}<span>${safeText(a.label)}</span>`;
    item.appendChild(btn);
    frag.appendChild(item);
  });

  wrap.appendChild(frag);
}

// ===================================================================
// Eventos y utilidades de UI/Accesibilidad
// ===================================================================

/** Vincula listeners (delegación) de forma idempotente. */
function mountBindings(root) {
  // Delegación de TODOS los controles del módulo en un solo listener.
  // Ventajas: sin duplicados, y se destruye junto con el root al cambiar de vista.
  root.addEventListener(
    'click',
    async (ev) => {
      const t = ev.target instanceof Element ? ev.target : null;
      if (!t) return;

      // 1) Botón: Actualizar
      if (t.closest('#dashboard-refresh')) {
        await reload();
        // Opcional: si snackbar no existe en este build, el operador ?. evita errores.
        showSnackbar?.('Dashboard actualizado', 'success', 1800);
        return;
      }

      // 2) Botón: Reintentar (estado de error)
      if (t.closest('#dashboard-retry')) {
        reload();
        return;
      }

      if (t.closest('#dashboard-empty-reload')) {
        reload();
        return;
      }

      // 3) Quick Actions (SPA navigation por data-link)
      const qaBtn = t.closest('.dashboard__quick-btn');
      if (qaBtn?.dataset.link) {
        window.location.hash = qaBtn.dataset.link;
        return;
      }
    },
    { passive: true },
  );
}

function setStatus(content, status, message = '') {
  if (!content) return;
  content.dataset.status = status;
  content.classList.toggle('is-loading', status === STATUS.LOADING);
  content.classList.toggle('has-error', status === STATUS.ERROR);
  content.classList.toggle('is-empty', status === STATUS.EMPTY);
  content.classList.toggle('has-success', status === STATUS.SUCCESS);
  content.setAttribute('aria-busy', status === STATUS.LOADING ? 'true' : 'false');

  const loadingState = document.getElementById('dashboard-loading');
  const errorState = document.getElementById('dashboard-error');
  const emptyState = document.getElementById('dashboard-empty');
  const successState = document.getElementById('dashboard-success');

  if (loadingState) loadingState.hidden = status !== STATUS.LOADING;
  if (errorState) errorState.hidden = status !== STATUS.ERROR;
  if (emptyState) emptyState.hidden = status !== STATUS.EMPTY;
  if (successState) successState.hidden = status !== STATUS.SUCCESS;

  if (status === STATUS.ERROR) {
    const errorText = document.querySelector('.dashboard__error-text');
    if (errorText) errorText.textContent = message || 'Ocurrió un error al cargar el panel.';
  }

  announceStatus(message);
}

/** Determina si mostrar estado "empty" únicamente con KPIs (sin auditoría). */
function checkEmptyState(content, data) {
  if (!content) return;
  const noKpis = data.kpis.products + data.kpis.categories + data.kpis.onSale === 0;
  if (noKpis) {
    setStatus(content, STATUS.EMPTY, 'No hay datos para mostrar en el panel.');
  }
}

/** Mueve el foco al título tras la primera carga (accesibilidad). */
function focusTitle() {
  const title = document.getElementById('dashboard-title');
  if (title && typeof title.focus === 'function') {
    title.setAttribute('tabindex', '-1'); // foco programático seguro
    title.focus({ preventScroll: true });
  }
}

/** Devuelve el root del módulo (sección .dashboard). */
function getRoot() {
  return document.querySelector('.dashboard[data-module="dashboard"], .dashboard');
}

function getContent() {
  return document.querySelector('.dashboard__content');
}

function announceStatus(message) {
  const sr = document.querySelector('.dashboard__sr-status');
  if (sr && message) {
    sr.textContent = message;
  }
}

function resolveErrorMessage(error) {
  if (!error) return 'Ocurrió un error al cargar el tablero. Intentá nuevamente.';
  if (error.status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente para continuar.';
  if (error.status === 403) return 'No tenés permisos para ver el panel general.';
  return error.message || 'Ocurrió un error al cargar el tablero. Intentá nuevamente.';
}

/** Verifica si la ruta existe en el router actual (listado local). */
function routeExists(hash) {
  return KNOWN_ROUTES.has(String(hash || '').toLowerCase());
}

/** Construye un pequeño ícono SVG (decorativo) según el nombre. */
function buildIcon(name) {
  // Íconos simples en línea; aria-hidden para evitar ruido en lectores
  switch (name) {
    case 'box':
      return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 7v10l9 4 9-4V7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
    case 'tags':
      return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M20 10l-8 8-9-9V3h6l11 11z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>`;
    case 'plus':
      return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    case 'gear':
      return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm8 5l2 1-2 1a8 8 0 0 1-1 2l1 2-2 1-2-1a8 8 0 0 1-2 1l-1 2-2-2-2 2-1-2a8 8 0 0 1-2-1l-2 1-2-1 1-2a8 8 0 0 1-1-2l-2-1 2-1a8 8 0 0 1 1-2L2 8l2-1 2 1a8 8 0 0 1 2-1l1-2 2 2 2-2 1 2a8 8 0 0 1 2 1l2-1 2 1-1 2a8 8 0 0 1 1 2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
    default:
      return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`;
  }
}
