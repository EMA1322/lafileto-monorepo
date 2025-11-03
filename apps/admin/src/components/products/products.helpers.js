// ============================================================================
// /admin/src/components/products/products.helpers.js
// Utilidades específicas del módulo de productos.
// Comentarios en español, código y nombres en inglés.
// ============================================================================

import { formatMoney as sharedFormatMoney, slugify, isValidSlug } from '@/utils/helpers.js';

export const MODULE_KEY = 'products';
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ORDER_FIELDS = ['name', 'price', 'updatedAt'];
export const ORDER_DIRECTIONS = ['asc', 'desc'];
export const STATUS_VALUES = ['draft', 'active', 'archived'];

export const STATUS_LABELS = {
  draft: 'Borrador',
  active: 'Activo',
  archived: 'Archivado',
};

export const DEFAULT_FILTERS = {
  q: '',
  categoryId: 'all',
  status: 'all',
  isFeatured: 'all',
  priceMin: '',
  priceMax: '',
  orderBy: 'updatedAt',
  orderDir: 'desc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  all: 0,
};

/** Serializa filtros a params aceptados por la API */
export function buildQuery(filters = {}) {
  const params = {};
  const source = { ...DEFAULT_FILTERS, ...(filters || {}) };

  if (source.q) params.q = String(source.q).trim();

  if (source.categoryId && source.categoryId !== 'all') {
    params.categoryId = source.categoryId;
  }

  if (source.status && source.status !== 'all' && STATUS_VALUES.includes(source.status)) {
    params.status = source.status;
  }

  if (source.isFeatured === true || source.isFeatured === 'true') {
    params.isFeatured = true;
  }

  const rawMin = source.priceMin;
  if (rawMin !== '' && rawMin !== null && rawMin !== undefined) {
    const min = Number(rawMin);
    if (Number.isFinite(min) && min >= 0) {
      params.priceMin = min;
    }
  }
  const rawMax = source.priceMax;
  if (rawMax !== '' && rawMax !== null && rawMax !== undefined) {
    const max = Number(rawMax);
    if (Number.isFinite(max) && max >= 0) {
      params.priceMax = max;
    }
  }

  if (ORDER_FIELDS.includes(source.orderBy)) {
    params.orderBy = source.orderBy;
  } else {
    params.orderBy = DEFAULT_FILTERS.orderBy;
  }

  if (ORDER_DIRECTIONS.includes(source.orderDir)) {
    params.orderDir = source.orderDir;
  } else {
    params.orderDir = DEFAULT_FILTERS.orderDir;
  }

  const page = Number(source.page);
  params.page = Number.isFinite(page) && page > 0 ? Math.floor(page) : DEFAULT_FILTERS.page;

  const pageSize = Number(source.pageSize);
  params.pageSize = PAGE_SIZE_OPTIONS.includes(pageSize)
    ? pageSize
    : DEFAULT_FILTERS.pageSize;

  if (source.all === 1 || source.all === true || source.all === '1') {
    params.all = 1;
  }

  return params;
}

/** Formatea dinero en ARS con dos decimales visibles. */
export function formatMoney(value, options = {}) {
  return sharedFormatMoney(Number.isFinite(Number(value)) ? Number(value) : 0, {
    locale: 'es-AR',
    currency: 'ARS',
    minimumFractionDigits: 2,
    ...options,
  });
}

/** Genera un slug kebab-case basado en el helper global */
export function kebabifySlug(value) {
  if (!value) return '';
  return slugify(String(value)).replace(/[^a-z0-9-]/g, '');
}

export function normalizeSku(value) {
  if (!value) return '';
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 40);
}

/** Normaliza bool featured desde controles UI */
export function normalizeFeatured(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return 'all';
}

