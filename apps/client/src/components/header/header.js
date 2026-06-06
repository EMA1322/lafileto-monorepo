import { createFocusTrap } from 'focus-trap';
import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicSettings,
} from '/src/api/public.js';
import { getCart } from '/src/utils/cartService.js';

let els = {};
let state = {
  abortController: null,
  focusTrap: null,
  isOpen: false,
  previousBodyOverflow: '',
};

export function initHeader() {
  cleanupHeader();

  els = {
    root: document.querySelector('.header'),
    overlay: document.getElementById('header-overlay'),
    toggle: document.getElementById('menu-toggle'),
    close: document.querySelector('[data-header-close]'),
    menu: document.getElementById('nav-menu'),
    cartCount: document.getElementById('cart-count'),
    business: document.getElementById('business-status'),
    statusText: document.querySelector('[data-header-status-text]'),
    desktopPhoneLink: document.querySelector('[data-header-phone-link]'),
    desktopPhoneText: document.querySelector('[data-header-phone-text]'),
    drawerContact: document.querySelector('[data-header-drawer-contact]'),
    drawerPhoneLink: document.querySelector('[data-header-drawer-phone]'),
    whatsappLink: document.querySelector('[data-header-whatsapp-link]'),
    socials: document.querySelector('[data-header-socials]'),
  };

  if (!els.root || !els.toggle || !els.menu) {
    console.warn('[Header] Missing DOM nodes.');
    return;
  }

  state.abortController = new AbortController();
  const { signal } = state.abortController;

  els.toggle.addEventListener('click', toggleMenu, { signal });
  els.close?.addEventListener('click', () => closeMenu(), { signal });
  els.overlay?.addEventListener('click', () => closeMenu(), { signal });
  els.menu.addEventListener('click', handleMenuClick, { signal });
  window.addEventListener('hashchange', () => closeMenu({ restoreFocus: false }), { signal });
  window.addEventListener('keydown', handleKeyDown, { signal });
  window.addEventListener('storage', handleStorage, { signal });
  document.addEventListener('click', handleDocumentClick, { signal });
  document.addEventListener('cart:updated', updateCartCount, { signal });

  closeMenu({ restoreFocus: false });
  updateCartCount();
  loadHeaderData();
}

function cleanupHeader() {
  state.abortController?.abort();
  state.abortController = null;
  deactivateFocusTrap();
  document.body.classList.remove('body-locked');

  if (state.isOpen) {
    document.body.style.overflow = state.previousBodyOverflow;
  }

  state.isOpen = false;
  state.previousBodyOverflow = '';
}

async function loadHeaderData() {
  renderBusinessStatus({ isLoading: true });

  const [statusResult, settingsResult, commercialResult] = await Promise.allSettled([
    fetchBusinessStatus(),
    fetchPublicSettings(),
    fetchCommercialConfig(),
  ]);

  if (statusResult.status === 'fulfilled') {
    renderBusinessStatus({ status: statusResult.value });
  } else {
    renderBusinessStatus({ error: statusResult.reason });
  }

  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value || {} : {};
  const commercialConfig =
    commercialResult.status === 'fulfilled' ? commercialResult.value || {} : {};

  renderContactData({ settings, commercialConfig });
}

function renderBusinessStatus({ status, isLoading = false, error = null }) {
  if (!els.business) return;

  els.business.classList.remove('is-open', 'is-closed', 'is-loading', 'is-error');

  if (isLoading) {
    els.business.classList.add('is-loading');
    setStatusText('Cargando...');
    els.business.removeAttribute('title');
    return;
  }

  if (error) {
    els.business.classList.add('is-error');
    setStatusText('Estado no disponible');
    els.business.removeAttribute('title');
    return;
  }

  const isOpen = status?.isOpen === true;
  const alertMessage = status?.alert?.enabled ? String(status.alert.message || '').trim() : '';

  els.business.classList.add(isOpen ? 'is-open' : 'is-closed');
  setStatusText(isOpen ? 'Abierto ahora' : 'Cerrado ahora');

  if (alertMessage) {
    els.business.setAttribute('title', alertMessage);
  } else {
    els.business.removeAttribute('title');
  }
}

function setStatusText(value) {
  if (els.statusText) {
    els.statusText.textContent = value;
    return;
  }

  if (els.business) {
    els.business.textContent = value;
  }
}

function renderContactData({ settings, commercialConfig }) {
  const phone = getString(commercialConfig?.contact?.phone) || getString(settings?.identity?.phone);
  const whatsapp =
    getString(commercialConfig?.whatsapp?.number) || getString(settings?.whatsapp?.number);
  const socialLinks = getHeaderSocialLinks(commercialConfig, settings);

  renderPhoneLink(els.desktopPhoneLink, els.desktopPhoneText, phone);
  renderDrawerPhone(phone);
  renderWhatsappLink(whatsapp);
  renderSocialLinks(socialLinks);

  const hasDrawerContact = Boolean(phone || whatsapp);
  toggleHidden(els.drawerContact, !hasDrawerContact);
}

function renderPhoneLink(link, textNode, phone) {
  if (!link || !textNode) return;

  const href = getPhoneHref(phone);
  toggleHidden(link, !href);

  if (!href) {
    link.removeAttribute('href');
    textNode.textContent = '';
    return;
  }

  link.href = href;
  textNode.textContent = phone;
}

