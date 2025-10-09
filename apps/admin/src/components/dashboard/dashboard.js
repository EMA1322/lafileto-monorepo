/**
 * MÓDULO: Dashboard (ADMIN)
 * Archivo: /src/components/dashboard/dashboard.js
 * Objetivo: Cargar datos del dashboard (mock JSON), renderizar KPIs, Acciones rápidas (RBAC)
 *           y Actividad reciente. Manejo de estados: loading / empty / error.
 *
 * IMPORTANTE:
 * - En Vite, los archivos dentro de /public/ se sirven desde la raíz → fetch('/data/dashboard.json')
 * - Asegurate de crear /public/data/dashboard.json con el shape definido en la ESPEC.
 *
 * Convenciones:
 * - Nombres de funciones/variables/IDs en inglés.
 * - Comentarios en español (documentación).
 */

import { ensureRbacLoaded, canRead, canWrite, canUpdate, canDelete } from '../../utils/rbac.js';
import { showSnackbar } from '../../utils/snackbar.js';
import { safeText } from '../../utils/helpers.js';

// ---------------------------------------------
// Estado interno del módulo (no persistente)
// ---------------------------------------------
const MODULE = {
  firstRender: true, // Para enfocar el título tras la primera carga
  cache: null        // Guarda la última respuesta válida del JSON
};

// ---------------------------------------------
// Constantes del módulo
// ---------------------------------------------
/** Acciones rápidas base (se filtran por RBAC y rutas existentes) */
const QUICK_ACTIONS = [
  { label: 'Ver productos',     icon: 'box',  link: '#products',   module: 'products',   perm: 'read'  },
  { label: 'Nuevo producto',    icon: 'plus', link: '#products',   module: 'products',   perm: 'write' },
  { label: 'Ver categorías',    icon: 'tags', link: '#categories', module: 'categories', perm: 'read'  },
  { label: 'Nueva categoría',   icon: 'plus', link: '#categories', module: 'categories', perm: 'write' },
  { label: 'Ir a configuración',icon: 'gear', link: '#settings',   module: 'settings',   perm: 'read'  } // oculto si ruta no existe
];

/** Rutas conocidas por el router actual (para ocultar #settings mientras no exista) */
const KNOWN_ROUTES = new Set(['#login', '#dashboard', '#products', '#categories']);
// Cuando implementes settings, agregá '#settings' aquí o expórtalo desde el router.


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
  if (!root) return;

  setLoading(true, 'Cargando datos…');

  try {
    const data = await loadDashboardData();
    MODULE.cache = data;

    renderAll(data);
    setLoading(false, 'Datos actualizados');

    if (MODULE.firstRender) {
      MODULE.firstRender = false;
      focusTitle();
    }
    checkEmptyState(data);
  } catch (err) {
    console.error('[dashboard] Error loading data:', err);
    setError('Ocurrió un error al cargar el tablero. Intentá nuevamente.');
  }
}

