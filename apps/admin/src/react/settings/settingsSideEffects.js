const SETTINGS_BRAND_LOGO_CACHE_KEY = 'admin.settings.brand.logo';
const SETTINGS_BRAND_LOGO_EVENT = 'admin:settings-brand-logo-updated';

function readBrandLogo(siteConfig) {
  return String(siteConfig?.brand?.logo || '').trim();
}

export function persistSettingsBrandLogo(siteConfig) {
  const logoUrl = readBrandLogo(siteConfig);

  try {
    if (!logoUrl) {
      localStorage.removeItem(SETTINGS_BRAND_LOGO_CACHE_KEY);
      return;
    }

    localStorage.setItem(SETTINGS_BRAND_LOGO_CACHE_KEY, logoUrl);
  } catch {
    // Storage can be unavailable in private mode.
  }
}

export function emitSettingsBrandLogoUpdate(siteConfig) {
  const logoUrl = readBrandLogo(siteConfig);

  document.dispatchEvent(
    new CustomEvent(SETTINGS_BRAND_LOGO_EVENT, {
      detail: {
        logoUrl,
      },
    }),
  );
}

export function syncSettingsBranding(siteConfig) {
  persistSettingsBrandLogo(siteConfig);
  emitSettingsBrandLogoUpdate(siteConfig);
}

export { SETTINGS_BRAND_LOGO_CACHE_KEY, SETTINGS_BRAND_LOGO_EVENT };
