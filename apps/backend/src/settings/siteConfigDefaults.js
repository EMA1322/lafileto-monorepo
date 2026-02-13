export const SITE_CONFIG_DEFAULTS = {
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

export function cloneSiteConfigDefaults() {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(SITE_CONFIG_DEFAULTS);
  }

  return JSON.parse(JSON.stringify(SITE_CONFIG_DEFAULTS));
}