function renderDrawerPhone(phone) {
  if (!els.drawerPhoneLink) return;

  const href = getPhoneHref(phone);
  toggleHidden(els.drawerPhoneLink, !href);

  if (!href) {
    els.drawerPhoneLink.removeAttribute('href');
    els.drawerPhoneLink.textContent = '';
    return;
  }

  els.drawerPhoneLink.href = href;
  els.drawerPhoneLink.textContent = phone;
}

function renderWhatsappLink(whatsapp) {
  if (!els.whatsappLink) return;

  const digits = compactDigits(whatsapp);
  toggleHidden(els.whatsappLink, !digits);

  if (!digits) {
    els.whatsappLink.removeAttribute('href');
    return;
  }

  els.whatsappLink.href = `https://wa.me/${digits}`;
  els.whatsappLink.target = '_blank';
  els.whatsappLink.rel = 'noopener noreferrer';
}

function renderSocialLinks(links) {
  if (!els.socials) return;

  els.socials.innerHTML = '';
  toggleHidden(els.socials, links.length === 0);

  for (const link of links) {
    const anchor = document.createElement('a');
    anchor.className = 'header__social-link';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.shortLabel;
    anchor.setAttribute('aria-label', link.label);
    els.socials.append(anchor);
  }
}

function getHeaderSocialLinks(commercialConfig, settings) {
  const links = [...toArray(commercialConfig?.socialLinks), ...toArray(settings?.socialLinks)];
  const allowed = new Map([
    ['facebook', 'FB'],
    ['instagram', 'IG'],
  ]);
  const seen = new Set();

  return links.reduce((acc, link) => {
    const label = getString(link?.label);
    const url = getString(link?.url);
    const key = label.toLowerCase();

    if (!allowed.has(key) || seen.has(key) || !isValidHttpUrl(url)) {
      return acc;
    }

    seen.add(key);
    acc.push({ label, shortLabel: allowed.get(key), url });
    return acc;
  }, []);
}

function updateCartCount() {
  if (!els.cartCount) return;

  try {
    const currentCart = getCart?.();
    const cart = Array.isArray(currentCart) ? currentCart : [];
    const totalQty = cart.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    els.cartCount.textContent = String(totalQty);
  } catch {
    els.cartCount.textContent = '0';
  }
}

function toggleMenu() {
  if (state.isOpen) {
    closeMenu();
  } else {
    openMenu();
  }
}

function openMenu() {
  if (state.isOpen || !els.root || !els.menu || !els.toggle) return;

  state.isOpen = true;
  state.previousBodyOverflow = document.body.style.overflow;

  els.root.classList.add('is-open');
  els.toggle.setAttribute('aria-expanded', 'true');
  els.menu.setAttribute('aria-hidden', 'false');

  if (els.overlay) {
    els.overlay.hidden = false;
  }

  document.body.classList.add('body-locked');
  document.body.style.overflow = 'hidden';
  activateFocusTrap();
}

function closeMenu({ restoreFocus = true } = {}) {
  if (!els.root || !els.menu || !els.toggle) return;

  const wasOpen = state.isOpen || els.root.classList.contains('is-open');
  state.isOpen = false;

  els.root.classList.remove('is-open');
  els.toggle.setAttribute('aria-expanded', 'false');
  els.menu.setAttribute('aria-hidden', 'true');

  if (els.overlay) {
    els.overlay.hidden = true;
  }

  deactivateFocusTrap();
  document.body.classList.remove('body-locked');
  document.body.style.overflow = state.previousBodyOverflow;
  state.previousBodyOverflow = '';

  if (wasOpen && restoreFocus) {
    els.toggle.focus();
  }
}

function activateFocusTrap() {
  if (!els.menu) return;

  deactivateFocusTrap();

  try {
    state.focusTrap = createFocusTrap(els.menu, {
      allowOutsideClick: true,
      escapeDeactivates: false,
      fallbackFocus: els.menu,
      initialFocus: els.close || els.menu,
      returnFocusOnDeactivate: false,
      tabbableOptions: {
        displayCheck: 'none',
      },
    });
    state.focusTrap.activate();
  } catch {
    state.focusTrap = null;
    els.close?.focus();
  }
}

function deactivateFocusTrap() {
  state.focusTrap?.deactivate?.();
  state.focusTrap = null;
}

function handleKeyDown(event) {
  if (event.key === 'Escape' && state.isOpen) {
    event.preventDefault();
    closeMenu();
  }
}

function handleMenuClick(event) {
  const link = event.target.closest("a[href^='#']");
  if (link) {
    closeMenu();
  }
}

function handleStorage(event) {
  if (event.key === 'cart') {
    updateCartCount();
  }
}

function handleDocumentClick(event) {
  if (
    event.target.closest('.btn-add-to-cart') ||
    event.target.closest("[data-action='inc']") ||
    event.target.closest("[data-action='dec']") ||
    event.target.closest("[data-action='remove']")
  ) {
    setTimeout(updateCartCount, 0);
  }
}

function getString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactDigits(value) {
  return getString(value).replace(/\D/g, '');
}

function getPhoneHref(phone) {
  const compact = compactDigits(phone);
  return compact ? `tel:${compact}` : '';
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function toggleHidden(element, shouldHide) {
  element?.classList.toggle('is-hidden', shouldHide);
}
