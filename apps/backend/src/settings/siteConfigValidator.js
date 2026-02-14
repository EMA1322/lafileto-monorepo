import { MAX_LENGTHS, isValidHttpUrl, sanitizeSiteConfig } from './siteConfigSanitizers.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOURS_OVERRIDE_VALUES = new Set(['AUTO', 'FORCE_OPEN', 'FORCE_CLOSED']);

function isValidDigitsLength(value, min, max) {
  return value.length >= min && value.length <= max;
}

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function validateSiteConfig(config) {
  const errors = [];

  if (config.identity.email && !EMAIL_REGEX.test(config.identity.email)) {
    errors.push('identity.email must be a valid email address');
  }

  if (config.identity.phone && !isValidDigitsLength(config.identity.phone, 6, 20)) {
    errors.push('identity.phone must contain between 6 and 20 digits');
  }

  if (config.whatsapp.number && !isValidDigitsLength(config.whatsapp.number, 6, 20)) {
    errors.push('whatsapp.number must contain between 6 and 20 digits');
  }

  for (const [index, link] of config.socialLinks.entries()) {
    if (!isValidHttpUrl(link.url)) {
      errors.push(`socialLinks[${index}].url must use http/https`);
    }
  }

  if (config.payments.enabled) {
    const hasCBU = Boolean(config.payments.cbu);
    const hasAlias = Boolean(config.payments.alias);

    if (!hasCBU && !hasAlias) {
      errors.push('payments requires cbu or alias when enabled=true');
    }

    if (hasCBU && config.payments.cbu.length !== 22) {
      errors.push('payments.cbu must have 22 digits');
    }

    if (config.payments.cuit && config.payments.cuit.length !== 11) {
      errors.push('payments.cuit must have 11 digits');
    }
  }

  if (!HOURS_OVERRIDE_VALUES.has(config.hours.override)) {
    errors.push('hours.override must be one of AUTO, FORCE_OPEN, FORCE_CLOSED');
  }

  for (const [index, slot] of config.hours.openingHours.entries()) {
    const hasOpen = Boolean(slot.open);
    const hasClose = Boolean(slot.close);

    if ((hasOpen && !HH_MM_REGEX.test(slot.open)) || (hasClose && !HH_MM_REGEX.test(slot.close))) {
      errors.push(`hours.openingHours[${index}] must use HH:MM format`);
      continue;
    }

    if (hasOpen && hasClose && toMinutes(slot.open) >= toMinutes(slot.close)) {
      errors.push(`hours.openingHours[${index}] must have open < close`);
    }
  }

  if (config.seo.contact.title.length > MAX_LENGTHS.seoTitle) {
    errors.push(`seo.contact.title max length is ${MAX_LENGTHS.seoTitle}`);
  }

  if (config.seo.contact.description.length > MAX_LENGTHS.seoDescription) {
    errors.push(`seo.contact.description max length is ${MAX_LENGTHS.seoDescription}`);
  }

  if (config.seo.about.title.length > MAX_LENGTHS.seoTitle) {
    errors.push(`seo.about.title max length is ${MAX_LENGTHS.seoTitle}`);
  }

  if (config.seo.about.description.length > MAX_LENGTHS.seoDescription) {
    errors.push(`seo.about.description max length is ${MAX_LENGTHS.seoDescription}`);
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateAndSanitizeSiteConfig(input) {
  const sanitized = sanitizeSiteConfig(input);
  const { errors } = validateSiteConfig(sanitized);

  return {
    sanitized,
    errors
  };
}
