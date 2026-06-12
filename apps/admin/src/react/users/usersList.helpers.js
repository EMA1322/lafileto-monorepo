import { uiToUserApiStatus, userApiStatusToUi } from '../../utils/status.helpers.js';

export const USER_PAGE_SIZE_OPTIONS = [10, 20, 50];
export const USER_ORDER_FIELDS = ['fullName', 'email', 'status', 'id'];
export const USER_ORDER_DIRECTIONS = ['asc', 'desc'];

export const DEFAULT_USER_FILTERS = {
  q: '',
  page: 1,
  pageSize: 10,
  orderBy: 'fullName',
  orderDir: 'asc',
};

function toPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

export function normalizeUserFilters(input = {}) {
  const source = { ...DEFAULT_USER_FILTERS, ...(input || {}) };
  const pageSize = toPositiveInteger(source.pageSize, DEFAULT_USER_FILTERS.pageSize);
  return {
    q: typeof source.q === 'string' ? source.q.trim() : '',
    page: toPositiveInteger(source.page, DEFAULT_USER_FILTERS.page),
    pageSize: USER_PAGE_SIZE_OPTIONS.includes(pageSize) ? pageSize : DEFAULT_USER_FILTERS.pageSize,
    orderBy: USER_ORDER_FIELDS.includes(source.orderBy)
      ? source.orderBy
      : DEFAULT_USER_FILTERS.orderBy,
    orderDir: USER_ORDER_DIRECTIONS.includes(source.orderDir)
      ? source.orderDir
      : DEFAULT_USER_FILTERS.orderDir,
  };
}

export function parseUsersFiltersFromHash(hashString = '') {
  if (typeof hashString !== 'string') return DEFAULT_USER_FILTERS;
  const [path, query = ''] = hashString.replace(/^#/, '').split('?');
  if (path && path !== 'users') return DEFAULT_USER_FILTERS;
  const params = new URLSearchParams(query);
  return normalizeUserFilters({
    q: params.get('q') || '',
    page: params.get('page') || 1,
    pageSize: params.get('pageSize') || DEFAULT_USER_FILTERS.pageSize,
    orderBy: params.get('orderBy') || DEFAULT_USER_FILTERS.orderBy,
    orderDir: params.get('orderDir') || DEFAULT_USER_FILTERS.orderDir,
  });
}

export function serializeUsersFiltersToHash(filters = DEFAULT_USER_FILTERS) {
  const normalized = normalizeUserFilters(filters);
  const params = new URLSearchParams();
  if (normalized.q) params.set('q', normalized.q);
  if (normalized.page > 1) params.set('page', String(normalized.page));
  if (normalized.pageSize !== DEFAULT_USER_FILTERS.pageSize) {
    params.set('pageSize', String(normalized.pageSize));
  }
  if (normalized.orderBy !== DEFAULT_USER_FILTERS.orderBy)
    params.set('orderBy', normalized.orderBy);
  if (normalized.orderDir !== DEFAULT_USER_FILTERS.orderDir)
    params.set('orderDir', normalized.orderDir);
  const query = params.toString();
  return query ? `#users?${query}` : '#users';
}

export function buildUsersQuery(filters = DEFAULT_USER_FILTERS) {
  const normalized = normalizeUserFilters(filters);
  return {
    page: normalized.page,
    pageSize: normalized.pageSize,
    orderBy: normalized.orderBy,
    orderDir: normalized.orderDir,
    ...(normalized.q ? { q: normalized.q } : {}),
  };
}

export function normalizeUser(raw = {}) {
  const status = userApiStatusToUi(raw.status || raw.state || 'INACTIVE');
  return {
    id: raw.id ?? raw.userId ?? '',
    fullName: raw.fullName || raw.name || '',
    email: raw.email || '',
    phone: raw.phone && raw.phone !== '0000000000' ? raw.phone : '',
    roleId: raw.roleId || raw.role_id || raw.role || '',
    status,
  };
}

export function normalizeUsersResponse(response = {}) {
  const data = response?.data || {};
  const items = Array.isArray(data.items) ? data.items.map(normalizeUser) : [];
  const meta = data.meta || {};
  const pageSize = toPositiveInteger(meta.pageSize, DEFAULT_USER_FILTERS.pageSize);
  const total = toPositiveInteger(meta.total, items.length);
  const pageCount = toPositiveInteger(meta.pageCount, Math.max(1, Math.ceil(total / pageSize)));
  return {
    items,
    meta: {
      page: toPositiveInteger(meta.page, DEFAULT_USER_FILTERS.page),
      pageSize,
      total,
      pageCount,
    },
  };
}

export function buildUserPayload(values = {}, { mode = 'create' } = {}) {
  const payload = {
    fullName: String(values.fullName || '').trim(),
    phone: String(values.phone || '').trim(),
    roleId: String(values.roleId || '')
      .trim()
      .toLowerCase(),
    status: uiToUserApiStatus(values.status || 'inactive'),
  };

  if (mode === 'create') {
    payload.email = String(values.email || '')
      .trim()
      .toLowerCase();
    payload.password = String(values.password || '').trim();
  }

  return payload;
}

export function getRoleLabel(roleId, roles = []) {
  const normalized = String(roleId || '').trim();
  if (!normalized) return '-';
  const role = roles.find((entry) => String(entry.roleId || entry.id || '') === normalized);
  return role?.name || normalized;
}

export function formatUserStatus(status) {
  return userApiStatusToUi(status) === 'active' ? 'Activo' : 'Inactivo';
}
