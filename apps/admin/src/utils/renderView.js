// ================================
// renderView.js - ADMIN PANEL
// Renderiza vistas dinámicamente dentro del SPA
// ================================

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Devuelve el loader estándar con un label opcional. */
export function uiLoader(label = 'Cargando…') {
  const safeLabel = escapeHtml(label);
  return `
    <section class="view-state view-state--loading" role="status" aria-live="polite" aria-atomic="true">
      <div class="view-state__inner view-state__inner--center">
        <span class="view-state__spinner" aria-hidden="true"></span>
        <p class="view-state__text">${safeLabel}</p>
      </div>
    </section>
  `;
}

/** Estado vacío mínimo reutilizable. */
export function uiNotFound(message = 'Sin resultados', title = 'No encontramos esta vista') {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  return `
    <section class="view-state view-state--empty" role="status" aria-live="polite" aria-atomic="true">
      <div class="view-state__inner view-state__inner--center">
        <span class="view-state__icon" aria-hidden="true">📭</span>
        <h2 class="view-state__title">${safeTitle}</h2>
        <p class="view-state__text">${safeMessage}</p>
        <div class="view-state__actions"></div>
      </div>
    </section>
  `;
}

/**
 * Renderiza el contenido HTML en el contenedor principal (#app)
 * @param {string} path - Ruta del archivo HTML a cargar
 */

function isDashboardView(path = '') {
  return String(path).includes('/dashboard/dashboard.html');
}

async function ensureDashboardStylesheet() {
  if (typeof document === 'undefined') return;
  const href = '/src/styles/dashboard.css';
  const existing = document.querySelector(`link[data-dashboard-preload="true"][href="${href}"]`)
    || document.querySelector(`link[rel="stylesheet"][href="${href}"]`);

  if (existing && existing.sheet) return;

  const link = existing || document.createElement('link');
  if (!existing) {
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-dashboard-preload', 'true');
    document.head.appendChild(link);
  }

  await new Promise((resolve) => {
    const done = () => resolve();
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
    window.setTimeout(done, 180);
  });
}

export async function renderView(path) {
  const container = resolveContainer();
  if (!container) {
    console.error('Error: No se encontró el contenedor principal (#main-content/#app)');
    return;
  }

  container.setAttribute('aria-busy', 'true');
  container.innerHTML = uiLoader();

  try {
    if (isDashboardView(path)) {
      await ensureDashboardStylesheet();
    }

    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${path}`);

    const html = await res.text();
    container.innerHTML = html;
    container.setAttribute('data-loaded', 'true');
    container.setAttribute('aria-busy', 'false');
  } catch (error) {
    console.error('Error al cargar la vista:', error);
    container.innerHTML = uiNotFound('No se pudo cargar la vista solicitada.');
    container.setAttribute('aria-busy', 'false');
  }
}

function resolveContainer() {
  if (typeof document === 'undefined') return null;
  const existingMain = document.getElementById('main-content');
  if (existingMain) return existingMain;

  const app = document.getElementById('app');
  if (!app) return null;

  const main = document.createElement('main');
  main.id = 'main-content';
  main.setAttribute('role', 'main');
  main.setAttribute('tabindex', '-1');
  app.innerHTML = '';
  app.appendChild(main);
  return main;
}
