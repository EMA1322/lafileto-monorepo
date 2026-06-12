const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ORDER_FIELDS = ['name', 'createdAt'];
export const ORDER_DIRECTIONS = ['asc', 'desc'];

export const DEFAULT_FILTERS = {
  q: '',
  status: 'all',
  orderBy: 'name',
  orderDir: 'asc',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeFilters(input = {}) {
  const source = { ...DEFAULT_FILTERS, ...(input || {}) };
  const pageSize = toPositiveInteger(source.pageSize, DEFAULT_FILTERS.pageSize);
  const status = ['all', 'active', 'inactive'].includes(source.status) ? source.status : 'all';

  return {
    q: normalizeText(source.q),
    status,
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
  if (route && route !== 'categories') return DEFAULT_FILTERS;
  const params = new URLSearchParams(query);

  return normalizeFilters({
    q: params.get('q') || '',
    status: params.get('status') || 'all',
    orderBy: params.get('orderBy') || DEFAULT_FILTERS.orderBy,
    orderDir: params.get('orderDir') || DEFAULT_FILTERS.orderDir,
    page: params.get('page') || DEFAULT_FILTERS.page,
    pageSize: params.get('pageSize') || DEFAULT_FILTERS.pageSize,
  });
}

export function serializeFiltersToHash(filters = DEFAULT_FILTERS) {
  const normalized = normalizeFilters(filters);
  const params = new URLSearchParams();

  if (normalized.q) params.set('q', normalized.q);
  if (normalized.status !== 'all') params.set('status', normalized.status);
  if (normalized.orderBy !== DEFAULT_FILTERS.orderBy) params.set('orderBy', normalized.orderBy);
  if (normalized.orderDir !== DEFAULT_FILTERS.orderDir) params.set('orderDir', normalized.orderDir);
  if (normalized.page > 1) params.set('page', String(normalized.page));
  if (normalized.pageSize !== DEFAULT_FILTERS.pageSize)
    params.set('pageSize', String(normalized.pageSize));

  const query = params.toString();
  return query ? `#categories?${query}` : '#categories';
}

export function buildCategoriesQuery(filters = DEFAULT_FILTERS) {
  const normalized = normalizeFilters(filters);
  const query = {
    orderBy: normalized.orderBy,
    orderDir: normalized.orderDir,
    page: normalized.page,
    pageSize: normalized.pageSize,
  };

  if (normalized.q) query.q = normalized.q;
  if (normalized.status !== 'all') query.status = normalized.status;

  return query;
}

export function normalizeCategory(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const active =
    typeof raw.active === 'boolean'
      ? raw.active
      : String(raw.status || '').toLowerCase() !== 'inactive';
  const productCount = toNumberOrNull(
    raw.productCount ?? raw.productsCount ?? raw.products_count ?? raw.count,
  );

  return {
    id: raw.id ?? raw.categoryId ?? '',
    name: raw.name ?? 'Sin nombre',
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    active,
    productCount,
  };
}

export function normalizeCategoriesResponse(response) {
  const rawItems = response?.data?.items ?? response?.data ?? [];
  const items = Array.isArray(rawItems) ? rawItems.map(normalizeCategory).filter(Boolean) : [];
  const meta = response?.data?.meta ?? response?.meta ?? {};
  const pageSize = toPositiveInteger(meta.pageSize, DEFAULT_FILTERS.pageSize);
  const total = toPositiveInteger(meta.total ?? meta.totalCount, items.length);
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

export function formatProductCount(value) {
  const count = toNumberOrNull(value);
  if (count === null) return 'Sin dato';
  if (count === 1) return '1 producto';
  return `${count} productos`;
}
