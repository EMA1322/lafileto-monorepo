const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ORDER_FIELDS = ['updatedAt', 'name', 'price'];
export const ORDER_DIRECTIONS = ['desc', 'asc'];

export const DEFAULT_FILTERS = {
  q: '',
  categoryId: 'all',
  status: 'all',
  hasOffer: 'all',
  orderBy: 'updatedAt',
  orderDir: 'desc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  currency: 'ARS',
  minimumFractionDigits: 2,
  style: 'currency',
});

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
});

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function normalizeFilters(input = {}) {
  const source = { ...DEFAULT_FILTERS, ...(input || {}) };
  const pageSize = toPositiveInteger(source.pageSize, DEFAULT_FILTERS.pageSize);
  const status = ['all', 'active', 'inactive'].includes(source.status) ? source.status : 'all';
  const hasOffer = ['all', 'true', 'false'].includes(source.hasOffer)
    ? source.hasOffer
    : ['true', 'false'].includes(source.offer)
      ? source.offer
      : 'all';

  return {
    q: typeof source.q === 'string' ? source.q.trim() : '',
    categoryId:
      source.categoryId && source.categoryId !== 'all' ? String(source.categoryId) : 'all',
    status,
    hasOffer,
    orderBy: ORDER_FIELDS.includes(source.orderBy) ? source.orderBy : DEFAULT_FILTERS.orderBy,
    orderDir: ORDER_DIRECTIONS.includes(source.orderDir)
      ? source.orderDir
      : DEFAULT_FILTERS.orderDir,
    page: toPositiveInteger(source.page, DEFAULT_FILTERS.page),
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_FILTERS.pageSize,
  };
}

export function parseFiltersFromHash(hashString = '') {
  if (typeof hashString !== 'string') return DEFAULT_FILTERS;
  const [route, query = ''] = hashString.replace(/^#/, '').split('?');
  if (route && route !== 'products') return DEFAULT_FILTERS;
  const params = new URLSearchParams(query);

  return normalizeFilters({
    q: params.get('q') || '',
    categoryId: params.get('categoryId') || 'all',
    status: params.get('status') || 'all',
    hasOffer: params.get('hasOffer') || params.get('offer') || 'all',
    orderBy: params.get('orderBy') || DEFAULT_FILTERS.orderBy,
    orderDir: params.get('orderDir') || DEFAULT_FILTERS.orderDir,
    page: params.get('page') || DEFAULT_FILTERS.page,
    pageSize: params.get('pageSize') || DEFAULT_FILTERS.pageSize,
  });
}

export function buildProductsQuery(filters = DEFAULT_FILTERS) {
  const normalized = normalizeFilters(filters);
  const query = {
    orderBy: normalized.orderBy,
    orderDir: normalized.orderDir,
    page: normalized.page,
    pageSize: normalized.pageSize,
  };

  if (normalized.q) query.q = normalized.q;
  if (normalized.categoryId !== 'all') query.categoryId = normalized.categoryId;
  if (normalized.status !== 'all') query.status = normalized.status;
  if (normalized.hasOffer !== 'all') query.hasOffer = normalized.hasOffer;

  return query;
}

export function serializeFiltersToHash(filters = DEFAULT_FILTERS) {
  const normalized = normalizeFilters(filters);
  const params = new URLSearchParams();

  if (normalized.q) params.set('q', normalized.q);
  if (normalized.categoryId !== 'all') params.set('categoryId', normalized.categoryId);
  if (normalized.status !== 'all') params.set('status', normalized.status);
  if (normalized.hasOffer !== 'all') params.set('hasOffer', normalized.hasOffer);
  if (normalized.orderBy !== DEFAULT_FILTERS.orderBy) params.set('orderBy', normalized.orderBy);
  if (normalized.orderDir !== DEFAULT_FILTERS.orderDir) params.set('orderDir', normalized.orderDir);
  if (normalized.page > 1) params.set('page', String(normalized.page));
  if (normalized.pageSize !== DEFAULT_FILTERS.pageSize)
    params.set('pageSize', String(normalized.pageSize));

  const query = params.toString();
  return query ? `#products?${query}` : '#products';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const basePrice = toNumber(raw.price);
  const offer = raw.offer && typeof raw.offer === 'object' ? raw.offer : null;
  const finalPrice = offer ? toNumber(offer.finalPrice, basePrice) : basePrice;
  const discountPercent = offer ? toNumber(offer.discountPercent, 0) : 0;

  return {
    id: raw.id ?? '',
    name: raw.name ?? 'Sin nombre',
    description: raw.description ?? '',
    imageUrl: raw.imageUrl ?? null,
    price: basePrice,
    stock: toNumber(raw.stock),
    status: raw.status === 'active' ? 'active' : 'inactive',
    categoryId: raw.categoryId ?? raw.category?.id ?? '',
    categoryName: raw.category?.name ?? raw.categoryName ?? '',
    updatedAt: raw.updatedAt ?? null,
    offer:
      offer && offer.isActive === true
        ? {
            discountPercent,
            finalPrice,
            isActive: true,
          }
        : null,
  };
}

export function normalizeProductsResponse(response) {
  const rawItems = response?.data?.items ?? response?.data ?? [];
  const items = Array.isArray(rawItems) ? rawItems.map(normalizeProduct).filter(Boolean) : [];
  const meta = response?.data?.meta ?? response?.meta ?? {};
  const pageSize = toPositiveInteger(meta.pageSize, DEFAULT_FILTERS.pageSize);
  const total = toPositiveInteger(meta.total, items.length);
  const pageCount = toPositiveInteger(meta.pageCount, Math.max(1, Math.ceil(total / pageSize)));

  return {
    items,
    meta: {
      page: toPositiveInteger(meta.page, DEFAULT_FILTERS.page),
      pageSize,
      total,
      pageCount,
    },
  };
}

export function normalizeCategoriesResponse(response) {
  const rawItems = response?.data?.items ?? response?.data ?? [];
  return Array.isArray(rawItems)
    ? rawItems
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          id: item.id ?? item.value ?? '',
          name: item.name ?? item.label ?? 'Sin nombre',
        }))
    : [];
}

export function formatMoney(value) {
  return moneyFormatter.format(toNumber(value));
}

export function formatDateTime(value) {
  if (!value) return 'Sin datos';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin datos' : dateFormatter.format(date);
}
