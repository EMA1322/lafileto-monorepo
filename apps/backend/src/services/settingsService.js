import { settingRepository } from '../repositories/settingRepository.js';
import { SITE_CONFIG_DEFAULTS, cloneSiteConfigDefaults } from '../settings/siteConfigDefaults.js';
import { validateAndSanitizeSiteConfig } from '../settings/siteConfigValidator.js';

const SITE_CONFIG_KEY = 'siteConfig';

function normalizeSiteConfig(rawValue) {
  const { sanitized } = validateAndSanitizeSiteConfig(rawValue);
  return sanitized;
}

function mapPublicSettingsContract(normalized) {
  return {
    identity: {
      phone: normalized?.identity?.phone ?? '',
      email: normalized?.identity?.email ?? '',
      address: normalized?.identity?.address ?? ''
    },
    brand: {
      logo: normalized?.brand?.logo ?? '',
      favicon: normalized?.brand?.favicon ?? ''
    },
    socialLinks: Array.isArray(normalized?.socialLinks) ? normalized.socialLinks : [],
    map: {
      embedSrc: normalized?.map?.embedSrc ?? ''
    },
    hours: {
      timezone: normalized?.hours?.timezone ?? SITE_CONFIG_DEFAULTS.hours.timezone,
      alert: {
        enabled: Boolean(normalized?.hours?.alert?.enabled),
        message: normalized?.hours?.alert?.message ?? ''
      }
    },
    seo: {
      contact: {
        title: normalized?.seo?.contact?.title ?? '',
        description: normalized?.seo?.contact?.description ?? ''
      },
      about: {
        title: normalized?.seo?.about?.title ?? '',
        description: normalized?.seo?.about?.description ?? ''
      }
    },
    whatsapp: {
      number: normalized?.whatsapp?.number ?? '',
      message: normalized?.whatsapp?.message ?? ''
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
  },

  async getPublicSettingsContract() {
    const normalized = await this.getPublicSettings();
    return mapPublicSettingsContract(normalized);
  },

  async updateAdminSettings(sanitizedPayload, actorUserId) {
    const nextValue = {
      ...sanitizedPayload,
      meta: {
        updatedByUserId: actorUserId ?? null,
        updatedAt: new Date().toISOString()
      }
    };

    await settingRepository.upsertByKey(SITE_CONFIG_KEY, nextValue);

    return sanitizedPayload;
  }
};

export { SITE_CONFIG_DEFAULTS, SITE_CONFIG_KEY, normalizeSiteConfig, mapPublicSettingsContract };
