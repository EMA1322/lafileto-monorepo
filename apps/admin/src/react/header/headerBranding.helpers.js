export const SETTINGS_BRAND_LOGO_CACHE_KEY = 'admin.settings.brand.logo';
export const SETTINGS_BRAND_LOGO_EVENT = 'admin:settings-brand-logo-updated';

export function normalizeBrandLogoUrl(value) {
  return String(value || '').trim();
}

export function readCachedBrandLogo() {
  try {
    return normalizeBrandLogoUrl(localStorage.getItem(SETTINGS_BRAND_LOGO_CACHE_KEY));
  } catch {
    return '';
  }
}

export function getBrandLogoFromEvent(event) {
  return normalizeBrandLogoUrl(event?.detail?.logoUrl);
}
