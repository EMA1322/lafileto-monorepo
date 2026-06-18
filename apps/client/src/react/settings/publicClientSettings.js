import {
  fetchBusinessStatus,
  fetchCommercialConfig,
  fetchPublicSettings,
} from '/src/api/public.js';

const SOCIAL_LABELS = new Map([
  ['facebook', { label: 'Facebook', shortLabel: 'FB' }],
  ['instagram', { label: 'Instagram', shortLabel: 'IG' }],
  ['twitter', { label: 'Twitter', shortLabel: 'TW' }],
  ['x', { label: 'X', shortLabel: 'X' }],
  ['tiktok', { label: 'TikTok', shortLabel: 'TT' }],
  ['youtube', { label: 'YouTube', shortLabel: 'YT' }],
]);

function getString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function compactDigits(value) {
  return getString(value).replace(/\D/g, '');
}

export function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidAssetUrl(value) {
  const url = getString(value);
  if (!url) return false;
  if (url.startsWith('/')) return true;
  if (url.startsWith('data:image/')) return true;
  return isValidHttpUrl(url);
}

export function isValidGoogleMapsEmbedUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      ['google.com', 'www.google.com', 'maps.google.com'].includes(hostname) &&
      url.pathname.startsWith('/maps/embed')
    );
  } catch {
    return false;
  }
}

function getFirstString(candidates) {
  return candidates.map(getString).find(Boolean) || '';
}

function normalizeSocialKey(link) {
  return getString(link?.type || link?.platform || link?.label || link?.name).toLowerCase();
}

function getSocialMetadata(key, label) {
  const known = SOCIAL_LABELS.get(key);
  if (known) return { ...known, type: key };

  const fallbackLabel = label || key || 'Red social';
  return {
    label: fallbackLabel,
    shortLabel: fallbackLabel.slice(0, 2).toUpperCase(),
    type: key || fallbackLabel.toLowerCase(),
  };
}

function normalizeSocialLinks(settingsLinks, commercialLinks) {
  const seen = new Set();
  const links = [...toArray(settingsLinks), ...toArray(commercialLinks)];

  return links.reduce((acc, link) => {
    const url = getString(link?.url || link?.href);
    const key = normalizeSocialKey(link);
    const rawLabel = getString(link?.label || link?.name || link?.platform || link?.type);

    if (!key || !isValidHttpUrl(url) || seen.has(key)) {
      return acc;
    }

    seen.add(key);
    acc.push({ ...getSocialMetadata(key, rawLabel), url });
    return acc;
  }, []);
}

function normalizeAlert(settings, businessStatus) {
  const statusAlert = businessStatus?.alert;
  const settingsAlert = settings?.hours?.alert;
  const statusMessage = getString(statusAlert?.message);
  const settingsMessage = getString(settingsAlert?.message);

  if (statusAlert?.enabled === true && statusMessage) {
    return { enabled: true, message: statusMessage };
  }

  if (settingsAlert?.enabled === true && settingsMessage) {
    return { enabled: true, message: settingsMessage };
  }

  return { enabled: false, message: '' };
}

function normalizePayments(payments) {
  const transferEnabled = payments?.transferEnabled === true;

  if (!transferEnabled) {
    return { transferEnabled: false };
  }

  return {
    transferEnabled: true,
    bankName: getString(payments?.bankName),
    cbu: getString(payments?.cbu),
    alias: getString(payments?.alias),
    cuit: getString(payments?.cuit),
  };
}

function normalizeOpeningHours(openingHours) {
  return toArray(openingHours).map((entry) => ({
    day: getString(entry?.day),
    open: getString(entry?.open),
    close: getString(entry?.close),
    closed: entry?.closed === true,
  }));
}

