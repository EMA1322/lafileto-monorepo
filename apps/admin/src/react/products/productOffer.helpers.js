export const OFFER_FORM_FIELDS = ['discountPercent'];

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
    discountPercent:
      discountPercent === undefined || discountPercent === null ? '' : String(discountPercent),
  };
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
