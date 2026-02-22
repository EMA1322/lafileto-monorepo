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
import { getCurrentUser } from '../../utils/auth.js';
import { toast } from '../../utils/toast.js';
import { safeText } from '../../utils/helpers.js';
import { isFeatureEnabled } from '../../utils/featureFlags.js';
import { apiFetch } from '../../utils/api.js';
import { renderIcon, mountIcons } from '../../utils/icons.js';
import { formatRelative, formatShortDateTime, safeParseISO } from '../../utils/dates.js';

// ---------------------------------------------
// Estado interno del módulo (no persistente)
// ---------------------------------------------
const MODULE = {
  firstRender: true, // Para enfocar el título tras la primera carga
  cache: null, // Guarda la última respuesta válida del summary
  isRefreshing: false,
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

  mountIcons(root);

  // 4) Cargar/recargar datos del tablero
  await reload();
}

// ===================================================================
// Carga de datos + estados (loading/empty/error)
// ===================================================================

/** Dispara una recarga completa del tablero (con UI de loading). */
async function reload({ throwOnError = false } = {}) {
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
      await ensureDashboardStylesReady();
      setStatus(content, STATUS.SUCCESS, 'Datos actualizados.');
    }

    if (MODULE.firstRender) {
      MODULE.firstRender = false;
      focusTitle();
    }
  } catch (err) {
    console.error('[dashboard] Error loading data:', err);
    setStatus(content, STATUS.ERROR, resolveErrorMessage(err));
    if (throwOnError) throw err;
  }
}

/** Fetch del summary + validación mínima. */
async function loadDashboardData() {
  const response = await apiFetch('/dashboard/summary', { method: 'GET' });
  const summary = response?.data || {};

  const mode = normalizeMode(summary?.status?.mode);
  const isOpen = resolveIsOpen(mode, summary?.business?.isOpen ?? summary?.status?.isOpen);

  const counts = summary?.counts || {};
  const products = toNumberNonNegative(counts.activeProducts);
  const categories = toNumberNonNegative(counts.activeCategories);
  const activeOffers = toNumberNonNegative(counts.activeOffers);
  const productsWithoutImage = toNumberNonNegative(counts.productsWithoutImage);
  const activityItems = Array.isArray(summary?.activity?.items) ? summary.activity.items : [];
  const nextChangeAt = parseGeneratedAt(summary?.business?.nextChangeAt);
  const offerPercent = toNullablePercent(summary?.insights?.offerPercent);
  const generatedAt = parseGeneratedAt(summary?.meta?.generatedAt);

  return {
    mode,
    isOpen,
    nextChangeAt,
    activityItems,
    insights: {
      offerPercent,
      activeOffers,
      productsWithoutImage,
    },
    generatedAt,
    businessSnapshot: {
      isOpen,
    },
    kpis: { products, categories, onSale: activeOffers },
  };
}

function toNullablePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function parseGeneratedAt(value) {
  if (typeof value !== 'string') return null;
  const parsed = safeParseISO(value);
  return parsed ? parsed.toISOString() : null;
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
  renderHeaderInfo(data);
  renderKpis(data.kpis, data.mode, data.isOpen);
  renderQuickActions();
  renderLowerPanels(data);
}

function renderLowerPanels(data) {
  renderActivityPanel(data.activityItems, data);
  renderBusinessPanel(data.isOpen, data.nextChangeAt);
  renderTipsPanel(data);
  renderInsightsPanel(data.insights);
}

function renderActivityPanel(items, data) {
  const listEl = document.getElementById('dashboard-activity-list');
  const emptyEl = document.getElementById('dashboard-activity-empty');
  if (!listEl || !emptyEl) return;

  const normalizedItems = Array.isArray(items) ? items.slice(0, 5) : [];
  const fallbackItems = buildActivityFallbackItems(data);
  const displayItems = normalizedItems.length > 0 ? normalizedItems : fallbackItems;
  listEl.innerHTML = '';

  if (displayItems.length === 0) {
    listEl.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  const frag = document.createDocumentFragment();
  displayItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = formatActivityItem(item);
    frag.appendChild(li);
  });

  listEl.appendChild(frag);
  listEl.hidden = false;
  emptyEl.hidden = true;
}

function formatActivityItem(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return 'Actividad registrada.';

  const label = String(item.label || item.title || item.message || item.action || '').trim();
  const when = formatShortDateTime(item.createdAt || item.at || item.timestamp);
  const hasWhen = when !== '—';
  if (label && hasWhen) return `${label} (${when})`;
  return label || (hasWhen ? when : '') || 'Actividad registrada.';
}

function buildActivityFallbackItems(data) {
  const fallbackItems = [];
  const generatedAt = formatShortDateTime(data?.generatedAt);
  const isOpen = data?.businessSnapshot?.isOpen;
  const activeOffers = toNumberNonNegative(data?.insights?.activeOffers);

  if (generatedAt !== '—') fallbackItems.push(`Panel actualizado: ${generatedAt}`);
  if (isOpen === true || isOpen === false) {
    fallbackItems.push(`Estado del negocio: ${isOpen ? 'Abierto' : 'Cerrado'}`);
  }
  fallbackItems.push(`Ofertas activas: ${activeOffers}`);

  return fallbackItems.slice(0, 3);
}

