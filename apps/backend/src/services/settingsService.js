import { settingRepository } from '../repositories/settingRepository.js';
import { SITE_CONFIG_DEFAULTS, cloneSiteConfigDefaults } from '../settings/siteConfigDefaults.js';

const SITE_CONFIG_KEY = 'siteConfig';

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
      phone: identity.phone ?? SITE_CONFIG_DEFAULTS.identity.phone,
      email: identity.email ?? SITE_CONFIG_DEFAULTS.identity.email,
      address: identity.address ?? SITE_CONFIG_DEFAULTS.identity.address
    },
    whatsapp: {
      number: whatsapp.number ?? SITE_CONFIG_DEFAULTS.whatsapp.number,
      message: whatsapp.message ?? SITE_CONFIG_DEFAULTS.whatsapp.message
    },
    socialLinks: normalizeArray(root.socialLinks),
    map: {
      embedSrc: map.embedSrc ?? SITE_CONFIG_DEFAULTS.map.embedSrc
    },
    payments: {
      enabled: Boolean(payments.enabled),
      bankName: payments.bankName ?? SITE_CONFIG_DEFAULTS.payments.bankName,
      cbu: payments.cbu ?? SITE_CONFIG_DEFAULTS.payments.cbu,
      alias: payments.alias ?? SITE_CONFIG_DEFAULTS.payments.alias,
      cuit: payments.cuit ?? SITE_CONFIG_DEFAULTS.payments.cuit
    },
    hours: {
      timezone: hours.timezone ?? SITE_CONFIG_DEFAULTS.hours.timezone,
      openingHours: normalizeArray(hours.openingHours),
      override: hours.override ?? SITE_CONFIG_DEFAULTS.hours.override,
      alert: {
        enabled: Boolean(alert.enabled),
        message: alert.message ?? SITE_CONFIG_DEFAULTS.hours.alert.message
      }
    },
    brand: {
      logo: brand.logo ?? SITE_CONFIG_DEFAULTS.brand.logo,
      favicon: brand.favicon ?? SITE_CONFIG_DEFAULTS.brand.favicon
    },
    seo: {
      contact: {
        title: contactSeo.title ?? SITE_CONFIG_DEFAULTS.seo.contact.title,
        description: contactSeo.description ?? SITE_CONFIG_DEFAULTS.seo.contact.description
      },
      about: {
        title: aboutSeo.title ?? SITE_CONFIG_DEFAULTS.seo.about.title,
        description: aboutSeo.description ?? SITE_CONFIG_DEFAULTS.seo.about.description
      }
    }
  };
}

async function getOrCreateSiteConfigSetting() {
  const found = await settingRepository.findByKey(SITE_CONFIG_KEY);

  if (found) {
    return found;
  }

  return settingRepository.upsertByKey(SITE_CONFIG_KEY, cloneSiteConfigDefaults());
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

export { SITE_CONFIG_DEFAULTS, SITE_CONFIG_KEY, normalizeSiteConfig };
