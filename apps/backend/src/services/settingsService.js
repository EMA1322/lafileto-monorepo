import { settingRepository } from '../repositories/settingRepository.js';
import { SITE_CONFIG_DEFAULTS, cloneSiteConfigDefaults } from '../settings/siteConfigDefaults.js';
import { validateAndSanitizeSiteConfig } from '../settings/siteConfigValidator.js';

const SITE_CONFIG_KEY = 'siteConfig';

function normalizeSiteConfig(rawValue) {
  const { sanitized } = validateAndSanitizeSiteConfig(rawValue);
  return sanitized;
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
