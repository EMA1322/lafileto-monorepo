import { useEffect, useMemo, useState } from 'react';
import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicSettings,
} from '/src/api/public.js';

const BRAND_NAME = 'La Fileto';
const BRAND_TAGLINE = 'Sabores auténticos a domicilio';
const BRAND_SUBTITLE = 'Menú digital';
const DELIVERY_ZONE = 'Quines – San Luis';
const CURRENT_YEAR = new Date().getFullYear();

const INITIAL_FOOTER_DATA = {
  commercialConfig: {},
  settings: {},
};

const MENU_LINKS = [
  { href: '#home', label: 'Inicio' },
  { href: '#products', label: 'Productos' },
  { href: '#contact', label: 'Contacto' },
  { href: '#cart', label: 'Carrito' },
];

const FAQ_ITEMS = [
  {
    question: '¿Cómo hago un pedido?',
    answer: 'Elegís productos, revisás carrito y confirmás por WhatsApp.',
  },
  {
    question: '¿Dónde entregan?',
    answer: DELIVERY_ZONE,
  },
];

const POLICY_ITEMS = [
  'Datos sujetos a disponibilidad del local.',
  'Los precios pueden actualizarse.',
  'La confirmación final se realiza por WhatsApp.',
];

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
  const digits = compactDigits(phone);
  return digits ? `tel:${digits}` : '';
}

function getWhatsappHref(whatsapp) {
  const digits = compactDigits(whatsapp);
  return digits ? `https://wa.me/${digits}` : '';
}

