// ========================================================
// ADMIN HEADER MODULE (SPA + RBAC + Drawer + Logout modal)
// ========================================================
//
// - Construye el menú desde un catálogo interno (NAV_MODULES)
// - Renderiza items con atributos RBAC declarativos y aplica RBAC uniforme
// - Resalta ruta activa con aria-current="page"
// - Drawer accesible: abre/cierra, Escape, clic en overlay, focus management
// - Logout seguro: confirmación en modal, limpia auth + RBAC, redirige a #login, snackbar
//
// Dependencias:
//   - auth.js        → isAuthenticated(), logout()
//   - rbac.js        → ensureRbacLoaded(), moduleKeyFromHash(), applyRBAC()
//   - snackbar.js    → showSnackbar()
//   - modals.js      → openModal(), closeModal()
//
// Convención de clases/IDs (ver header.html / header.css):
//   #headerMenuToggle, #headerDrawer, #headerOverlay, #headerNavList, #adminLogoutBtn
//
// ========================================================

import { logout, getCurrentUser } from '@/utils/auth.js';
import { ensureRbacLoaded, moduleKeyFromHash, applyRBAC } from '@/utils/rbac.js';
import { showSnackbar } from '@/utils/snackbar.js';
import { openModal, closeModal } from '@/utils/modals.js';
import { isFeatureEnabled } from '@/utils/featureFlags.js';
import { getSettingsBrandLogoUrl } from '@/components/settings/settings.js';

// ------------------------------
// Feature flags livianos (build-time/cliente)
// ------------------------------
const FEATURE_SETTINGS = isFeatureEnabled(import.meta.env.VITE_FEATURE_SETTINGS);

