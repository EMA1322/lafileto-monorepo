import { useEffect, useMemo, useState } from 'react';
import { Clock, MessageCircle, ShieldCheck } from 'lucide-react';
import { loadPublicClientSettings } from '/src/react/settings/publicClientSettings.js';

const BRAND_NAME = 'La Fileto';
const BRAND_TAGLINE = 'Sabores auténticos a domicilio';
const BRAND_SUBTITLE = 'Menú digital';
const DELIVERY_ZONE = 'Quines – San Luis';
const CURRENT_YEAR = new Date().getFullYear();

const INITIAL_FOOTER_DATA = {
  publicSettings: null,
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

const TRUST_ITEMS = [
  { icon: MessageCircle, label: 'Pedido por WhatsApp' },
  { icon: Clock, label: 'Te lo preparamos al toque' },
  { icon: ShieldCheck, label: 'Confirmacion directa' },
];

function getString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getEmailHref(email) {
  const value = getString(email);
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : '';
}

function getSocialIcon(link) {
  const type = link.type;

  if (type === 'instagram') {
    return (
      <svg className="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17.2" cy="6.8" r="1" />
      </svg>
    );
  }

  if (type !== 'facebook') {
    return (
      <span className="footer__social-icon" aria-hidden="true">
        {link.shortLabel}
      </span>
    );
  }

  return (
    <svg className="footer__social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.2 8.4V6.9c0-.7.5-1 1.1-1h1.4V3.2A19 19 0 0 0 14.4 3c-2.4 0-4 1.5-4 4.1v1.3H7.8v3h2.6V21h3.2v-9.6h2.7l.4-3h-3z" />
    </svg>
  );
}

function getFooterContactData(publicSettings) {
  const email = getString(publicSettings?.contact?.email);
  const whatsappDigits = getString(publicSettings?.whatsapp?.numberDigits);

  return {
    address: getString(publicSettings?.contact?.address),
    email,
    emailHref: getEmailHref(email),
    mapHref: getString(publicSettings?.contact?.mapHref),
    phone: getString(publicSettings?.contact?.phone),
    phoneHref: getString(publicSettings?.contact?.phoneHref),
    socialLinks: publicSettings?.socialLinks || [],
    whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : '',
  };
}

function getStatusView(publicSettings, businessStatus) {
  if (businessStatus.isLoading || businessStatus.error || !publicSettings) {
    return null;
  }

  const isOpen = publicSettings.isOpen === true;
  const alertMessage = publicSettings.alert?.enabled ? getString(publicSettings.alert.message) : '';

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
      const publicSettings = await loadPublicClientSettings();

      if (!isMounted) return;

      setFooterData({ publicSettings });
      setBusinessStatus({
        error: publicSettings.errors.businessStatus,
        isLoading: false,
        status: publicSettings,
      });
    }

    loadFooterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const logoUrl = footerData.publicSettings?.brand?.logoUrl || '';
  const contactData = useMemo(() => getFooterContactData(footerData.publicSettings), [footerData]);
  const statusView = useMemo(
    () => getStatusView(footerData.publicSettings, businessStatus),
    [businessStatus, footerData.publicSettings],
  );
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
                width="40"
                height="40"
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
          {contactData.whatsappHref ? (
            <a
              href={contactData.whatsappHref}
              className="footer__primary-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Pedi por WhatsApp
            </a>
          ) : null}
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

        <section className="footer__column footer__trust-column" aria-label="Informacion del local">
          <h2 className="footer__heading">Nosotros</h2>
          <p className="footer__text">Cocina de barrio y atención directa.</p>
          <p className="footer__text">Zona de reparto: {DELIVERY_ZONE}</p>
          <ul className="footer__trust-list">
            {TRUST_ITEMS.map((item) => {
              const TrustIcon = item.icon;

              return (
                <li key={item.label}>
                  <TrustIcon size={16} strokeWidth={2} aria-hidden="true" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
          <a className="footer__text-link" href="#contact">
            Contacto
          </a>
        </section>

        <section className="footer__column footer__faq-column" aria-label="Preguntas frecuentes">
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
                  key={`${link.type}-${link.url}`}
                >
                  {getSocialIcon(link)}
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
