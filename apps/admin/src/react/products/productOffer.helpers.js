export const OFFER_FORM_FIELDS = ['discountPercent'];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function normalizeFieldName(field) {
  if (!field) return '';
  const normalized = String(field).trim();
  const lower = normalized.toLowerCase();
  if (lower === 'discountpct' || lower === 'discount_pct' || lower === 'discount') {
    return 'discountPercent';
  }
  return OFFER_FORM_FIELDS.includes(normalized) ? normalized : '';
}

function getApiFieldDetails(error) {
  const candidates = [
    error?.details?.fields,
    error?.details,
    error?.payload?.error?.details?.fields,
    error?.payload?.error?.details,
  ];

  return candidates.find((candidate) => Array.isArray(candidate)) || [];
}

export function createOfferFormState(product = {}) {
  const discountPercent = product?.offer?.discountPercent;
  return {
    enabled: Boolean(product?.offer),
    discountPercent:
      discountPercent === undefined || discountPercent === null ? '' : String(discountPercent),
  };
}

export function hasPersistedOffer(product = {}) {
  return Boolean(product?.offer?.id);
}

export function validateOfferForm(values = {}) {
  const errors = {};
  const discountText = normalizeText(values.discountPercent);
  const discountNumber = Number(discountText);

  if (!discountText) {
    errors.discountPercent = 'Ingresa el porcentaje de descuento.';
  } else if (!Number.isFinite(discountNumber)) {
    errors.discountPercent = 'El descuento debe ser numerico.';
  } else if (!Number.isInteger(discountNumber)) {
    errors.discountPercent = 'El descuento debe ser un entero.';
  } else if (discountNumber < 1) {
    errors.discountPercent = 'El descuento debe ser al menos 1%.';
  } else if (discountNumber > 100) {
    errors.discountPercent = 'El descuento no puede superar el 100%.';
  }

  return errors;
}

export function hasOfferFormErrors(errors = {}) {
  return Object.values(errors).some(Boolean);
}

export function buildOfferCreatePayload(product, values = {}) {
  return {
    productId: product?.id,
    discountPercent: Number(values.discountPercent),
  };
}

export function buildOfferUpdatePayload(values = {}) {
  return {
    discountPercent: Number(values.discountPercent),
  };
}

export function estimateOfferFinalPrice(product = {}, values = {}) {
  const basePrice = toNumber(product?.price);
  const discountPercent = toNumber(values.discountPercent);
  if (basePrice <= 0 || discountPercent <= 0) return basePrice;
  const ratio = Math.max(0, Math.min(100, discountPercent)) / 100;
  return Math.round(basePrice * (1 - ratio) * 100) / 100;
}

export function mapOfferApiError(error) {
  const fieldErrors = {};
  const details = getApiFieldDetails(error);

  for (const detail of details) {
    const field = normalizeFieldName(detail?.path || detail?.field || detail?.name);
    if (!field) continue;
    fieldErrors[field] = detail?.message || 'Revisa este campo.';
  }

  return {
    fieldErrors,
    generalError: error?.message || 'No pudimos guardar la oferta. Intenta nuevamente.',
  };
}