/** Fetch del mock (sin cache) + validación mínima. */
async function loadDashboardData() {
  const res = await fetch(`/data/dashboard.json?ts=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // Validación mínima del contrato
  const isOpen = typeof json?.isOpen === 'boolean' ? json.isOpen : null;
  const kpis = json?.kpis || {};
  const recent = Array.isArray(json?.recent) ? json.recent : [];

  const products = toNumberNonNegative(kpis.products);
  const categories = toNumberNonNegative(kpis.categories);
  const onSale = toNumberNonNegative(kpis.onSale);

  return {
    businessName: safeText(json?.businessName || ''),
    isOpen,
    kpis: { products, categories, onSale },
    recent: recent
      .filter(item => item && typeof item === 'object')
      .map(sanitizeRecentItem)
  };
}

function sanitizeRecentItem(item) {
  return {
    type: String(item.type || 'other'),
    title: safeText(item.title || '—'),
    action: safeText(item.action || ''),
    at: String(item.at || '')
  };
}

function toNumberNonNegative(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}


// ===================================================================
// Render
// ===================================================================

/** Renderiza todas las regiones: KPIs, Quick Actions, Recent. */
function renderAll(data) {
  renderKpis(data.kpis, data.isOpen);
  renderQuickActions();
  renderRecent(data.recent);
}

/** KPIs: escribe valores y badge de estado */
function renderKpis(kpis, isOpen) {
  const ids = {
    products: document.getElementById('kpi-products-count'),
    categories: document.getElementById('kpi-categories-count'),
    onSale: document.getElementById('kpi-onsale-count'),
    state: document.getElementById('kpi-isopen-badge')
  };

  if (ids.products)  ids.products.textContent  = kpis.products;
  if (ids.categories)ids.categories.textContent= kpis.categories;
  if (ids.onSale)    ids.onSale.textContent    = kpis.onSale;

  if (ids.state) {
    const state = isOpen === true ? 'open' : isOpen === false ? 'closed' : 'unknown';
    ids.state.dataset.state = state;
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
  const actions = QUICK_ACTIONS.filter(a => {
    if (!routeExists(a.link)) return false;
    switch (a.perm) {
      case 'read':   return canRead(a.module);
      case 'write':  return canWrite(a.module);
      case 'update': return canUpdate(a.module);
      case 'delete': return canDelete(a.module);
      default:       return false;
    }
  });

  if (actions.length === 0) {
    if (emptyMsg) emptyMsg.hidden = false;
    return;
  } else {
    if (emptyMsg) emptyMsg.hidden = true;
  }

  const frag = document.createDocumentFragment();
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'dashboard__quick-btn';
    btn.type = 'button';
    btn.dataset.link = a.link;
    btn.dataset.module = a.module;
    btn.dataset.perm = a.perm;
    btn.setAttribute('aria-label', a.label);

    // Ícono simple por tipo (SVG inline accesible como decorativo)
    btn.innerHTML = `${buildIcon(a.icon)}<span>${safeText(a.label)}</span>`;
    frag.appendChild(btn);
  });

  wrap.appendChild(frag);
}

/** Actividad reciente: lista con badges por tipo y meta de tiempo. */
function renderRecent(list) {
  const container = document.getElementById('dashboard-recent-list');
  const empty = document.querySelector('.dashboard__recent-empty');
  if (!container) return;

  container.innerHTML = '';
  container.setAttribute('aria-busy', String(true));

  if (!list || list.length === 0) {
    if (empty) empty.hidden = false;
    container.setAttribute('aria-busy', String(false));
    return;
  } else {
    if (empty) empty.hidden = true;
  }

  const frag = document.createDocumentFragment();
  list.forEach(item => {
    const el = document.createElement('div');
    el.className = 'dashboard__recent-item';
    el.setAttribute('role', 'listitem');

    const badge = document.createElement('span');
    badge.className = 'dashboard__recent-type';
    badge.textContent = recentTypeLabel(item.type);

    const title = document.createElement('p');
    title.className = 'dashboard__recent-title';
    title.textContent = `${item.title} ${item.action ? `· ${item.action}` : ''}`;

    const meta = document.createElement('span');
    meta.className = 'dashboard__recent-meta';
    meta.textContent = formatTimeAgo(item.at);

    el.appendChild(badge);
    el.appendChild(title);
    el.appendChild(meta);
    frag.appendChild(el);
  });

  container.appendChild(frag);
  container.setAttribute('aria-busy', String(false));
}


// ===================================================================
// Eventos y utilidades de UI/Accesibilidad
// ===================================================================

/** Vincula listeners (delegación) de forma idempotente. */
function mountBindings(root) {
  // Delegación de TODOS los controles del módulo en un solo listener.
  // Ventajas: sin duplicados, y se destruye junto con el root al cambiar de vista.
  root.addEventListener('click', async (ev) => {
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

    // 3) Quick Actions (SPA navigation por data-link)
    const qaBtn = t.closest('.dashboard__quick-btn');
    if (qaBtn?.dataset.link) {
      window.location.hash = qaBtn.dataset.link;
      return;
    }
  }, { passive: true });
}


/** Muestra/oculta estado de carga; actualiza región aria-live. */
function setLoading(flag, message = '') {
  const root = getRoot();
  const sr = document.querySelector('.dashboard__sr-status');
  const recentList = document.getElementById('dashboard-recent-list');
  if (!root) return;

  root.classList.toggle('is-loading', !!flag);
  if (recentList) recentList.setAttribute('aria-busy', String(!!flag));
  if (sr && message) sr.textContent = message;

  // Ocultar error al reiniciar carga
  if (flag) {
    const err = document.querySelector('.dashboard__error');
    if (err) err.hidden = true;
  }
}

/** Activa estado de error. */
function setError(message) {
  const root = getRoot();
  const sr = document.querySelector('.dashboard__sr-status');
  const err = document.querySelector('.dashboard__error');
  if (!root) return;

  root.classList.add('is-error');
  root.classList.remove('is-loading');

  if (sr) sr.textContent = 'Ocurrió un error al cargar el tablero.';
  if (err) {
    const p = err.querySelector('.dashboard__error-text');
    if (p) p.textContent = message;
    err.hidden = false;
  }
}

/** Determina si mostrar estado "empty" (sin KPIs significativos y sin recientes). */
function checkEmptyState(data) {
  const root = getRoot();
  if (!root) return;

  const noKpis = (data.kpis.products + data.kpis.categories + data.kpis.onSale) === 0;
  const noRecent = !Array.isArray(data.recent) || data.recent.length === 0;

  root.classList.toggle('is-empty', noKpis && noRecent);
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

/** Etiqueta visible para badges de "type" en recientes. */
function recentTypeLabel(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'product')  return 'Producto';
  if (t === 'category') return 'Categoría';
  return 'General';
}

/** Formatea un "hace X tiempo" simple (sin dependencias externas). */
function formatTimeAgo(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  const diff = Date.now() - d.getTime();
  const sec = Math.max(Math.floor(diff / 1000), 0);
  if (sec < 60)  return 'ahora';
  const min = Math.floor(sec / 60);
  if (min < 60)  return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)  return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `hace ${days} d`;
  // Fallback breve a fecha local
  return d.toLocaleDateString();
}

