import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFocusTrap } from 'focus-trap';
import { Menu, Phone, ShoppingCart, X } from 'lucide-react';
import {
  applyClientFavicon,
  loadPublicClientSettings,
} from '/src/react/settings/publicClientSettings.js';
import { getCart } from '/src/utils/cartService.js';

const NAV_LINKS = [
  { href: '#home', label: 'Inicio' },
  { href: '#products', label: 'Productos' },
  { href: '#contact', label: 'Contacto' },
];

const NAV_HASH_ALIASES = {
  '#contacto': '#contact',
  '#r/contact': '#contact',
  '#r/contacto': '#contact',
};

const INITIAL_HEADER_DATA = {
  publicSettings: null,
};

function getString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function compactDigits(value) {
  return getString(value).replace(/\D/g, '');
}

function getPhoneHref(phone) {
  const compact = compactDigits(phone);
  return compact ? `tel:${compact}` : '';
}

function getCartCount() {
  try {
    const currentCart = getCart?.();
    const cart = Array.isArray(currentCart) ? currentCart : [];
    return cart.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
  } catch {
    return 0;
  }
}

function getCurrentHash() {
  return window.location.hash || '#home';
}

function getCanonicalNavHash(hash) {
  return NAV_HASH_ALIASES[hash] || hash;
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => getCartCount());
  const [currentHash, setCurrentHash] = useState(() => getCurrentHash());
  const [businessStatus, setBusinessStatus] = useState({
    error: null,
    isLoading: true,
    status: null,
  });
  const [headerData, setHeaderData] = useState(INITIAL_HEADER_DATA);
  const [logoFailed, setLogoFailed] = useState(false);

  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const menuRef = useRef(null);
  const focusTrapRef = useRef(null);
  const wasMenuOpenRef = useRef(false);
  const previousBodyOverflowRef = useRef('');
  const restoreFocusOnCloseRef = useRef(true);

  const updateCartCount = useCallback(() => {
    setCartCount(getCartCount());
  }, []);

  const closeMenu = useCallback(({ restoreFocus = true } = {}) => {
    restoreFocusOnCloseRef.current = restoreFocus;
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadHeaderData() {
      setBusinessStatus({ error: null, isLoading: true, status: null });

      const publicSettings = await loadPublicClientSettings();

      if (!isMounted) return;

      setBusinessStatus({
        error: publicSettings.errors.businessStatus,
        isLoading: false,
        status: publicSettings,
      });
      setHeaderData({ publicSettings });
      applyClientFavicon(publicSettings.brand.faviconUrl);
    }

    loadHeaderData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === 'cart') {
        updateCartCount();
      }
    }

    window.addEventListener('storage', handleStorage);
    document.addEventListener('cart:updated', updateCartCount);

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('cart:updated', updateCartCount);
    };
  }, [updateCartCount]);

  useEffect(() => {
    function handleHashChange() {
      setCurrentHash(getCurrentHash());
      closeMenu({ restoreFocus: false });
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [closeMenu]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenu, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      const wasMenuOpen = wasMenuOpenRef.current;
      wasMenuOpenRef.current = false;
      focusTrapRef.current?.deactivate?.();
      focusTrapRef.current = null;
      document.body.classList.remove('body-locked');
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = '';

      if (wasMenuOpen && restoreFocusOnCloseRef.current) {
        toggleRef.current?.focus();
      }

      restoreFocusOnCloseRef.current = true;
      return undefined;
    }

    previousBodyOverflowRef.current = document.body.style.overflow;
    wasMenuOpenRef.current = true;
    document.body.classList.add('body-locked');
    document.body.style.overflow = 'hidden';

    try {
      focusTrapRef.current = createFocusTrap(menuRef.current, {
        allowOutsideClick: true,
        escapeDeactivates: false,
        fallbackFocus: menuRef.current,
        initialFocus: closeRef.current || menuRef.current,
        returnFocusOnDeactivate: false,
        tabbableOptions: {
          displayCheck: 'none',
        },
      });
      focusTrapRef.current.activate();
    } catch {
      focusTrapRef.current = null;
      closeRef.current?.focus();
    }

    return () => {
      focusTrapRef.current?.deactivate?.();
      focusTrapRef.current = null;
      document.body.classList.remove('body-locked');
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = '';
    };
  }, [isMenuOpen]);

  const statusView = useMemo(() => {
    if (businessStatus.isLoading) {
      return { className: 'is-loading', text: 'Cargando...', title: '' };
    }

    if (businessStatus.error) {
      return { className: 'is-error', text: 'Estado no disponible', title: '' };
    }

    const isOpen = businessStatus.status?.isOpen === true;
    const alertMessage = businessStatus.status?.alert?.enabled
      ? getString(businessStatus.status.alert.message)
      : '';

    return {
      className: isOpen ? 'is-open' : 'is-closed',
      text: isOpen ? 'Abierto ahora' : 'Cerrado ahora',
      title: alertMessage,
    };
  }, [businessStatus]);

  const contactData = useMemo(() => {
    const publicSettings = headerData.publicSettings;
    const phone = getString(publicSettings?.contact?.phone);
    const whatsappDigits = compactDigits(publicSettings?.whatsapp?.number);

    return {
      phone,
      phoneHref: publicSettings?.contact?.phoneHref || getPhoneHref(phone),
      whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : '',
      socialLinks: publicSettings?.socialLinks || [],
    };
  }, [headerData]);

  const hasDrawerContact = Boolean(contactData.phoneHref || contactData.whatsappHref);
  const logoUrl = headerData.publicSettings?.brand?.logoUrl || '';
  const alertMessage = headerData.publicSettings?.alert?.enabled
    ? headerData.publicSettings.alert.message
    : '';
  const activeNavHash = getCanonicalNavHash(currentHash);

  function handleToggleMenu() {
    restoreFocusOnCloseRef.current = true;
    setIsMenuOpen((current) => !current);
  }

  function handleInternalLinkClick() {
    closeMenu();
  }

  return (
    <div className={`header${isMenuOpen ? ' is-open' : ''}`}>
      <div
        className="header__overlay"
        id="header-overlay"
        aria-hidden="true"
        hidden={!isMenuOpen}
        onClick={() => closeMenu()}
      />

      <nav className="header__nav container" role="navigation" aria-label="Navegacion principal">
        <a href="#home" className="header__brand" aria-label="Ir al inicio">
          {logoUrl && !logoFailed ? (
            <img
              className="header__brand-mark"
              src={logoUrl}
              alt=""
              width="42"
              height="42"
              aria-hidden="true"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="header__brand-mark" aria-hidden="true">
              LF
            </span>
          )}
          <span className="header__brand-copy">
            <span className="header__brand-name">La Fileto</span>
            <span className="header__brand-note">Pedi rico y sin vueltas</span>
          </span>
        </a>

        <ul className="header__links" aria-label="Secciones principales">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={activeNavHash === link.href ? 'is-active' : undefined}
                aria-current={activeNavHash === link.href ? 'page' : undefined}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="header__meta">
          <a
            className={`header__contact-link${contactData.phoneHref ? '' : ' is-hidden'}`}
            href={contactData.phoneHref || undefined}
            data-header-phone-link
            aria-label="Llamar a La Fileto"
          >
            <Phone className="header__icon" size={18} strokeWidth={2} aria-hidden="true" />
            <span data-header-phone-text>{contactData.phone}</span>
          </a>

          <span
            id="business-status"
            className={`header__status ${statusView.className}`}
            aria-live="polite"
            aria-atomic="true"
            title={statusView.title || undefined}
          >
            <span className="header__status-dot" aria-hidden="true"></span>
            <span data-header-status-text>{statusView.text}</span>
          </span>
        </div>

        <div className="header__actions">
          {contactData.whatsappHref ? (
            <a
              href={contactData.whatsappHref}
              className="header__order-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pedi por WhatsApp
            </a>
          ) : null}

          <a href="#cart" className="header__cart" aria-label="Ir al carrito">
            <ShoppingCart className="header__icon" size={19} strokeWidth={2.1} aria-hidden="true" />
            <span
              id="cart-count"
              className="header__cart-count"
              aria-label="Productos en el carrito"
              aria-live="polite"
              aria-atomic="true"
            >
              {cartCount}
            </span>
          </a>

          <button
            className="header__toggle"
            id="menu-toggle"
            type="button"
            aria-label="Abrir menu de navegacion"
            aria-controls="nav-menu"
            aria-expanded={isMenuOpen ? 'true' : 'false'}
            onClick={handleToggleMenu}
            ref={toggleRef}
          >
            <Menu className="header__icon" size={21} strokeWidth={2.2} aria-hidden="true" />
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </nav>

      {alertMessage ? (
        <div className="container" role="alert" aria-live="polite" data-client-alert-banner>
          <span className="header__status is-closed">{alertMessage}</span>
        </div>
      ) : null}

      <aside
        className="header__menu"
        id="nav-menu"
        aria-label="Menu de navegacion"
        aria-hidden={isMenuOpen ? 'false' : 'true'}
        tabIndex="-1"
        ref={menuRef}
      >
        <div className="header__menu-head">
          <a href="#home" className="header__drawer-brand" aria-label="Ir al inicio">
            {logoUrl && !logoFailed ? (
              <img
                className="header__brand-mark"
                src={logoUrl}
                alt=""
                width="42"
                height="42"
                aria-hidden="true"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              'La Fileto'
            )}
          </a>
          <button
            className="header__close"
            type="button"
            data-header-close
            aria-label="Cerrar menu"
            onClick={() => closeMenu()}
            ref={closeRef}
          >
            <X className="header__icon" size={21} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <ul className="header__menu-list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={activeNavHash === link.href ? 'is-active' : undefined}
                aria-current={activeNavHash === link.href ? 'page' : undefined}
                onClick={handleInternalLinkClick}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="header__drawer-details">
          <div
            className={`header__drawer-contact${hasDrawerContact ? '' : ' is-hidden'}`}
            data-header-drawer-contact
          >
            <span className="header__drawer-label">Contacto</span>
            <a
              className={`header__drawer-link${contactData.phoneHref ? '' : ' is-hidden'}`}
              href={contactData.phoneHref || undefined}
              data-header-drawer-phone
            >
              {contactData.phone}
            </a>
            <a
              className={`header__drawer-link${contactData.whatsappHref ? '' : ' is-hidden'}`}
              href={contactData.whatsappHref || undefined}
              target={contactData.whatsappHref ? '_blank' : undefined}
              rel={contactData.whatsappHref ? 'noopener noreferrer' : undefined}
              data-header-whatsapp-link
            >
              WhatsApp
            </a>
          </div>

          <div
            className={`header__socials${contactData.socialLinks.length ? '' : ' is-hidden'}`}
            data-header-socials
            aria-label="Redes sociales"
          >
            {contactData.socialLinks.map((link) => (
              <a
                className="header__social-link"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                key={`${link.label}-${link.url}`}
              >
                {link.shortLabel}
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
