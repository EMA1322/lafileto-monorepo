import { settingRepository } from '../repositories/settingRepository.js';

const SITE_CONFIG_KEY = 'siteConfig';

const DEFAULT_SITE_CONFIG = {
  identity: {
    phone: '',
    email: '',
    address: ''
  },
  whatsapp: {
    number: '',
    message: ''
  },
  socialLinks: [],
  map: {
    embedSrc: ''
  },
  payments: {
    enabled: false,
    bankName: '',
    cbu: '',
    alias: '',
    cuit: ''
  },
  hours: {
    timezone: 'America/Argentina/San_Luis',
    openingHours: [],
    override: 'AUTO',
    alert: {
      enabled: false,
      message: ''
    }
  },
  brand: {
    logo: '',
    favicon: ''
  },
  seo: {
    contact: {
      title: '',
      description: ''
    },
    about: {
      title: '',
      description: ''
    }
  }
};

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeSiteConfig(rawValue) {
  const root = normalizeObject(rawValue);
  const identity = normalizeObject(root.identity);
  const whatsapp = normalizeObject(root.whatsapp);
  const map = normalizeObject(root.map);
  const payments = normalizeObject(root.payments);
  const hours = normalizeObject(root.hours);
  const alert = normalizeObject(hours.alert);
  const brand = normalizeObject(root.brand);
  const seo = normalizeObject(root.seo);
  const contactSeo = normalizeObject(seo.contact);
  const aboutSeo = normalizeObject(seo.about);

  return {
    identity: {
      phone: identity.phone ?? DEFAULT_SITE_CONFIG.identity.phone,
      email: identity.email ?? DEFAULT_SITE_CONFIG.identity.email,
      address: identity.address ?? DEFAULT_SITE_CONFIG.identity.address
    },
    whatsapp: {
      number: whatsapp.number ?? DEFAULT_SITE_CONFIG.whatsapp.number,
      message: whatsapp.message ?? DEFAULT_SITE_CONFIG.whatsapp.message
    },
    socialLinks: normalizeArray(root.socialLinks),
    map: {
      embedSrc: map.embedSrc ?? DEFAULT_SITE_CONFIG.map.embedSrc
    },
    payments: {
      enabled: Boolean(payments.enabled),
      bankName: payments.bankName ?? DEFAULT_SITE_CONFIG.payments.bankName,
      cbu: payments.cbu ?? DEFAULT_SITE_CONFIG.payments.cbu,
      alias: payments.alias ?? DEFAULT_SITE_CONFIG.payments.alias,
      cuit: payments.cuit ?? DEFAULT_SITE_CONFIG.payments.cuit
    },
    hours: {
      timezone: hours.timezone ?? DEFAULT_SITE_CONFIG.hours.timezone,
      openingHours: normalizeArray(hours.openingHours),
      override: hours.override ?? DEFAULT_SITE_CONFIG.hours.override,
      alert: {
        enabled: Boolean(alert.enabled),
        message: alert.message ?? DEFAULT_SITE_CONFIG.hours.alert.message
      }
    },
    brand: {
      logo: brand.logo ?? DEFAULT_SITE_CONFIG.brand.logo,
      favicon: brand.favicon ?? DEFAULT_SITE_CONFIG.brand.favicon
    },
    seo: {
      contact: {
        title: contactSeo.title ?? DEFAULT_SITE_CONFIG.seo.contact.title,
        description: contactSeo.description ?? DEFAULT_SITE_CONFIG.seo.contact.description
      },
      about: {
        title: aboutSeo.title ?? DEFAULT_SITE_CONFIG.seo.about.title,
        description: aboutSeo.description ?? DEFAULT_SITE_CONFIG.seo.about.description
      }
    }
  };
}

async function getOrCreateSiteConfigSetting() {
  const found = await settingRepository.findByKey(SITE_CONFIG_KEY);

  if (found) {
    return found;
  }

  return settingRepository.upsertByKey(SITE_CONFIG_KEY, DEFAULT_SITE_CONFIG);
}

export const settingsService = {
  async getAdminSettings() {
    const setting = await getOrCreateSiteConfigSetting();
    return normalizeSiteConfig(setting?.value);
  },

  async getPublicSettings() {
    const setting = await getOrCreateSiteConfigSetting();
    const normalized = normalizeSiteConfig(setting?.value);

    if (!normalized.payments.enabled) {
      return {
        ...normalized,
        payments: { enabled: false }
      };
    }

    return normalized;
  }
};

export { DEFAULT_SITE_CONFIG, SITE_CONFIG_KEY, normalizeSiteConfig };