export function normalizePublicClientSettings({
  settings = {},
  businessStatus = {},
  commercialConfig = {},
  errors = {},
} = {}) {
  const phone = getFirstString([settings?.identity?.phone, commercialConfig?.contact?.phone]);
  const whatsappNumber = getFirstString([
    settings?.whatsapp?.number,
    commercialConfig?.whatsapp?.number,
    settings?.identity?.phone,
  ]);
  const whatsappMessageCta = getFirstString([
    settings?.whatsapp?.messageCta,
    settings?.whatsapp?.message,
    commercialConfig?.whatsapp?.messageCta,
    commercialConfig?.whatsapp?.message,
  ]);
  const logoUrl = getFirstString([
    settings?.brand?.logoUrl,
    settings?.brand?.logo,
    settings?.identity?.logo,
  ]);
  const faviconUrl = getFirstString([settings?.brand?.faviconUrl, settings?.brand?.favicon]);
  const mapHref = getFirstString([
    settings?.map?.url,
    settings?.map?.href,
    settings?.map?.embedSrc,
  ]);
  const mapEmbedSrc = getString(settings?.map?.embedSrc);
  const seoContact = settings?.seo?.contact || {};

  return {
    alert: normalizeAlert(settings, businessStatus),
    brand: {
      logoUrl: isValidAssetUrl(logoUrl) ? logoUrl : '',
      faviconUrl: isValidAssetUrl(faviconUrl) ? faviconUrl : '',
      name: getFirstString([settings?.brand?.name, settings?.brandName, settings?.businessName]),
    },
    contact: {
      address: getFirstString([settings?.identity?.address, commercialConfig?.contact?.address]),
      email: getFirstString([settings?.identity?.email, commercialConfig?.contact?.email]),
      phone,
      phoneHref: compactDigits(phone) ? `tel:${compactDigits(phone)}` : '',
      mapHref: isValidHttpUrl(mapHref) ? mapHref : '',
    },
    errors,
    isOpen: businessStatus?.isOpen === true,
    map: {
      embedSrc: isValidGoogleMapsEmbedUrl(mapEmbedSrc) ? mapEmbedSrc : '',
    },
    hours: {
      alert: normalizeAlert(settings, businessStatus),
      openingHours: normalizeOpeningHours(settings?.hours?.openingHours),
      timezone: getString(settings?.hours?.timezone),
    },
    payments: normalizePayments(settings?.payments),
    seo: {
      contactDescription: getString(seoContact.description),
      contactTitle: getString(seoContact.title),
    },
    socialLinks: normalizeSocialLinks(settings?.socialLinks, commercialConfig?.socialLinks),
    whatsapp: {
      messageCta: whatsappMessageCta,
      number: whatsappNumber,
      numberDigits: compactDigits(whatsappNumber),
    },
  };
}

export async function loadPublicClientSettings() {
  const [settingsResult, businessStatusResult, commercialConfigResult] = await Promise.allSettled([
    fetchPublicSettings(),
    fetchBusinessStatus(),
    fetchCommercialConfig(),
  ]);

  return normalizePublicClientSettings({
    settings: settingsResult.status === 'fulfilled' ? settingsResult.value || {} : {},
    businessStatus:
      businessStatusResult.status === 'fulfilled' ? businessStatusResult.value || {} : {},
    commercialConfig:
      commercialConfigResult.status === 'fulfilled' ? commercialConfigResult.value || {} : {},
    errors: {
      settings: settingsResult.status === 'rejected' ? settingsResult.reason : null,
      businessStatus:
        businessStatusResult.status === 'rejected' ? businessStatusResult.reason : null,
      commercialConfig:
        commercialConfigResult.status === 'rejected' ? commercialConfigResult.reason : null,
    },
  });
}

export function applyClientFavicon(faviconUrl, doc = document) {
  const url = isValidAssetUrl(faviconUrl) ? faviconUrl : '';
  if (!url || !doc?.head) return;

  let link = doc.querySelector("link[rel='icon']");
  if (!link) {
    link = doc.createElement('link');
    link.setAttribute('rel', 'icon');
    doc.head.appendChild(link);
  }

  link.setAttribute('href', url);
}
