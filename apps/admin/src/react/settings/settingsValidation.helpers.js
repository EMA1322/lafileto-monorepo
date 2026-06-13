const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HTTP_URL_PROTOCOLS = new Set(['http:', 'https:']);
const GOOGLE_MAPS_EMBED_HOSTS = new Set(['google.com', 'www.google.com', 'maps.google.com']);

export const CBU_LENGTH = 22;
export const SEO_TITLE_MAX_LENGTH = 70;
export const SEO_DESCRIPTION_MAX_LENGTH = 180;
export const TEXT_MAX_LENGTHS = {
  address: 180,
  whatsappMessage: 280,
  alertMessage: 280,
  socialLabel: 40,
  bankName: 80,
  alias: 40,
};
export const OVERRIDE_OPTIONS = ['AUTO', 'FORCE_OPEN', 'FORCE_CLOSED'];

export function normalizeDigits(value) {
  return String(value || '').replace(/\D+/g, '');
}

export function formatCbuMask(value) {
  const digits = normalizeDigits(value).slice(0, CBU_LENGTH);
  const parts = digits.match(/.{1,4}/g) || [];
  return parts.join(' ');
}

export function isValidHttpUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;

  try {
    const parsed = new URL(raw);
    return HTTP_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function extractEmbedSrc(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!raw.includes('<iframe')) return raw;

  const match = raw.match(/src\s*=\s*['"]([^'"]+)['"]/i);
  return match?.[1]?.trim() || '';
}

export function isValidGoogleMapsEmbed(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const allowedHost = [...GOOGLE_MAPS_EMBED_HOSTS].some(
      (entry) => host === entry || host.endsWith(`.${entry}`),
    );
    return (
      HTTP_URL_PROTOCOLS.has(parsed.protocol) &&
      allowedHost &&
      parsed.pathname.startsWith('/maps/embed')
    );
  } catch {
    return false;
  }
}

function toMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function setError(errors, path, message) {
  if (!errors[path]) errors[path] = message;
}

function validateLength(errors, path, value, max, label) {
  if (String(value || '').length > max) {
    setError(errors, path, `${label} admite hasta ${max} caracteres.`);
  }
}

export function normalizeBackendFieldPath(path) {
  return String(path || '')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .trim();
}

export function mapSettingsApiError(error) {
  const fieldErrors = {};
  const fields = error?.details?.fields;

  if (Array.isArray(fields)) {
    fields.forEach((entry) => {
      const path = normalizeBackendFieldPath(entry?.path);
      if (!path) return;
      fieldErrors[path] = entry?.message || 'Valor invalido.';
    });
  }

  return {
    fieldErrors,
    generalError:
      Object.keys(fieldErrors).length > 0
        ? 'Hay errores de validacion para corregir.'
        : error?.message || 'No se pudo guardar la configuracion.',
  };
}

