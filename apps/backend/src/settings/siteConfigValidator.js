import { MAX_LENGTHS, isValidHttpUrl, sanitizeSiteConfig } from './siteConfigSanitizers.js';
import { SITE_CONFIG_DEFAULTS } from './siteConfigDefaults.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const HOURS_OVERRIDE_VALUES = new Set(['AUTO', 'FORCE_OPEN', 'FORCE_CLOSED']);

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function trimString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function digitsOnly(value) {
  return trimString(value).replace(/\D+/g, '');
}

function normalizeSiteConfigForValidation(input) {
  const root = normalizeObject(input);
  const identity = normalizeObject(root.identity);
  const whatsapp = normalizeObject(root.whatsapp);
  const payments = normalizeObject(root.payments);
  const hours = normalizeObject(root.hours);
  const seo = normalizeObject(root.seo);
  const contact = normalizeObject(seo.contact);
  const about = normalizeObject(seo.about);

  const socialLinks = normalizeArray(root.socialLinks).map((item) => {
    const link = normalizeObject(item);
    return {
      label: trimString(link.label),
      url: trimString(link.url)
    };
  });

  const openingHours = normalizeArray(hours.openingHours).map((entry) => {
    const slot = normalizeObject(entry);
    return {
      day: trimString(slot.day),
      open: trimString(slot.open),
      close: trimString(slot.close),
      closed: Boolean(slot.closed)
    };
  });

  return {
    identity: {
      phone: digitsOnly(identity.phone),
      email: trimString(identity.email)
    },
    whatsapp: {
      number: digitsOnly(whatsapp.number)
    },
    socialLinks,
    payments: {
      enabled: Boolean(payments.enabled),
      cbu: digitsOnly(payments.cbu),
      alias: trimString(payments.alias),
      cuit: digitsOnly(payments.cuit)
    },
    hours: {
      override: trimString(hours.override) || SITE_CONFIG_DEFAULTS.hours.override,
      openingHours
    },
    seo: {
      contact: {
        title: trimString(contact.title),
        description: trimString(contact.description)
      },
      about: {
        title: trimString(about.title),
        description: trimString(about.description)
      }
    }
  };
}

function isValidDigitsLength(value, min, max) {
  return value.length >= min && value.length <= max;
}

function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

function createValidationError(path, message, code) {
  return { path, message, code };
}

export function validateSiteConfig(input) {
  const config = normalizeSiteConfigForValidation(input);
  const errors = [];

  if (config.identity.email && !EMAIL_REGEX.test(config.identity.email)) {
    errors.push(createValidationError('identity.email', 'identity.email must be a valid email address', 'invalid_email'));
  }

  if (config.identity.phone && !isValidDigitsLength(config.identity.phone, 6, 20)) {
    errors.push(createValidationError('identity.phone', 'identity.phone must contain between 6 and 20 digits', 'invalid_length'));
  }

  if (config.whatsapp.number && !isValidDigitsLength(config.whatsapp.number, 6, 20)) {
    errors.push(createValidationError('whatsapp.number', 'whatsapp.number must contain between 6 and 20 digits', 'invalid_length'));
  }

  for (const [index, link] of config.socialLinks.entries()) {
    if (!link.label) {
      errors.push(createValidationError(`socialLinks[${index}].label`, `socialLinks[${index}].label is required`, 'required'));
    }

    if (!isValidHttpUrl(link.url)) {
      errors.push(createValidationError(`socialLinks[${index}].url`, `socialLinks[${index}].url must use http/https`, 'invalid_url'));
    }
  }

  if (config.payments.enabled) {
    const hasCBU = Boolean(config.payments.cbu);
    const hasAlias = Boolean(config.payments.alias);

    if (!hasCBU && !hasAlias) {
      errors.push(createValidationError('payments', 'payments requires cbu or alias when enabled=true', 'missing_required_any'));
    }

    if (hasCBU && config.payments.cbu.length !== 22) {
      errors.push(createValidationError('payments.cbu', 'payments.cbu must have 22 digits', 'invalid_length'));
    }

    if (config.payments.cuit && config.payments.cuit.length !== 11) {
      errors.push(createValidationError('payments.cuit', 'payments.cuit must have 11 digits', 'invalid_length'));
    }
  }

  if (!HOURS_OVERRIDE_VALUES.has(config.hours.override)) {
    errors.push(createValidationError('hours.override', 'hours.override must be one of AUTO, FORCE_OPEN, FORCE_CLOSED', 'invalid_enum'));
  }

  for (const [index, slot] of config.hours.openingHours.entries()) {
    const hasOpen = Boolean(slot.open);
    const hasClose = Boolean(slot.close);

    if ((hasOpen && !HH_MM_REGEX.test(slot.open)) || (hasClose && !HH_MM_REGEX.test(slot.close))) {
      errors.push(createValidationError(`hours.openingHours[${index}]`, `hours.openingHours[${index}] must use HH:MM format`, 'invalid_time_format'));
      continue;
    }

    if (hasOpen && hasClose && toMinutes(slot.open) >= toMinutes(slot.close)) {
      errors.push(createValidationError(`hours.openingHours[${index}]`, `hours.openingHours[${index}] must have open < close`, 'invalid_time_range'));
    }
  }

  if (config.seo.contact.title.length > MAX_LENGTHS.seoTitle) {
    errors.push(createValidationError('seo.contact.title', `seo.contact.title max length is ${MAX_LENGTHS.seoTitle}`, 'max_length'));
  }

  if (config.seo.contact.description.length > MAX_LENGTHS.seoDescription) {
    errors.push(createValidationError('seo.contact.description', `seo.contact.description max length is ${MAX_LENGTHS.seoDescription}`, 'max_length'));
  }

  if (config.seo.about.title.length > MAX_LENGTHS.seoTitle) {
    errors.push(createValidationError('seo.about.title', `seo.about.title max length is ${MAX_LENGTHS.seoTitle}`, 'max_length'));
  }

  if (config.seo.about.description.length > MAX_LENGTHS.seoDescription) {
    errors.push(createValidationError('seo.about.description', `seo.about.description max length is ${MAX_LENGTHS.seoDescription}`, 'max_length'));
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateAndSanitizeSiteConfig(input) {
  const { errors } = validateSiteConfig(input);
  const sanitized = sanitizeSiteConfig(input);

  return {
    sanitized,
    errors
  };
}
