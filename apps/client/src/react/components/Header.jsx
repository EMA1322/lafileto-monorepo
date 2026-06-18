import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFocusTrap } from 'focus-trap';
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

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => getCartCount());
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
            <span className="header__brand-note">Menu digital</span>
          </span>
        </a>

        <ul className="header__links" aria-label="Secciones principales">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
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
            <svg className="header__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9z" />
            </svg>
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
          <a href="#cart" className="header__cart" aria-label="Ir al carrito">
            <svg className="header__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.4 6H21l-2 8.5a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.6L4.8 3.8H2V2h4.4L6.8 5.8 6.4 6zm2 8h8.7l1.4-6H7.1l1.3 6zM9 22a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
            </svg>
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
            <span className="header__bar"></span>
            <span className="header__bar"></span>
            <span className="header__bar"></span>
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
            <svg className="header__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4z" />
            </svg>
          </button>
        </div>

        <ul className="header__menu-list">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} onClick={handleInternalLinkClick}>
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