export function validateSettingsDraft(draft) {
  const errors = {};

  if (draft.identity.email && !EMAIL_REGEX.test(draft.identity.email)) {
    setError(errors, 'identity.email', 'Ingresa un email valido.');
  }

  validateLength(
    errors,
    'identity.address',
    draft.identity.address,
    TEXT_MAX_LENGTHS.address,
    'La direccion',
  );
  validateLength(
    errors,
    'whatsapp.message',
    draft.whatsapp.message,
    TEXT_MAX_LENGTHS.whatsappMessage,
    'El mensaje de WhatsApp',
  );

  draft.socialLinks.forEach((link, index) => {
    if (!link.label && !link.url) return;
    if (!link.label) setError(errors, `socialLinks.${index}.label`, 'Ingresa un nombre.');
    if (link.label.length > TEXT_MAX_LENGTHS.socialLabel) {
      setError(errors, `socialLinks.${index}.label`, 'El nombre admite hasta 40 caracteres.');
    }
    if (!isValidHttpUrl(link.url)) {
      setError(errors, `socialLinks.${index}.url`, 'La URL debe comenzar con http:// o https://');
    }
  });

  const mapEmbedSrc = extractEmbedSrc(draft.map.embedSrc);
  if (draft.map.embedSrc && !mapEmbedSrc) {
    setError(errors, 'map.embedSrc', 'Pega un src valido de Google Maps.');
  } else if (mapEmbedSrc && !isValidGoogleMapsEmbed(mapEmbedSrc)) {
    setError(errors, 'map.embedSrc', 'El mapa debe ser un embed valido de Google Maps.');
  }

  if (draft.brand.logo && !isValidHttpUrl(draft.brand.logo)) {
    setError(errors, 'brand.logo', 'La URL del logo debe comenzar con http:// o https://');
  }
  if (draft.brand.favicon && !isValidHttpUrl(draft.brand.favicon)) {
    setError(errors, 'brand.favicon', 'La URL del favicon debe comenzar con http:// o https://');
  }

  if (draft.payments.enabled) {
    const hasCbu = normalizeDigits(draft.payments.cbu).length > 0;
    const hasAlias = String(draft.payments.alias || '').trim().length > 0;

    if (!hasCbu && !hasAlias) {
      setError(errors, 'payments.cbu', 'Ingresa CBU o Alias.');
      setError(errors, 'payments.alias', 'Ingresa CBU o Alias.');
    }
    if (hasCbu && normalizeDigits(draft.payments.cbu).length !== CBU_LENGTH) {
      setError(errors, 'payments.cbu', 'El CBU debe tener 22 digitos.');
    }
    if (
      normalizeDigits(draft.payments.cuit).length > 0 &&
      normalizeDigits(draft.payments.cuit).length !== 11
    ) {
      setError(errors, 'payments.cuit', 'El CUIT debe tener 11 digitos.');
    }
  }

  validateLength(
    errors,
    'payments.bankName',
    draft.payments.bankName,
    TEXT_MAX_LENGTHS.bankName,
    'El banco',
  );
  validateLength(
    errors,
    'payments.alias',
    draft.payments.alias,
    TEXT_MAX_LENGTHS.alias,
    'El alias',
  );

  if (!OVERRIDE_OPTIONS.includes(draft.hours.override)) {
    setError(errors, 'hours.override', 'Selecciona una opcion valida.');
  }

  draft.hours.openingHours.forEach((slot, index) => {
    if (slot.closed) return;

    const hasOpen = Boolean(slot.open);
    const hasClose = Boolean(slot.close);

    if ((hasOpen && !HH_MM_REGEX.test(slot.open)) || (hasClose && !HH_MM_REGEX.test(slot.close))) {
      setError(errors, `hours.openingHours.${index}`, 'Usa formato HH:MM en 24h.');
      return;
    }
    if (hasOpen && hasClose && toMinutes(slot.open) >= toMinutes(slot.close)) {
      setError(errors, `hours.openingHours.${index}`, 'La apertura debe ser menor al cierre.');
    }
  });

  validateLength(
    errors,
    'hours.alert.message',
    draft.hours.alert.message,
    TEXT_MAX_LENGTHS.alertMessage,
    'El mensaje del banner',
  );
  validateLength(
    errors,
    'seo.contact.title',
    draft.seo.contact.title,
    SEO_TITLE_MAX_LENGTH,
    'El meta titulo de Contacto',
  );
  validateLength(
    errors,
    'seo.about.title',
    draft.seo.about.title,
    SEO_TITLE_MAX_LENGTH,
    'El meta titulo de Nosotros',
  );
  validateLength(
    errors,
    'seo.contact.description',
    draft.seo.contact.description,
    SEO_DESCRIPTION_MAX_LENGTH,
    'La meta descripcion de Contacto',
  );
  validateLength(
    errors,
    'seo.about.description',
    draft.seo.about.description,
    SEO_DESCRIPTION_MAX_LENGTH,
    'La meta descripcion de Nosotros',
  );

  return errors;
}
