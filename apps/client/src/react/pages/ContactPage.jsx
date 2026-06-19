import { useEffect, useMemo } from 'react';
import {
  Clock,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '/src/components/ui/State.jsx';
import { loadPublicClientSettings } from '/src/react/settings/publicClientSettings.js';
import { useAsyncResource } from '../hooks/useAsyncResource.jsx';
import styles from './ContactPage.module.css';

const DEFAULT_WHATSAPP_MESSAGE = 'Hola La Fileto, quiero hacer una consulta.';
const DEFAULT_TITLE = 'Contacto';
const DEFAULT_DESCRIPTION =
  'Hablamos por WhatsApp, te contamos horarios y te esperamos en el local.';
const DAY_LABELS = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miercoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sabado',
  sunday: 'Domingo',
};

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

function getDayLabel(day) {
  const value = getString(day).toLowerCase();
  return DAY_LABELS[value] || getString(day) || 'Dia';
}

function getPaymentRows(payments) {
  if (payments?.transferEnabled !== true) return [];

  return [
    ['Banco', payments.bankName],
    ['CBU', payments.cbu],
    ['Alias', payments.alias],
    ['CUIT', payments.cuit],
  ]
    .map(([label, value]) => ({ label, value: getString(value) }))
    .filter((row) => row.value);
}

function getHourRows(hours) {
  return (Array.isArray(hours) ? hours : []).map((entry) => {
    const isClosed = entry?.closed === true;
    const open = getString(entry?.open);
    const close = getString(entry?.close);

    return {
      day: getDayLabel(entry?.day),
      value: isClosed || !open || !close ? 'Cerrado' : `${open} a ${close}`,
    };
  });
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

function TrustNote({ icon, title, text }) {
  return (
    <li className={styles.trustNote}>
      <span className={styles.trustIcon} aria-hidden="true">
        {icon}
      </span>
      <span>
        <strong>{title}</strong>
        <span>{text}</span>
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
      mapHref: getString(settings?.contact?.mapHref),
      mapEmbedSrc: getString(settings?.map?.embedSrc),
      phone,
      phoneHref: getString(settings?.contact?.phoneHref),
      title: getString(settings?.seo?.contactTitle) || DEFAULT_TITLE,
      description: getString(settings?.seo?.contactDescription) || DEFAULT_DESCRIPTION,
      whatsappHref,
      whatsappMessage: whatsappMessage || DEFAULT_WHATSAPP_MESSAGE,
      whatsappNumber: getString(settings?.whatsapp?.number),
      paymentRows: getPaymentRows(settings?.payments),
      hourRows: getHourRows(settings?.hours?.openingHours),
      isOpen: settings?.isOpen === true,
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
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Atencion directa</p>
            <h1 id="contact-title">{contactData.title}</h1>
            <p>{contactData.description}</p>
          </div>

          <ul className={styles.trustList} aria-label="Senales de confianza">
            <TrustNote
              icon={<MessageCircle size={20} strokeWidth={1.9} />}
              title="Habla con nosotros"
              text="Te respondemos al toque por WhatsApp."
            />
            <TrustNote
              icon={<Store size={20} strokeWidth={1.9} />}
              title="Local real"
              text="Pasa a retirar o consultanos por delivery."
            />
            <TrustNote
              icon={<ShieldCheck size={20} strokeWidth={1.9} />}
              title="Sin vueltas"
              text="Horarios, pagos y ubicacion siempre a mano."
            />
          </ul>
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
            {contactData.whatsappHref ? (
              <div className={styles.cta} data-contact-whatsapp-cta>
                <span className={styles.ctaIcon} aria-hidden="true">
                  <MessageCircle size={24} strokeWidth={1.9} />
                </span>
                <div className={styles.ctaCopy}>
                  <p className={styles.ctaLabel}>Pedi por WhatsApp</p>
                  <p>{contactData.whatsappMessage}</p>
                </div>
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

            {hasAnyContactData ? (
              <ul className={styles.contactList}>
                <ContactItem
                  icon={<MessageCircle size={20} strokeWidth={1.8} />}
                  label="WhatsApp"
                  value={contactData.whatsappNumber}
                  href={contactData.whatsappHref}
                  external
                  fallback="WhatsApp no disponible por ahora."
                />
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
                  href={contactData.mapHref}
                  external={Boolean(contactData.mapHref)}
                  fallback="Direccion no disponible por ahora."
                />
              </ul>
            ) : (
              <EmptyState
                className={styles.emptyState}
                title="Contacto en preparacion"
                message="Todavia no hay datos publicos cargados para esta seccion."
              />
            )}

            <div className={styles.infoGrid}>
              <section className={styles.infoPanel} aria-labelledby="contact-hours-title">
                <div className={styles.panelHeading}>
                  <Clock size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span>Estos son nuestros horarios</span>
                  <h2 id="contact-hours-title">Horarios</h2>
                </div>
                <p className={styles.statusBadge}>
                  {contactData.isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
                </p>
                {contactData.hourRows.length ? (
                  <dl className={styles.dataList}>
                    {contactData.hourRows.map((row) => (
                      <div key={row.day} className={styles.dataRow}>
                        <dt>{row.day}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className={styles.panelFallback}>Horarios no disponibles por ahora.</p>
                )}
              </section>

              {contactData.paymentRows.length ? (
                <section className={styles.infoPanel} aria-labelledby="contact-payments-title">
                  <div className={styles.panelHeading}>
                    <CreditCard size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span>Paga como te quede mas comodo</span>
                    <h2 id="contact-payments-title">Pagos por transferencia</h2>
                  </div>
                  <dl className={styles.dataList}>
                    {contactData.paymentRows.map((row) => (
                      <div key={row.label} className={styles.dataRow}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </div>
          </div>

          <section className={styles.mapPanel} aria-labelledby="contact-map-title">
            <div className={styles.mapHeading}>
              <p className={styles.eyebrow}>Tambien podes encontrarnos aca</p>
              <h2 id="contact-map-title">Ubicacion</h2>
              <p>Te esperamos con comida rica y sin vueltas.</p>
            </div>
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
            {contactData.mapHref ? (
              <a
                className={styles.mapLink}
                href={contactData.mapHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir mapa
                <ExternalLink size={16} strokeWidth={1.9} aria-hidden="true" />
              </a>
            ) : null}
          </section>
        </section>
      ) : null}
    </main>
  );
}