function getEmailHref(email) {
  const value = getString(email);
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : '';
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidImageUrl(value) {
  const url = getString(value);
  if (!url) return false;
  if (url.startsWith('/')) return true;
  if (url.startsWith('data:image/')) return true;
  return isValidHttpUrl(url);
}

function getLogoUrl(settings) {
  const candidates = [settings?.brand?.logo, settings?.brand?.logoUrl, settings?.identity?.logo];

  return candidates.find(isValidImageUrl) || '';
}

function getSocialIcon(type) {
  if (type === 'instagram') {
    return (
      <svg className="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17.2" cy="6.8" r="1" />
      </svg>
    );
  }

  return (
    <svg className="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.2 8.4V6.9c0-.7.5-1 1.1-1h1.4V3.2A19 19 0 0 0 14.4 3c-2.4 0-4 1.5-4 4.1v1.3H7.8v3h2.6V21h3.2v-9.6h2.7l.4-3h-3z" />
    </svg>
  );
}

function getFooterSocialLinks(commercialConfig, settings) {
  const links = [...toArray(commercialConfig?.socialLinks), ...toArray(settings?.socialLinks)];
  const allowed = new Map([
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
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
    acc.push({ label: allowed.get(key), type: key, url });
    return acc;
  }, []);
}

function getFooterContactData(commercialConfig, settings) {
  const phone = getString(commercialConfig?.contact?.phone) || getString(settings?.identity?.phone);
  const whatsapp =
    getString(commercialConfig?.whatsapp?.number) || getString(settings?.whatsapp?.number);
  const email = getString(commercialConfig?.contact?.email) || getString(settings?.identity?.email);
  const address =
    getString(commercialConfig?.contact?.address) || getString(settings?.identity?.address);
  const mapUrl = getString(settings?.map?.embedSrc);

  return {
    address,
    email,
    emailHref: getEmailHref(email),
    mapHref: isValidHttpUrl(mapUrl) ? mapUrl : '',
    phone,
    phoneHref: getPhoneHref(phone),
    socialLinks: getFooterSocialLinks(commercialConfig, settings),
    whatsappHref: getWhatsappHref(whatsapp),
  };
}

function getStatusView(businessStatus) {
  if (businessStatus.isLoading || businessStatus.error || !businessStatus.status) {
    return null;
  }

  const isOpen = businessStatus.status.isOpen === true;
  const alertMessage = businessStatus.status?.alert?.enabled
    ? getString(businessStatus.status.alert.message)
    : '';

  return {
    className: isOpen ? 'is-open' : 'is-closed',
    text: isOpen ? 'Abierto ahora' : 'Cerrado ahora',
    title: alertMessage,
  };
}

export function Footer() {
  const [footerData, setFooterData] = useState(INITIAL_FOOTER_DATA);
  const [businessStatus, setBusinessStatus] = useState({
    error: null,
    isLoading: true,
    status: null,
  });
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFooterData() {
      const [settingsResult, commercialResult, statusResult] = await Promise.allSettled([
        fetchPublicSettings(),
        fetchCommercialConfig(),
        fetchBusinessStatus(),
      ]);

      if (!isMounted) return;

      setFooterData({
        commercialConfig:
          commercialResult.status === 'fulfilled' ? commercialResult.value || {} : {},
        settings: settingsResult.status === 'fulfilled' ? settingsResult.value || {} : {},
      });

      if (statusResult.status === 'fulfilled') {
        setBusinessStatus({ error: null, isLoading: false, status: statusResult.value });
      } else {
        setBusinessStatus({ error: statusResult.reason, isLoading: false, status: null });
      }
    }

    loadFooterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const logoUrl = useMemo(() => getLogoUrl(footerData.settings), [footerData.settings]);
  const contactData = useMemo(
    () => getFooterContactData(footerData.commercialConfig, footerData.settings),
    [footerData],
  );
  const statusView = useMemo(() => getStatusView(businessStatus), [businessStatus]);
  const hasContactLinks = Boolean(
    contactData.phoneHref ||
      contactData.whatsappHref ||
      contactData.emailHref ||
      contactData.address,
  );

  return (
    <div className="footer">
      <div className="footer__container container">
        <section className="footer__brand-column" aria-label="Marca La Fileto">
          <a href="#home" className="footer__brand-link" aria-label="Ir al inicio">
            {logoUrl && !logoFailed ? (
              <img
                className="footer__logo-image"
                src={logoUrl}
                alt={`${BRAND_NAME} - ${BRAND_SUBTITLE}`}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="footer__brand-mark" aria-hidden="true">
                LF
              </span>
            )}
            <span className="footer__brand-copy">
              <span className="footer__brand-name">{BRAND_NAME}</span>
              <span className="footer__brand-note">{BRAND_SUBTITLE}</span>
            </span>
          </a>

          <p className="footer__tagline">{BRAND_TAGLINE}</p>
          <p className="footer__intro">Pedidos simples y confirmación directa.</p>
          <p className="footer__delivery">Zona de reparto: {DELIVERY_ZONE}</p>
        </section>

        <nav className="footer__column" aria-label="Navegacion secundaria">
          <h2 className="footer__heading">Menú</h2>
          <ul className="footer__link-list">
            {MENU_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <section className="footer__column" aria-label="Informacion del local">
          <h2 className="footer__heading">Nosotros</h2>
          <p className="footer__text">Cocina de barrio y atención directa.</p>
          <p className="footer__text">Zona de reparto: {DELIVERY_ZONE}</p>
          <a className="footer__text-link" href="#contact">
            Contacto
          </a>
        </section>

        <section className="footer__column" aria-label="Preguntas frecuentes">
          <h2 className="footer__heading">Preguntas frecuentes</h2>
          <dl className="footer__faq">
            {FAQ_ITEMS.map((item) => (
              <div className="footer__faq-item" key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="footer__column footer__policy-column" aria-label="Políticas y legales">
          <h2 className="footer__heading">Políticas</h2>
          <ul className="footer__policy-list">
            {POLICY_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="footer__column footer__contact-column" aria-label="Contacto y redes">
          <h2 className="footer__heading">Contacto</h2>
          {hasContactLinks ? (
            <ul className="footer__contact-list">
              {contactData.phoneHref ? (
                <li>
                  <a href={contactData.phoneHref} data-footer-phone-link>
                    Teléfono: <span>{contactData.phone}</span>
                  </a>
                </li>
              ) : null}
              {contactData.whatsappHref ? (
                <li>
                  <a
                    href={contactData.whatsappHref}
                    className="footer__external-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir WhatsApp de La Fileto"
                  >
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {contactData.emailHref ? (
                <li>
                  <a href={contactData.emailHref}>Email: {contactData.email}</a>
                </li>
              ) : null}
              {contactData.address ? (
                <li>
                  {contactData.mapHref ? (
                    <a
                      href={contactData.mapHref}
                      className="footer__external-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ver ubicación de La Fileto"
                    >
                      Dirección: {contactData.address}
                    </a>
                  ) : (
                    <span>Dirección: {contactData.address}</span>
                  )}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="footer__empty">Contacto disponible al confirmar el pedido.</p>
          )}

          {statusView ? (
            <span
              className={`footer__status ${statusView.className}`}
              title={statusView.title || undefined}
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="footer__status-dot" aria-hidden="true"></span>
              {statusView.text}
            </span>
          ) : null}

          {contactData.socialLinks.length ? (
            <div className="footer__social" aria-label="Redes sociales">
              {contactData.socialLinks.map((link) => (
                <a
                  href={link.url}
                  aria-label={`${link.label} de La Fileto`}
                  className="footer__social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  key={link.type}
                >
                  {getSocialIcon(link.type)}
                </a>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <div className="footer__legal container">
        <p>
          © {CURRENT_YEAR} {BRAND_NAME}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
