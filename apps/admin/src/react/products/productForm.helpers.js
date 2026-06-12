export const PRODUCT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Borrador' },
  { value: 'active', label: 'Activo' },
  { value: 'archived', label: 'Archivado' },
];

export const PRODUCT_FORM_FIELDS = [
  'name',
  'description',
  'price',
  'stock',
  'imageUrl',
  'categoryId',
  'status',
];

const PRODUCT_STATUS_VALUES = PRODUCT_STATUS_OPTIONS.map((option) => option.value);

function normalizeStatus(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return PRODUCT_STATUS_VALUES.includes(normalized) ? normalized : 'draft';
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toFormNumber(value, fallback = '') {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : fallback;
}

export function createProductFormState(product = {}) {
  const source = product && typeof product === 'object' ? product : {};

  return {
    name: normalizeText(source.name),
    description: normalizeText(source.description),
    price: toFormNumber(source.price, '0'),
    stock: toFormNumber(source.stock, '0'),
    imageUrl: normalizeText(source.imageUrl),
    categoryId: source.categoryId ? String(source.categoryId) : '',
    status: normalizeStatus(source.status),
  };
}

export function validateProductForm(values = {}) {
  const errors = {};
  const name = normalizeText(values.name);
  const price = Number(values.price);
  const stock = Number(values.stock);
  const categoryId = normalizeText(values.categoryId);
  const status = normalizeStatus(values.status);
  const imageUrl = normalizeText(values.imageUrl);

  if (!name) {
    errors.name = 'Ingresá el nombre.';
  }

  if (!Number.isFinite(price) || price < 0) {
    errors.price = 'El precio debe ser un número mayor o igual a 0.';
  }

  if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = 'El stock debe ser un entero mayor o igual a 0.';
  }

  if (!categoryId) {
    errors.categoryId = 'Seleccioná una categoría.';
  }

  if (!PRODUCT_STATUS_VALUES.includes(status)) {
    errors.status = 'Seleccioná un estado válido.';
  }

  if (imageUrl) {
    let isValid = false;
    try {
      const parsed = new URL(imageUrl);
      isValid =
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
    } catch {
      isValid = false;
    }

    if (!isValid) {
      errors.imageUrl = 'Ingresá una URL http(s) válida.';
    }
  }

  return errors;
}

export function buildProductPayload(values = {}) {
  const payload = {
    name: normalizeText(values.name),
    price: Number(values.price),
    stock: Number(values.stock),
    categoryId: normalizeText(values.categoryId),
    status: normalizeStatus(values.status),
  };
  const description = normalizeText(values.description);
  const imageUrl = normalizeText(values.imageUrl);

  if (description) {
    payload.description = description;
  } else {
    payload.description = null;
  }

  if (imageUrl) {
    payload.imageUrl = imageUrl;
  } else {
    payload.imageUrl = null;
  }

  return payload;
}

function normalizeFieldName(field) {
  if (!field) return '';
  const normalized = String(field).trim();
  const lower = normalized.toLowerCase();
  if (lower === 'category_id' || lower === 'categoryid') return 'categoryId';
  if (lower === 'image_url' || lower === 'imageurl' || lower === 'image') return 'imageUrl';
  return PRODUCT_FORM_FIELDS.includes(normalized) ? normalized : '';
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

export function mapProductApiError(error) {
  const fieldErrors = {};
  const details = getApiFieldDetails(error);

  for (const detail of details) {
    const field = normalizeFieldName(detail?.path || detail?.field || detail?.name);
    if (!field) continue;
    fieldErrors[field] = detail?.message || 'Revisá este campo.';
  }

  return {
    fieldErrors,
    generalError: error?.message || 'No pudimos guardar el producto. Intentá nuevamente.',
  };
}

export function hasFormErrors(errors = {}) {
  return Object.values(errors).some(Boolean);
}
