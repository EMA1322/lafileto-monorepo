import { cloneSiteConfigDefaults } from './siteConfigDefaults.js';

const MAX_LENGTHS = {
  address: 180,
  whatsappMessage: 280,
  alertMessage: 280,
  seoTitle: 70,
  seoDescription: 180,
  socialLabel: 40,
  bankName: 80,
  alias: 40
};

const GOOGLE_MAPS_EMBED_HOSTS = new Set(['google.com', 'www.google.com', 'maps.google.com']);

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function digitsOnly(value) {
  return trimString(value).replace(/\D+/g, '');
}

function trimToMax(value, max) {
  return trimString(value).slice(0, max);
}

function isValidHttpUrl(value) {
  const raw = trimString(value);
  if (!raw) {
    return false;
  }

  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeSocialLinks(rawLinks) {
  return normalizeArray(rawLinks)
    .map((item) => normalizeObject(item))
    .map((item) => {
      const label = trimToMax(item.label, MAX_LENGTHS.socialLabel);
      const url = trimString(item.url);

      if (!label || !isValidHttpUrl(url)) {
        return null;
      }

      return { label, url };
    })
    .filter(Boolean);
}

function sanitizeMapEmbedSrc(value) {
  const raw = trimString(value);
  if (!raw) {
    return '';
  }

  try {
    const parsed = new URL(raw);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    if (!isHttp) {
      return '';
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowedHost = [...GOOGLE_MAPS_EMBED_HOSTS].some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
    const hasEmbedPath = parsed.pathname.startsWith('/maps/embed');

    if (!isAllowedHost || !hasEmbedPath) {
      return '';
    }

    return raw;
  } catch {
    return '';
  }
}

function sanitizeOpeningHours(value) {
  return normalizeArray(value).map((entry) => {
    const item = normalizeObject(entry);

    return {
      day: trimString(item.day),
      open: trimString(item.open),
      close: trimString(item.close),
      closed: Boolean(item.closed)
    };
  });
}

export function sanitizeSiteConfig(input) {
  const defaults = cloneSiteConfigDefaults();
  const root = normalizeObject(input);

  const identity = normalizeObject(root.identity);
  const whatsapp = normalizeObject(root.whatsapp);
  const map = normalizeObject(root.map);
  const payments = normalizeObject(root.payments);
  const hours = normalizeObject(root.hours);
  const hoursAlert = normalizeObject(hours.alert);
  const brand = normalizeObject(root.brand);
  const seo = normalizeObject(root.seo);
  const contactSeo = normalizeObject(seo.contact);
  const aboutSeo = normalizeObject(seo.about);

  return {
    ...defaults,
    identity: {
      ...defaults.identity,
      phone: digitsOnly(identity.phone),
      email: trimString(identity.email),
      address: trimToMax(identity.address, MAX_LENGTHS.address)
    },
    whatsapp: {
      ...defaults.whatsapp,
      number: digitsOnly(whatsapp.number),
      message: trimToMax(whatsapp.message, MAX_LENGTHS.whatsappMessage)
    },
    socialLinks: sanitizeSocialLinks(root.socialLinks),
    map: {
      ...defaults.map,
      embedSrc: sanitizeMapEmbedSrc(map.embedSrc)
    },
    payments: {
      ...defaults.payments,
      enabled: Boolean(payments.enabled),
      bankName: trimToMax(payments.bankName, MAX_LENGTHS.bankName),
      cbu: digitsOnly(payments.cbu),
      alias: trimToMax(payments.alias, MAX_LENGTHS.alias),
      cuit: digitsOnly(payments.cuit)
    },
    hours: {
      ...defaults.hours,
      timezone: trimString(hours.timezone) || defaults.hours.timezone,
      openingHours: sanitizeOpeningHours(hours.openingHours),
      override: trimString(hours.override) || defaults.hours.override,
      alert: {
        ...defaults.hours.alert,
        enabled: Boolean(hoursAlert.enabled),
        message: trimToMax(hoursAlert.message, MAX_LENGTHS.alertMessage)
      }
    },
    brand: {
      ...defaults.brand,
      logo: trimString(brand.logo),
      favicon: trimString(brand.favicon)
    },
    seo: {
      contact: {
        title: trimToMax(contactSeo.title, MAX_LENGTHS.seoTitle),
        description: trimToMax(contactSeo.description, MAX_LENGTHS.seoDescription)
      },
      about: {
        title: trimToMax(aboutSeo.title, MAX_LENGTHS.seoTitle),
        description: trimToMax(aboutSeo.description, MAX_LENGTHS.seoDescription)
      }
    }
  };
}

export { digitsOnly, isValidHttpUrl, MAX_LENGTHS };
