export const CATEGORY_FORM_FIELDS = ['name', 'imageUrl'];

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function createCategoryFormState(category = {}) {
  const source = category && typeof category === 'object' ? category : {};

  return {
    name: normalizeText(source.name),
    imageUrl: normalizeText(source.imageUrl),
  };
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.host);
  } catch {
    return false;
  }
}

export function validateCategoryForm(values = {}) {
  const errors = {};
  const name = normalizeText(values.name);
  const imageUrl = normalizeText(values.imageUrl);

  if (!name) {
    errors.name = 'Ingresá el nombre.';
  } else if (name.length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres.';
  } else if (name.length > 50) {
    errors.name = 'El nombre no puede superar 50 caracteres.';
  }

  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    errors.imageUrl = 'Ingresá una URL absoluta http(s) válida.';
  }

  return errors;
}

export function buildCategoryPayload(values = {}) {
  const imageUrl = normalizeText(values.imageUrl);

  return {
    name: normalizeText(values.name),
    imageUrl: imageUrl || null,
  };
}

function normalizeFieldName(field) {
  if (!field) return '';
  const normalized = String(field).trim();
  const lower = normalized.toLowerCase();
  if (lower === 'image_url' || lower === 'imageurl' || lower === 'image') return 'imageUrl';
  return CATEGORY_FORM_FIELDS.includes(normalized) ? normalized : '';
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

export function mapCategoryApiError(error) {
  const fieldErrors = {};
  const details = getApiFieldDetails(error);

  for (const detail of details) {
    const field = normalizeFieldName(detail?.path || detail?.field || detail?.name);
    if (!field) continue;
    fieldErrors[field] = detail?.message || 'Revisá este campo.';
  }

  return {
    fieldErrors,
    generalError: error?.message || 'No pudimos guardar la categoría. Intentá nuevamente.',
  };
}

export function hasFormErrors(errors = {}) {
  return Object.values(errors).some(Boolean);
}
