// ========================================================
// ADMIN HEADER MODULE (SPA + RBAC + Drawer + Logout modal)
// ========================================================
//
// - Construye el menú desde un catálogo interno (NAV_MODULES)
// - Filtra por permisos (RBAC) usando canRead(moduleKey)
// - Resalta ruta activa con aria-current="page"
// - Drawer accesible: abre/cierra, Escape, clic en overlay, focus management
// - Logout seguro: confirmación en modal, limpia auth + RBAC, redirige a #login, snackbar
//
// Dependencias:
//   - auth.js        → isAuthenticated(), logout()
//   - rbac.js        → ensureRbacLoaded(), canRead(), moduleKeyFromHash()
//   - snackbar.js    → showSnackbar()
//   - modals.js      → openModal(), closeModal()
//
// Convención de clases/IDs (ver header.html / header.css):
//   #headerMenuToggle, #headerDrawer, #headerOverlay, #headerNavList, #adminLogoutBtn
//
// ========================================================

import { logout } from '@/utils/auth.js';
import {
  ensureRbacLoaded,
  canRead,
  moduleKeyFromHash
} from '@/utils/rbac.js';
import { showSnackbar } from '@/utils/snackbar.js';
import { openModal, closeModal } from '@/utils/modals.js';

// ------------------------------
// Feature flags livianos (build-time/cliente)
// ------------------------------
const FEATURE_SETTINGS = false; // ⬅️ Oculta "settings" hasta que exista el módulo

// ------------------------------
// Catálogo del menú (orden fijo) + SVG inline
// (Se filtra por RBAC: solo se renderizan los que tienen Read)
// ------------------------------
const NAV_MODULES = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    hash: '#dashboard',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/>
      </svg>`
  },
  {
    key: 'products',
    title: 'Productos',
    hash: '#products',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M16 6V4H5a2 2 0 0 0-2 2v10h2V6h11zm3-2h-8v2h8v12H7v2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
      </svg>`
  },
  {
    key: 'categories',
    title: 'Categorías',
    hash: '#categories',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M3 5h8v6H3V5zm10 0h8v6h-8V5zM3 13h8v6H3v-6zm10 0h8v6h-8v-6z"/>
      </svg>`
  },
  {
    key: 'settings',
    title: 'Configuración',
    hash: '#settings',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M19.14 12.94a7.96 7.96 0 0 0 .05-.94c0-.32-.02-.63-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.7 7.7 0 0 0-1.63-.94L14.5 2h-5l-.45 2.3a7.7 7.7 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.51 7.82a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.62-.05.94s.02.63.05.94L2.63 13.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.33.64.22l2.39-.96c.5.38 1.04.7 1.63.94l.45 2.3h5l.45-2.3c.59-.24 1.13-.56 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
      </svg>`
  },
  {
    key: 'users',
    title: 'Usuarios',
    hash: '#users',
    svg: `
      <svg viewBox="0 0 24 24" class="header__nav-icon" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.91 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>`
  }
];

// ------------------------------
// Refs y estado
// ------------------------------
const refs = {
  headerEl: null,
  toggleBtnEl: null,
  drawerEl: null,
  overlayEl: null,
  navListEl: null
};
const state = {
  bound: false,
  drawerOpen: false,
  cleanupFns: []
};

// Utilidad: focusables visibles
function getFocusableElements(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return Array.from(container.querySelectorAll(selectors))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}

// ------------------------------
// Construye el menú según RBAC (Read) + feature flag
// ------------------------------
function buildMenu() {
  if (!refs.navListEl) return;
  refs.navListEl.innerHTML = '';

  NAV_MODULES.forEach(item => {
    // 1) Feature flag local: ocultar settings hasta que exista el módulo
    if (item.key === 'settings' && !FEATURE_SETTINGS) return;

    // 2) RBAC Read
    const key = item.key;
    const hasRead = canRead(key) || (key === 'users' && canRead('user')); // compat semilla vieja
    if (!hasRead) return;

    const li = document.createElement('li');
    li.className = 'header__nav-item';
    li.setAttribute('data-module-key', item.key);

    li.innerHTML = `
      <a href="${item.hash}" class="header__nav-link" data-module-key="${item.key}">
        ${item.svg}
        <span class="header__nav-text">${item.title}</span>
      </a>
    `;

    refs.navListEl.appendChild(li);
  });

  // Resaltar activo
  highlightActiveItem();
}

// ------------------------------
// Resalta el item activo por hash (aria-current="page")
// ------------------------------
function highlightActiveItem() {
  if (!refs.navListEl) return;
  const currentKey = moduleKeyFromHash((location.hash || '#login').slice(1));
  const links = refs.navListEl.querySelectorAll('.header__nav-link');
  links.forEach(a => {
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

  if (state.drawerOpen) {
    const first = getFocusableElements(refs.drawerEl)[0];
    requestAnimationFrame(() => (first ? first.focus() : refs.drawerEl.focus()));
  }
}
function toggleDrawer() { setDrawer(!state.drawerOpen); }

// ESC + focus-trap dentro del drawer abierto
function handleKeydown(e) {
  if (!state.drawerOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); setDrawer(false); return; }
  if (e.key === 'Tab') {
    const focusables = getFocusableElements(refs.drawerEl);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); return; }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); return; }
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

// ------------------------------
// API pública de inicialización
// ------------------------------
export async function initAdminHeader() {
  await ensureRbacLoaded();

  refs.headerEl = document.querySelector('header.header');
  refs.toggleBtnEl = document.getElementById('headerMenuToggle');
  refs.drawerEl = document.getElementById('headerDrawer');
  refs.overlayEl = document.getElementById('headerOverlay');
  refs.navListEl = document.getElementById('headerNavList');

  if (!refs.headerEl || !refs.toggleBtnEl || !refs.drawerEl || !refs.overlayEl || !refs.navListEl) {
    console.error('[Header] Faltan nodos requeridos. Ver header.html');
    return;
  }

  // Construir menú según RBAC + flags
  buildMenu();

  if (!state.bound) {
    // Toggle
    const toggleFn = () => toggleDrawer();
    refs.toggleBtnEl.addEventListener('click', toggleFn);
    state.cleanupFns.push(() => refs.toggleBtnEl.removeEventListener('click', toggleFn));

    // Overlay
    const overlayFn = () => setDrawer(false);
    refs.overlayEl.addEventListener('click', overlayFn);
    state.cleanupFns.push(() => refs.overlayEl.removeEventListener('click', overlayFn));

    // Esc + focus-trap
    const keyFn = (e) => handleKeydown(e);
    document.addEventListener('keydown', keyFn);
    state.cleanupFns.push(() => document.removeEventListener('keydown', keyFn));

    // Delegación navegación
    const navFn = (e) => onNavClick(e);
    refs.navListEl.addEventListener('click', navFn);
    state.cleanupFns.push(() => refs.navListEl.removeEventListener('click', navFn));

    // Delegación logout
    const clickDelegate = (e) => {
      const logoutBtn = e.target.closest('[data-action="logout"]');
      if (logoutBtn) {
        if (state.drawerOpen) setDrawer(false);
        handleLogout();
      }
    };
    refs.headerEl.addEventListener('click', clickDelegate);
    state.cleanupFns.push(() => refs.headerEl.removeEventListener('click', clickDelegate));

    // Resaltar activo ante cambios de hash
    const onHash = () => highlightActiveItem();
    window.addEventListener('hashchange', onHash);
    state.cleanupFns.push(() => window.removeEventListener('hashchange', onHash));

    state.bound = true;
  }
}
