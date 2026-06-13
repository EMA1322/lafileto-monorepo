import { extractEmbedSrc, normalizeDigits } from './settingsValidation.helpers.js';

export const DEFAULT_WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DEFAULT_SETTINGS = {
  identity: {
    phone: '',
    email: '',
    address: '',
  },
  whatsapp: {
    number: '',
    message: '',
  },
  socialLinks: [],
  map: {
    embedSrc: '',
  },
  payments: {
    enabled: false,
    bankName: '',
    cbu: '',
    alias: '',
    cuit: '',
  },
  hours: {
    timezone: 'America/Argentina/San_Luis',
    openingHours: [],
    override: 'AUTO',
    alert: {
      enabled: false,
      message: '',
    },
  },
  brand: {
    logo: '',
    favicon: '',
  },
  seo: {
    contact: {
      title: '',
      description: '',
    },
    about: {
      title: '',
      description: '',
    },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOpeningHours(value) {
  const source = Array.isArray(value) && value.length > 0 ? value : [];
  const normalized = source.slice(0, 7).map((slot, index) => {
    const item = asObject(slot);
    return {
      ...item,
      day: trimString(item.day) || DEFAULT_WEEK_DAYS[index],
      open: typeof item.open === 'string' ? item.open : '',
      close: typeof item.close === 'string' ? item.close : '',
      closed: Boolean(item.closed),
    };
  });

  while (normalized.length < 7) {
    normalized.push({
      day: DEFAULT_WEEK_DAYS[normalized.length],
      open: '',
      close: '',
      closed: false,
    });
  }

  return normalized;
}

export function normalizeSettingsConfig(value) {
  const root = asObject(value);
  const defaults = clone(DEFAULT_SETTINGS);
  const hours = asObject(root.hours);
  const seo = asObject(root.seo);

  return {
    ...root,
    identity: { ...defaults.identity, ...asObject(root.identity) },
    whatsapp: { ...defaults.whatsapp, ...asObject(root.whatsapp) },
    socialLinks: Array.isArray(root.socialLinks)
      ? root.socialLinks.map((item) => ({
          label: trimString(item?.label),
          url: trimString(item?.url),
        }))
      : [],
    map: { ...defaults.map, ...asObject(root.map) },
    payments: { ...defaults.payments, ...asObject(root.payments) },
    hours: {
      ...defaults.hours,
      ...hours,
      openingHours: normalizeOpeningHours(hours.openingHours),
      alert: { ...defaults.hours.alert, ...asObject(hours.alert) },
    },
    brand: { ...defaults.brand, ...asObject(root.brand) },
    seo: {
      ...defaults.seo,
      ...seo,
      contact: { ...defaults.seo.contact, ...asObject(seo.contact) },
      about: { ...defaults.seo.about, ...asObject(seo.about) },
    },
  };
}

function sanitizeSocialLinks(links) {
  return (Array.isArray(links) ? links : [])
    .map((link) => ({
      label: trimString(link?.label),
      url: trimString(link?.url),
    }))
    .filter((link) => link.label || link.url);
}

export function buildSettingsPayload(originalConfig, draftConfig) {
  const original = normalizeSettingsConfig(originalConfig);
  const draft = normalizeSettingsConfig(draftConfig);

  return {
    ...original,
    ...draft,
    identity: {
      ...original.identity,
      ...draft.identity,
      phone: normalizeDigits(draft.identity.phone),
      email: trimString(draft.identity.email),
      address: trimString(draft.identity.address),
    },
    whatsapp: {
      ...original.whatsapp,
      ...draft.whatsapp,
      number: normalizeDigits(draft.whatsapp.number),
      message: trimString(draft.whatsapp.message),
    },
    socialLinks: sanitizeSocialLinks(draft.socialLinks),
    map: {
      ...original.map,
      ...draft.map,
      embedSrc: extractEmbedSrc(draft.map.embedSrc),
    },
    payments: {
      ...original.payments,
      ...draft.payments,
      enabled: Boolean(draft.payments.enabled),
      bankName: trimString(draft.payments.bankName),
      cbu: normalizeDigits(draft.payments.cbu),
      alias: trimString(draft.payments.alias),
      cuit: normalizeDigits(draft.payments.cuit),
    },
    hours: {
      ...original.hours,
      ...draft.hours,
      openingHours: normalizeOpeningHours(draft.hours.openingHours).map((slot) => ({
        ...slot,
        open: slot.closed ? '' : trimString(slot.open),
        close: slot.closed ? '' : trimString(slot.close),
      })),
      override: trimString(draft.hours.override) || 'AUTO',
      alert: {
        ...original.hours.alert,
        ...draft.hours.alert,
        enabled: Boolean(draft.hours.alert.enabled),
        message: trimString(draft.hours.alert.message),
      },
    },
    brand: {
      ...original.brand,
      ...draft.brand,
      logo: trimString(draft.brand.logo),
      favicon: trimString(draft.brand.favicon),
    },
    seo: {
      ...original.seo,
      ...draft.seo,
      contact: {
        ...original.seo.contact,
        ...draft.seo.contact,
        title: trimString(draft.seo.contact.title),
        description: trimString(draft.seo.contact.description),
      },
      about: {
        ...original.seo.about,
        ...draft.seo.about,
        title: trimString(draft.seo.about.title),
        description: trimString(draft.seo.about.description),
      },
    },
  };
}

export function serializeSettings(value) {
  return JSON.stringify(normalizeSettingsConfig(value));
}