// ------------------------------
// Catálogo del menú (orden fijo) + SVG inline
// (Se filtra por feature flags; RBAC visual decide visibilidad)
// ------------------------------
const NAV_MODULES = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    hash: '#dashboard',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/>
      </svg>`,
  },
  {
    key: 'products',
    title: 'Productos',
    hash: '#products',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M16 6V4H5a2 2 0 0 0-2 2v10h2V6h11zm3-2h-8v2h8v12H7v2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
      </svg>`,
  },
  {
    key: 'categories',
    title: 'Categorías',
    hash: '#categories',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M3 5h8v6H3V5zm10 0h8v6h-8V5zM3 13h8v6H3v-6zm10 0h8v6h-8v-6z"/>
      </svg>`,
  },
  {
    key: 'settings',
    title: 'Configuración',
    hash: '#settings',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M19.14 12.94a7.96 7.96 0 0 0 .05-.94c0-.32-.02-.63-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.7 7.7 0 0 0-1.63-.94L14.5 2h-5l-.45 2.3a7.7 7.7 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.51 7.82a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.62-.05.94s.02.63.05.94L2.63 13.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.33.64.22l2.39-.96c.5.38 1.04.7 1.63.94l.45 2.3h5l.45-2.3c.59-.24 1.13-.56 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
      </svg>`,
  },
  {
    key: 'users',
    title: 'Usuarios',
    hash: '#users',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.91 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>`,
  },
];

// ------------------------------
// Refs y estado
// ------------------------------
const refs = {
  headerEl: null,
  toggleBtnEl: null,
  drawerEl: null,
  overlayEl: null,
  navListEl: null,
  accountEl: null,
  accountSlotEl: null,
  drawerFooterEl: null,
  userNameEl: null,
  userRoleEl: null,
  logoLinkEl: null,
  logoFallbackIconEl: null,
  logoFallbackTextEl: null,
  logoImageEl: null,
};
const state = {
  bound: false,
  drawerOpen: false,
  cleanupFns: [],
};

const DESKTOP_MQ = window.matchMedia('(min-width: 1024px)');
const BODY_SCROLL_LOCK_DATA_ATTR = 'headerDrawerScrollLock';
const BODY_SCROLL_PREV_OVERFLOW_ATTR = 'headerDrawerPrevOverflow';

function registerCleanup(fn) {
  if (typeof fn === 'function') state.cleanupFns.push(fn);
}

function addListener(target, type, handler, options) {
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(type, handler, options);
  registerCleanup(() => target.removeEventListener(type, handler, options));
}

function setBodyScrollLock(locked) {
  const bodyEl = document.body;
  if (!bodyEl) return;

  if (locked) {
    if (bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR] === 'true') return;
    bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR] = 'true';
    bodyEl.dataset[BODY_SCROLL_PREV_OVERFLOW_ATTR] = bodyEl.style.overflow || '';
    bodyEl.style.overflow = 'hidden';
    return;
  }

  if (bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR] !== 'true') return;
  bodyEl.style.overflow = bodyEl.dataset[BODY_SCROLL_PREV_OVERFLOW_ATTR] || '';
  delete bodyEl.dataset[BODY_SCROLL_LOCK_DATA_ATTR];
  delete bodyEl.dataset[BODY_SCROLL_PREV_OVERFLOW_ATTR];
}

function focusSafeTargetAfterDrawerClose() {
  const activeInsideDrawer = refs.drawerEl?.contains(document.activeElement);
  if (!activeInsideDrawer) return;

  const fallbackTarget = refs.logoLinkEl || document.getElementById('app');
  if (fallbackTarget && typeof fallbackTarget.focus === 'function') {
    fallbackTarget.focus({ preventScroll: true });
  }
}

function reconcileDrawerOnViewportChange() {
  if (!refs.drawerEl || !refs.toggleBtnEl || !refs.overlayEl) return;

  const forceClosed = DESKTOP_MQ.matches;
  if (forceClosed && state.drawerOpen) {
    setDrawer(false);
    focusSafeTargetAfterDrawerClose();
  }

  if (!state.drawerOpen) {
    refs.drawerEl.classList.remove('is-open');
    refs.overlayEl.hidden = true;
    refs.toggleBtnEl.setAttribute('aria-expanded', 'false');
    setBodyScrollLock(false);
  }
}

function resetRefs() {
  Object.keys(refs).forEach((key) => {
    refs[key] = null;
  });
}

function syncRefsFromDOM() {
  refs.headerEl = document.querySelector('header.header');
  refs.toggleBtnEl = document.getElementById('headerMenuToggle');
  refs.drawerEl = document.getElementById('headerDrawer');
  refs.overlayEl = document.getElementById('headerOverlay');
  refs.navListEl = document.getElementById('headerNavList');
  refs.accountEl = refs.headerEl?.querySelector('[data-header-account]') || null;
  refs.accountSlotEl = refs.headerEl?.querySelector('.header__account-slot') || null;
  refs.drawerFooterEl = refs.headerEl?.querySelector('.header__drawer-footer') || null;
  refs.userNameEl = refs.headerEl?.querySelector('[data-header-user-name]') || null;
  refs.userRoleEl = refs.headerEl?.querySelector('[data-header-user-role]') || null;
  refs.logoLinkEl = refs.headerEl?.querySelector('.header__logo[href="#dashboard"]') || null;
  refs.logoFallbackIconEl = refs.logoLinkEl?.querySelector('.header__logo-icon') || null;
  refs.logoFallbackTextEl = refs.logoLinkEl?.querySelector('.header__logo-text') || null;
}

function isBoundToCurrentDOM() {
  if (!state.bound) return false;

  if (
    !refs.headerEl?.isConnected ||
    !refs.toggleBtnEl?.isConnected ||
    !refs.drawerEl?.isConnected ||
    !refs.overlayEl?.isConnected ||
    !refs.navListEl?.isConnected
  ) {
    return false;
  }

  return (
    refs.headerEl === document.querySelector('header.header') &&
    refs.toggleBtnEl === document.getElementById('headerMenuToggle') &&
    refs.drawerEl === document.getElementById('headerDrawer') &&
    refs.overlayEl === document.getElementById('headerOverlay') &&
    refs.navListEl === document.getElementById('headerNavList')
  );
}

export function destroyAdminHeader() {
  const cleanupQueue = [...state.cleanupFns].reverse();
  cleanupQueue.forEach((cleanupFn) => {
    cleanupFn();
  });

  state.cleanupFns = [];
  state.bound = false;
  state.drawerOpen = false;
  setBodyScrollLock(false);

  refs.logoImageEl?.remove();
  resetRefs();
}

// Utilidad: focusables visibles
function getFocusableElements(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  return Array.from(container.querySelectorAll(selectors)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

// ------------------------------
// Construye el menú según feature flags + RBAC declarativo
// ------------------------------
function buildMenu() {
  if (!refs.navListEl) return;
  refs.navListEl.innerHTML = '';

  NAV_MODULES.forEach((item) => {
    // 1) Feature flag local: ocultar settings si no está habilitado
    if (item.key === 'settings' && !FEATURE_SETTINGS) return;

    const li = document.createElement('li');
    li.className = 'header__nav-item';
    li.setAttribute('data-module-key', item.key);
    li.setAttribute('data-rbac-module', item.key);

    li.innerHTML = `
      <a
        href="${item.hash}"
        class="header__nav-link"
        data-module-key="${item.key}"
        data-rbac-action="read"
        data-rbac-hide
        hidden
      >
        ${item.svg}
        <span class="header__nav-text">${item.title}</span>
      </a>
    `;

    refs.navListEl.appendChild(li);
  });

  refs.navListEl.querySelectorAll('[data-rbac-module]').forEach((itemEl) => applyRBAC(itemEl));

  updateNavEmptyState();

  // Resaltar activo
  highlightActiveItem();
}

function updateNavEmptyState() {
  const navListEl = document.getElementById('headerNavList');
  if (!navListEl) return;

  const links = [...navListEl.querySelectorAll('.header__nav-link[data-rbac-action]')];
  const visibleLinks = links.filter((linkEl) => {
    if (linkEl.hasAttribute('hidden') || linkEl.getAttribute('aria-hidden') === 'true') return false;
    return linkEl.offsetParent !== null;
  });

  const existingEmptyState = navListEl.querySelector('[data-header-nav-empty]');
  if (visibleLinks.length > 0) {
    existingEmptyState?.remove();
    return;
  }

  if (existingEmptyState) return;

  const emptyStateItemEl = document.createElement('li');
  emptyStateItemEl.className = 'header__nav-empty';
  emptyStateItemEl.setAttribute('data-header-nav-empty', 'true');
  emptyStateItemEl.setAttribute('role', 'status');
  emptyStateItemEl.setAttribute('aria-live', 'polite');
  emptyStateItemEl.innerHTML = `
    <span class="header__nav-empty-title">No navigation items available for your role.</span>
    <a class="header__nav-empty-cta header__nav-link" href="#dashboard">Go to Dashboard</a>
  `;

  navListEl.appendChild(emptyStateItemEl);
}

// ------------------------------
// Resalta el item activo por hash (aria-current="page")
// ------------------------------
function highlightActiveItem() {
  if (!refs.navListEl) return;
  const currentKey = moduleKeyFromHash((location.hash || '#login').slice(1));
  const links = refs.navListEl.querySelectorAll('.header__nav-link');
  links.forEach((a) => {
    const isActive = a.dataset.moduleKey === currentKey;
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ------------------------------
// Abre/cierra el drawer (mobile) + aria-expanded
// ------------------------------
function setDrawer(open) {
  state.drawerOpen = Boolean(open);
  if (!refs.drawerEl || !refs.toggleBtnEl || !refs.overlayEl) return;

  refs.drawerEl.classList.toggle('is-open', state.drawerOpen);
  refs.overlayEl.hidden = !state.drawerOpen;
  refs.toggleBtnEl.setAttribute('aria-expanded', String(state.drawerOpen));
  setBodyScrollLock(state.drawerOpen);

  if (state.drawerOpen) {
    const first = getFocusableElements(refs.drawerEl)[0];
    requestAnimationFrame(() => (first ? first.focus() : refs.drawerEl.focus()));
  }
}
function toggleDrawer() {
  setDrawer(!state.drawerOpen);
}

// ESC + focus-trap dentro del drawer abierto
function handleKeydown(e) {
  if (!state.drawerOpen) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    setDrawer(false);
    return;
  }
  if (e.key === 'Tab') {
    const focusables = getFocusableElements(refs.drawerEl);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
      return;
    }
  }
}

// ------------------------------
// Logout con confirmación en modal
// ------------------------------
function handleLogout() {
  const html = `
    <div>
      <p>¿Seguro que querés cerrar sesión?</p>
      <div style="display:flex; gap:.5rem; justify-content:flex-end; margin-top:1rem;">
        <button class="btn btn-secondary" data-close-modal>Cancelar</button>
        <button id="confirmLogoutBtn" class="btn">Cerrar sesión</button>
      </div>
    </div>
  `;
  openModal(html, '#confirmLogoutBtn');

  const confirmBtn = document.getElementById('confirmLogoutBtn');
  if (confirmBtn) {
    const onConfirm = async () => {
      try {
        confirmBtn.disabled = true;
        await logout();
        closeModal();
        showSnackbar('Sesión cerrada correctamente', 'success', 2400);
      } catch {
        showSnackbar('No se pudo cerrar sesión', 'error', 3000);
        confirmBtn.disabled = false;
      } finally {
        confirmBtn.removeEventListener('click', onConfirm);
      }
    };
    confirmBtn.addEventListener('click', onConfirm);
  }
}

// Delegación: cerrar drawer al navegar (mobile)
function onNavClick(e) {
  const anchor = e.target.closest('a.header__nav-link');
  if (!anchor) return;
  if (window.matchMedia('(max-width: 767.98px)').matches) setDrawer(false);
}

function showBrandFallback() {
  refs.logoFallbackIconEl?.removeAttribute('hidden');
  refs.logoFallbackTextEl?.removeAttribute('hidden');
  refs.logoImageEl?.remove();
  refs.logoImageEl = null;
}

function renderBrandLogo() {
  if (!refs.logoLinkEl) return;

  const logoUrl = getSettingsBrandLogoUrl();
  if (!logoUrl) {
    showBrandFallback();
    return;
  }

  if (!refs.logoImageEl) {
    const brandImage = document.createElement('img');
    brandImage.className = 'header__brand-logo';
    brandImage.alt = 'Admin brand logo';
    brandImage.loading = 'eager';
    brandImage.decoding = 'async';

    brandImage.addEventListener('error', () => {
      showBrandFallback();
    });

    refs.logoImageEl = brandImage;
  }

  refs.logoFallbackIconEl?.setAttribute('hidden', 'true');
  refs.logoFallbackTextEl?.setAttribute('hidden', 'true');
  refs.logoImageEl.src = logoUrl;

  if (!refs.logoImageEl.isConnected) {
    refs.logoLinkEl.prepend(refs.logoImageEl);
  }
}

function getUserRoleLabel(user) {
  const roleValue = user?.roleName || user?.role?.name || user?.role || user?.roleId || '';
  return String(roleValue || '').trim();
}

function renderAccountInfo() {
  if (!refs.userNameEl || !refs.userRoleEl) return;

  const user = getCurrentUser() || null;
  const nameValue = user?.name || user?.fullName || user?.username || user?.email || '';
  const roleValue = getUserRoleLabel(user);

  refs.userNameEl.textContent = String(nameValue || '').trim() || 'User';
  refs.userRoleEl.textContent = roleValue || '—';
}

function placeAccountBlock() {
  if (!refs.accountEl || !refs.accountSlotEl || !refs.drawerFooterEl) return;
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  const target = isDesktop ? refs.accountSlotEl : refs.drawerFooterEl;
  if (refs.accountEl.parentElement !== target) {
    target.appendChild(refs.accountEl);
  }
}

// ------------------------------
// API pública de inicialización
// ------------------------------
export async function initAdminHeader() {
  syncRefsFromDOM();

  if (isBoundToCurrentDOM()) return;
  if (state.bound) {
    destroyAdminHeader();
    syncRefsFromDOM();
  }

  await ensureRbacLoaded();

  if (!refs.headerEl || !refs.toggleBtnEl || !refs.drawerEl || !refs.overlayEl || !refs.navListEl) {
    console.error('[Header] Faltan nodos requeridos. Ver header.html');
    return;
  }

  // Construir menú según RBAC + flags
  buildMenu();
  renderAccountInfo();
  placeAccountBlock();
  renderBrandLogo();

  if (!state.bound) {
    // Toggle
    const toggleFn = () => toggleDrawer();
    addListener(refs.toggleBtnEl, 'click', toggleFn);

    // Overlay
    const overlayFn = () => setDrawer(false);
    addListener(refs.overlayEl, 'click', overlayFn);

    // Esc + focus-trap
    const keyFn = (e) => handleKeydown(e);
    addListener(document, 'keydown', keyFn);

    // Delegación navegación
    const navFn = (e) => onNavClick(e);
    addListener(refs.navListEl, 'click', navFn);

    // Delegación logout
    const clickDelegate = (e) => {
      const logoutBtn = e.target.closest('[data-action="logout"]');
      if (logoutBtn) {
        if (state.drawerOpen) setDrawer(false);
        handleLogout();
      }
    };
    addListener(refs.headerEl, 'click', clickDelegate);

    // Resaltar activo ante cambios de hash
    const onHash = () => {
      highlightActiveItem();
      updateNavEmptyState();
    };
    addListener(window, 'hashchange', onHash);

    const onBrandLogoUpdate = () => renderBrandLogo();
    addListener(document, 'admin:settings-brand-logo-updated', onBrandLogoUpdate);

    const onViewportChange = () => reconcileDrawerOnViewportChange();
    if (typeof DESKTOP_MQ.addEventListener === 'function') {
      addListener(DESKTOP_MQ, 'change', onViewportChange);
    } else if (typeof DESKTOP_MQ.addListener === 'function') {
      DESKTOP_MQ.addListener(onViewportChange);
      registerCleanup(() => DESKTOP_MQ.removeListener(onViewportChange));
      let resizeRafId = 0;
      const onResizeFallback = () => {
        if (resizeRafId) return;
        resizeRafId = requestAnimationFrame(() => {
          resizeRafId = 0;
          onViewportChange();
        });
      };
      addListener(window, 'resize', onResizeFallback, { passive: true });
      addListener(window, 'orientationchange', onResizeFallback);
      registerCleanup(() => {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
      });
    }

    reconcileDrawerOnViewportChange();

    state.bound = true;
  }
}
