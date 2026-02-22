// ========================================================
// ADMIN HEADER MODULE (SPA + RBAC + Drawer + Logout modal)
// ========================================================
//
// - Construye el menú desde un catálogo interno (NAV_MODULES)
// - Renderiza items con atributos RBAC declarativos y aplica RBAC uniforme
// - Resalta ruta activa con aria-current="page"
// - Drawer accesible: abre/cierra, Escape, clic en overlay, focus management
// - Logout seguro: confirmación en modal, limpia auth + RBAC, redirige a #login, toast
//
// Dependencias:
//   - auth.js        → isAuthenticated(), logout()
//   - rbac.js        → ensureRbacLoaded(), moduleKeyFromHash(), applyRBAC()
//   - snackbar.js    → notify()
//   - modals.js      → openModal(), closeModal()
//
// Convención de clases/IDs (ver header.html / header.css):
//   #headerMenuToggle, #headerDrawer, #headerOverlay, #headerNavList, #adminLogoutBtn
//
// ========================================================

import { logout, getCurrentUser } from '@/utils/auth.js';
import { ensureRbacLoaded, moduleKeyFromHash, applyRBAC } from '@/utils/rbac.js';
import notify from '@/utils/notify.js';
import { openModal, closeModal } from '@/utils/modals.js';
import { isFeatureEnabled } from '@/utils/featureFlags.js';
import { getSettingsBrandLogoUrl } from '@/components/settings/settings.js';
import { renderIcon, mountIcons } from '@/utils/icons.js';

// ------------------------------
// Feature flags livianos (build-time/cliente)
// ------------------------------
const FEATURE_SETTINGS = isFeatureEnabled(import.meta.env.VITE_FEATURE_SETTINGS);

// ------------------------------
// Catálogo del menú (orden fijo) + SVG inline
// (Se filtra por feature flags; RBAC visual decide visibilidad)
// ------------------------------
const NAV_MODULES = [
  { key: 'dashboard', title: 'Dashboard', hash: '#dashboard', icon: 'dashboard' },
  { key: 'products', title: 'Productos', hash: '#products', icon: 'products' },
  { key: 'categories', title: 'Categorías', hash: '#categories', icon: 'categories' },
  { key: 'settings', title: 'Configuración', hash: '#settings', icon: 'settings' },
  { key: 'users', title: 'Usuarios', hash: '#users', icon: 'users' },
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
        ${renderIcon(item.icon, 'icon header__nav-icon')}
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
        notify('Sesión cerrada correctamente', 'success', 2400);
      } catch {
        notify('No se pudo cerrar sesión', 'error', 3000);
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
  mountIcons(refs.headerEl);
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