function renderBusinessPanel(isOpen, nextChangeAt) {
  const badgeEl = document.getElementById('dashboard-business-badge');
  const nextChangeEl = document.getElementById('dashboard-business-nextchange');
  const settingsBtn = document.querySelector('.dashboard__business-settings');
  if (badgeEl) {
    badgeEl.textContent = isOpen === true ? 'Abierto' : isOpen === false ? 'Cerrado' : '—';
  }
  if (nextChangeEl) {
    const next = formatShortDateTime(nextChangeAt);
    nextChangeEl.textContent = `Próximo cambio: ${next}`;
  }
  if (settingsBtn) {
    settingsBtn.hidden = !FEATURE_SETTINGS;
  }
}

function renderTipsPanel(data) {
  const tipsEl = document.getElementById('dashboard-tips-list');
  if (!tipsEl) return;

  const productsWithoutImage = toNumberNonNegative(data?.insights?.productsWithoutImage);
  const activeOffers = toNumberNonNegative(data?.insights?.activeOffers);
  const isOpen = data?.isOpen;

  const tips = [];
  if (productsWithoutImage > 0) tips.push(`Revisar productos sin imagen (${productsWithoutImage})`);
  if (activeOffers > 0) tips.push(`Revisar ofertas activas (${activeOffers})`);
  if (isOpen === false) tips.push('Revisar horarios de atención');
  if (tips.length === 0) tips.push('Todo en orden por ahora.');

  tipsEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  tips.forEach((tip) => {
    const li = document.createElement('li');
    li.textContent = tip;
    frag.appendChild(li);
  });
  tipsEl.appendChild(frag);
}

function renderInsightsPanel(insights) {
  const offerPercentEl = document.getElementById('dashboard-insights-offerpercent');
  const activeOffersEl = document.getElementById('dashboard-insights-activeoffers');
  const noImageEl = document.getElementById('dashboard-insights-noimage');
  if (offerPercentEl) {
    const offerPercent = insights?.offerPercent;
    offerPercentEl.textContent = `% del catálogo en oferta: ${offerPercent === null ? '—' : `${offerPercent}%`}`;
  }
  if (activeOffersEl) {
    activeOffersEl.textContent = `Ofertas activas: ${toNumberNonNegative(insights?.activeOffers)}`;
  }
  if (noImageEl) {
    noImageEl.textContent = `Productos sin imagen: ${toNumberNonNegative(insights?.productsWithoutImage)}`;
  }
}

function renderHeaderInfo(data) {
  const user = getCurrentUser() || null;
  const userNameEl = document.getElementById('dashboard-user-name');
  const userRoleEl = document.getElementById('dashboard-user-role');
  const updatedEl = document.getElementById('dashboard-last-updated');
  const miniGuideEl = document.getElementById('dashboard-mini-guide');

  const userName = String(user?.name || user?.fullName || user?.username || '').trim() || 'Admin';
  const userRole = String(user?.roleName || user?.role?.name || user?.role || user?.roleId || '').trim() || 'Admin';

  if (userNameEl) userNameEl.textContent = userName;
  if (userRoleEl) userRoleEl.textContent = userRole;

  if (updatedEl) {
    updatedEl.textContent = `Última actualización: ${formatRelative(data.generatedAt)}`;
  }

  if (miniGuideEl) {
    const products = toNumberNonNegative(data?.kpis?.products);
    const categories = toNumberNonNegative(data?.kpis?.categories);
    const onSale = toNumberNonNegative(data?.kpis?.onSale);
    miniGuideEl.textContent = `Hoy tenés ${products} productos activos, ${categories} categorías, ${onSale} ofertas.`;
  }
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
        if (MODULE.isRefreshing) return;
        MODULE.isRefreshing = true;
        setRefreshButtonLoading(true);
        try {
          await reload({ throwOnError: true });
          toast.success('Datos actualizados');
        } catch {
          toast.error('No se pudo actualizar. Reintentá.');
        } finally {
          MODULE.isRefreshing = false;
          setRefreshButtonLoading(false);
        }
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

      const navBtn = t.closest('[data-link]');
      if (navBtn?.dataset.link) {
        window.location.hash = navBtn.dataset.link;
      }
    },
    { passive: true },
  );
}

function setRefreshButtonLoading(isLoading) {
  const refreshBtn = document.getElementById('dashboard-refresh');
  if (!refreshBtn) return;
  refreshBtn.classList.toggle('is-loading', isLoading);
  refreshBtn.disabled = isLoading;
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
  const hasBusiness = data.isOpen !== null;
  const hasInsights = data.insights.offerPercent !== null || data.insights.productsWithoutImage > 0;
  if (noKpis && !hasBusiness && !hasInsights) {
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

async function ensureDashboardStylesReady() {
  const dashboardLink = document.querySelector('link[data-dashboard-style="true"]');
  if (!dashboardLink) return;
  if (dashboardLink.sheet) return;

  await new Promise((resolve) => {
    const done = () => resolve();
    dashboardLink.addEventListener('load', done, { once: true });
    dashboardLink.addEventListener('error', done, { once: true });
    window.setTimeout(done, 180);
  });
}

/** Verifica si la ruta existe en el router actual (listado local). */
function routeExists(hash) {
  return KNOWN_ROUTES.has(String(hash || '').toLowerCase());
}

/** Construye un pequeño ícono SVG (decorativo) según el nombre. */
function buildIcon(name) {
  const iconMap = {
    box: 'box',
    tags: 'tag',
    plus: 'plus',
    gear: 'settings',
  };

  return renderIcon(iconMap[name] || 'dashboard', 'icon', { ariaLabel: '' });
}
