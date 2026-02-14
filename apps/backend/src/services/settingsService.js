import { settingRepository } from '../repositories/settingRepository.js';
import { SITE_CONFIG_DEFAULTS, cloneSiteConfigDefaults } from '../settings/siteConfigDefaults.js';
import { validateAndSanitizeSiteConfig } from '../settings/siteConfigValidator.js';
import { createError } from '../utils/errors.js';

const SITE_CONFIG_KEY = 'siteConfig';

function normalizeSiteConfig(rawValue) {
  const { sanitized } = validateAndSanitizeSiteConfig(rawValue);
  return sanitized;
}

function toFieldError(errorMessage) {
  const [path = 'siteConfig'] = String(errorMessage).split(' ');
  return {
    path,
    message: errorMessage
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

  async updateAdminSettings(payload, actorUserId) {
    const { sanitized, errors } = validateAndSanitizeSiteConfig(payload);

    if (errors.length) {
      throw createError('BAD_REQUEST', 'Datos inválidos.', {
        fields: errors.map(toFieldError)
      });
    }

    const nextValue = {
      ...sanitized,
      meta: {
        updatedByUserId: actorUserId ?? null,
        updatedAt: new Date().toISOString()
      }
    };

    await settingRepository.upsertByKey(SITE_CONFIG_KEY, nextValue);

    return sanitized;
  }
};

export { SITE_CONFIG_DEFAULTS, SITE_CONFIG_KEY, normalizeSiteConfig };
