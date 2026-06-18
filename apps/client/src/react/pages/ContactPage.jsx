import { useEffect, useMemo } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '/src/components/ui/State.jsx';
import { loadPublicClientSettings } from '/src/react/settings/publicClientSettings.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import styles from './ContactPage.module.css';

const DEFAULT_WHATSAPP_MESSAGE = 'Hola La Fileto, quiero hacer una consulta.';
const DEFAULT_TITLE = 'Contacto';
const DEFAULT_DESCRIPTION = 'Comunicate con La Fileto o encontranos en el mapa.';

function getString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getEmailHref(email) {
  const value = getString(email);
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : '';
}

function getWhatsappHref(numberDigits, message) {
  const digits = getString(numberDigits);
  if (!digits) return '';

  const text = getString(message) || DEFAULT_WHATSAPP_MESSAGE;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function ContactItem({ icon, label, value, href, external = false, fallback }) {
  const content = value ? (
    href ? (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {value}
      </a>
    ) : (
      <span>{value}</span>
    )
  ) : (
    <span className={styles.fallback}>{fallback}</span>
  );

  return (
    <li className={styles.contactItem}>
      <span className={styles.itemIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.itemCopy}>
        <span className={styles.itemLabel}>{label}</span>
        {content}
      </span>
    </li>
  );
}

function applyContactMeta(seo) {
  const title = getString(seo?.contactTitle);
  const description = getString(seo?.contactDescription);

  if (title) {
    document.title = title;
  }

  if (!description) return;

  let meta = document.querySelector("meta[name='description']");
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', description);
}

export function ContactPage() {
  const settingsResource = useAsyncResource(loadPublicClientSettings, []);
  const settings = settingsResource.data;

  useEffect(() => {
    if (settingsResource.status !== 'success') return;
    applyContactMeta(settings?.seo);
  }, [settings, settingsResource.status]);

  const contactData = useMemo(() => {
    const phone = getString(settings?.contact?.phone);
    const email = getString(settings?.contact?.email);
    const address = getString(settings?.contact?.address);
    const whatsappMessage = getString(settings?.whatsapp?.messageCta);
    const whatsappHref = getWhatsappHref(settings?.whatsapp?.numberDigits, whatsappMessage);

    return {
      address,
      email,
      emailHref: getEmailHref(email),
      mapEmbedSrc: getString(settings?.map?.embedSrc),
      phone,
      phoneHref: getString(settings?.contact?.phoneHref),
      title: getString(settings?.seo?.contactTitle) || DEFAULT_TITLE,
      description: getString(settings?.seo?.contactDescription) || DEFAULT_DESCRIPTION,
      whatsappHref,
      whatsappMessage: whatsappMessage || DEFAULT_WHATSAPP_MESSAGE,
      whatsappNumber: getString(settings?.whatsapp?.number),
    };
  }, [settings]);

  const hasAnyContactData = Boolean(
    contactData.phone ||
      contactData.email ||
      contactData.address ||
      contactData.whatsappNumber ||
      contactData.mapEmbedSrc,
  );

  return (
    <main className={styles.contact} aria-labelledby="contact-title">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Atencion directa</p>
          <h1 id="contact-title">{contactData.title}</h1>
          <p>{contactData.description}</p>
        </div>
      </section>

      {settingsResource.status === 'loading' ? (
        <LoadingState
          className={styles.state}
          title="Cargando contacto"
          message="Estamos buscando los datos del local."
        />
      ) : null}

      {settingsResource.status === 'error' ? (
        <ErrorState
          className={styles.state}
          title="No pudimos cargar Contacto"
          message={settingsResource.error?.message || 'Intenta nuevamente en unos minutos.'}
        />
      ) : null}

      {settingsResource.status === 'success' ? (
        <section className={styles.content} aria-label="Datos de contacto">
          <div className={styles.details}>
            {hasAnyContactData ? (
              <ul className={styles.contactList}>
                <ContactItem
                  icon={<Phone size={20} strokeWidth={1.8} />}
                  label="Telefono"
                  value={contactData.phone}
                  href={contactData.phoneHref}
                  fallback="Telefono no disponible por ahora."
                />
                <ContactItem
                  icon={<Mail size={20} strokeWidth={1.8} />}
                  label="Email"
                  value={contactData.email}
                  href={contactData.emailHref}
                  fallback="Email no disponible por ahora."
                />
                <ContactItem
                  icon={<MapPin size={20} strokeWidth={1.8} />}
                  label="Direccion"
                  value={contactData.address}
                  fallback="Direccion no disponible por ahora."
                />
                <ContactItem
                  icon={<MessageCircle size={20} strokeWidth={1.8} />}
                  label="WhatsApp"
                  value={contactData.whatsappNumber}
                  href={contactData.whatsappHref}
                  external
                  fallback="WhatsApp no disponible por ahora."
                />
              </ul>
            ) : (
              <EmptyState
                className={styles.emptyState}
                title="Contacto en preparacion"
                message="Todavia no hay datos publicos cargados para esta seccion."
              />
            )}

            {contactData.whatsappHref ? (
              <div className={styles.cta} data-contact-whatsapp-cta>
                <p>{contactData.whatsappMessage}</p>
                <a
                  className={styles.ctaLink}
                  href={contactData.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Escribir por WhatsApp
                </a>
              </div>
            ) : null}
          </div>

          <section className={styles.mapPanel} aria-labelledby="contact-map-title">
            <h2 id="contact-map-title">Ubicacion</h2>
            {contactData.mapEmbedSrc ? (
              <iframe
                className={styles.map}
                src={contactData.mapEmbedSrc}
                title="Mapa de ubicacion de La Fileto"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                data-contact-map
              />
            ) : (
              <p className={styles.mapFallback}>
                {contactData.address
                  ? `Mapa no disponible. Direccion: ${contactData.address}`
                  : 'Mapa no disponible por ahora.'}
              </p>
            )}
          </section>
        </section>
      ) : null}
    </main>
  );
}