function pickNumber(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function normalizeOffer(rawOffer, basePrice) {
  if (!rawOffer || typeof rawOffer !== 'object') return null;

  const isActiveRaw =
    rawOffer.isActive ?? rawOffer.active ?? rawOffer.enabled ?? rawOffer.status === 'active';

  const finalPrice = pickNumber(
    rawOffer.finalPrice,
    rawOffer.final_price,
    rawOffer.priceWithDiscount,
    rawOffer.price_with_discount,
    rawOffer.discountPrice,
    rawOffer.discount_price,
    rawOffer.offerPrice,
    rawOffer.price,
  );

  let normalizedFinal = Number.isFinite(finalPrice) ? finalPrice : null;
  if (Number.isFinite(normalizedFinal) && normalizedFinal < 0) {
    normalizedFinal = 0;
  }

  let normalizedPercent = pickNumber(
    rawOffer.discountPercent,
    rawOffer.discountPercentage,
    rawOffer.discount_percent,
    rawOffer.discount_percentage,
    rawOffer.percentOff,
    rawOffer.percent_off,
    rawOffer.percentage,
  );

  if (Number.isFinite(normalizedPercent)) {
    normalizedPercent = Math.max(0, Math.min(100, Math.round(normalizedPercent)));
  } else if (Number.isFinite(normalizedFinal) && Number.isFinite(basePrice) && basePrice > 0) {
    const rawPercent = Math.round((1 - normalizedFinal / basePrice) * 100);
    normalizedPercent = Math.max(0, Math.min(100, rawPercent));
  } else {
    normalizedPercent = null;
  }

  const hasRelevantData =
    Boolean(isActiveRaw) || Number.isFinite(normalizedFinal) || Number.isFinite(normalizedPercent);

  if (!hasRelevantData) return null;

  return {
    id: rawOffer.id ?? rawOffer.offerId ?? null,
    name: rawOffer.name ?? rawOffer.title ?? '',
    label: rawOffer.label ?? rawOffer.badge ?? '',
    isActive: Boolean(isActiveRaw),
    finalPrice: Number.isFinite(normalizedFinal) ? normalizedFinal : null,
    discountPercent: Number.isFinite(normalizedPercent) ? normalizedPercent : null,
    startsAt: rawOffer.startsAt ?? rawOffer.startDate ?? rawOffer.start_at ?? null,
    endsAt: rawOffer.endsAt ?? rawOffer.endDate ?? rawOffer.end_at ?? null,
  };
}

export function mapProductFromApi(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const price = Number(raw.price);
  const stock = Number(raw.stock);
  const normalizedPrice = Number.isFinite(price) ? price : 0;
  const offer = normalizeOffer(raw.offer ?? raw.currentOffer ?? raw.activeOffer, normalizedPrice);
  return {
    id: raw.id ?? raw._id ?? null,
    name: raw.name ?? '',
    slug: raw.slug ?? '',
    sku: raw.sku ?? '',
    description: raw.description ?? '',
    price: normalizedPrice,
    currency: raw.currency || 'ARS',
    stock: Number.isFinite(stock) ? stock : 0,
    status: STATUS_VALUES.includes(raw.status) ? raw.status : 'draft',
    isFeatured: Boolean(raw.isFeatured ?? raw.featured),
    categoryId: raw.categoryId ?? raw.category?.id ?? null,
    categoryName: raw.category?.name ?? raw.categoryName ?? '',
    imageUrl: raw.imageUrl ?? raw.image_url ?? raw.image ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    offer,
  };
}

export function resolveOfferPricing(product) {
  const basePrice = Number.isFinite(Number(product?.price)) ? Number(product.price) : 0;
  const offer = product?.offer;
  if (!offer || offer.isActive !== true) {
    return {
      hasActiveOffer: false,
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountPercent: null,
    };
  }

  let finalPrice = Number.isFinite(Number(offer.finalPrice)) ? Number(offer.finalPrice) : null;
  if (!Number.isFinite(finalPrice)) {
    finalPrice = basePrice;
  }
  if (Number.isFinite(finalPrice) && finalPrice < 0) {
    finalPrice = 0;
  }

  let discountPercent = Number.isFinite(Number(offer.discountPercent))
    ? Number(offer.discountPercent)
    : null;

  if (discountPercent != null) {
    discountPercent = Math.max(0, Math.min(100, Math.round(discountPercent)));
  } else if (Number.isFinite(basePrice) && basePrice > 0 && Number.isFinite(finalPrice)) {
    discountPercent = Math.max(0, Math.min(100, Math.round((1 - finalPrice / basePrice) * 100)));
  }

  const isValidDiscount = Number.isFinite(finalPrice) && finalPrice < basePrice;

  if (!isValidDiscount) {
    return {
      hasActiveOffer: false,
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountPercent: null,
    };
  }

  return {
    hasActiveOffer: true,
    originalPrice: basePrice,
    finalPrice,
    discountPercent: Number.isFinite(discountPercent) && discountPercent > 0 ? discountPercent : null,
  };
}

export function validateProductPayload(payload = {}) {
  const errors = [];
  const name = String(payload.name || '').trim();
  if (!name) {
    errors.push({ field: 'name', message: 'Ingresá el nombre.' });
  }

  const slug = String(payload.slug || '').trim();
  if (slug && !isValidSlug(slug)) {
    errors.push({ field: 'slug', message: 'El slug debe estar en formato kebab-case.' });
  }

  const sku = String(payload.sku || '').trim();
  if (sku && !/^[A-Z0-9_-]{3,40}$/.test(sku)) {
    errors.push({ field: 'sku', message: 'El SKU debe tener 3 a 40 caracteres alfanuméricos.' });
  }

  const price = Number(payload.price);
  if (!Number.isFinite(price) || price < 0) {
    errors.push({ field: 'price', message: 'El precio debe ser mayor o igual a 0.' });
  }

  const stock = Number(payload.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.push({ field: 'stock', message: 'El stock debe ser un entero mayor o igual a 0.' });
  }

  const categoryId = payload.categoryId ?? payload.category_id ?? payload.category;
  if (!categoryId) {
    errors.push({ field: 'categoryId', message: 'Seleccioná una categoría.' });
  }

  const status = payload.status ?? 'draft';
  if (!STATUS_VALUES.includes(status)) {
    errors.push({ field: 'status', message: 'Seleccioná un estado válido.' });
  }

  return errors;
}

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatStatusLabel(status) {
  return STATUS_LABELS[status] || '—';
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return '—';
  }
}

export function formatCategoryName(product) {
  if (!product) return '—';
  if (product.categoryName) return product.categoryName;
  if (product.category && typeof product.category === 'object' && product.category.name) {
    return product.category.name;
  }
  return '—';
}
