import { toast } from '../../utils/toast.js';
import { apiFetch } from '../../utils/api.js';
import { computePageCount } from '../../utils/helpers.js';

import { computeIsAdmin, mapErrorToMessage } from './users.helpers.js';

export const PHONE_REGEX = /^[0-9()+\s-]{7,20}$/;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];
export const ORDER_FIELDS = ['fullName', 'email', 'status', 'createdAt'];
export const ORDER_DIRECTIONS = ['asc', 'desc'];

const usersState = {
  items: [],
  total: 0,
  meta: {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  },
};

const defaultFilters = {
  q: '',
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  orderBy: 'fullName',
  orderDir: 'asc',
};

function sanitizeFilters(input = {}) {
  const source = { ...defaultFilters, ...(input || {}) };
  const filters = { ...defaultFilters };

  filters.q = typeof source.q === 'string' ? source.q.trim() : '';

  const orderBy = typeof source.orderBy === 'string' ? source.orderBy : defaultFilters.orderBy;
  filters.orderBy = ORDER_FIELDS.includes(orderBy) ? orderBy : defaultFilters.orderBy;

  const orderDir = typeof source.orderDir === 'string' ? source.orderDir : defaultFilters.orderDir;
  filters.orderDir = ORDER_DIRECTIONS.includes(orderDir) ? orderDir : defaultFilters.orderDir;

  const pageValue = Number(source.page);
  filters.page = Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : defaultFilters.page;

  const pageSizeValue = Number(source.pageSize);
  filters.pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeValue) ? pageSizeValue : DEFAULT_PAGE_SIZE;

  return filters;
}

function syncUsersMeta(partial = {}) {
  const base = usersState.meta ?? {
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    pageCount: 1,
  };

  const pageSizeNumber = Number(partial.pageSize ?? base.pageSize);
  const normalizedPageSize = Number.isFinite(pageSizeNumber) && pageSizeNumber > 0
    ? Math.floor(pageSizeNumber)
    : DEFAULT_PAGE_SIZE;

  const totalNumber = Number(partial.total ?? base.total ?? usersState.total ?? 0);
  const normalizedTotal = Number.isFinite(totalNumber) && totalNumber >= 0 ? totalNumber : 0;

  const pageNumber = Number(partial.page ?? base.page ?? 1);
  const rawPage = Number.isFinite(pageNumber) && pageNumber > 0 ? Math.floor(pageNumber) : 1;

  const pageCountNumber = Number(partial.pageCount);
  const normalizedPageCount = Number.isFinite(pageCountNumber) && pageCountNumber > 0
    ? Math.floor(pageCountNumber)
    : computePageCount(normalizedTotal, normalizedPageSize, DEFAULT_PAGE_SIZE);

  const clampedPage = Math.min(Math.max(1, rawPage), Math.max(1, normalizedPageCount));

  usersState.meta = {
    page: clampedPage,
    pageSize: normalizedPageSize,
    total: normalizedTotal,
    pageCount: Math.max(1, normalizedPageCount),
  };

  return usersState.meta;
}

export const state = {
  users: usersState,
  roles: [],
  modules: [],
  rbac: {
    moduleKey: 'users',
    roleId: null,
    isAdmin: false,
  },
  session: {
    userId: null,
  },
  ui: {
    activeTab: 'users',
    loadingUsers: true,
    loadingRoles: true,
    errorUsers: null,
    errorRoles: null,
  },
  filters: sanitizeFilters(defaultFilters),
};

Object.defineProperty(state, 'users', {
  enumerable: true,
  configurable: false,
  get() {
    return usersState;
  },
  set(value) {
    if (Array.isArray(value)) {
      usersState.items = value.map(normalizeUserEntry).filter(Boolean);
      usersState.items.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      usersState.total = usersState.items.length;
      syncUsersMeta({ total: usersState.total, page: 1 });
      return;
    }

    if (value && typeof value === 'object') {
      if (Array.isArray(value.items)) {
        usersState.items = value.items.map(normalizeUserEntry).filter(Boolean);
        usersState.items.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      }
      if (typeof value.total !== 'undefined') {
        usersState.total = Number(value.total) || usersState.items.length;
      } else {
        usersState.total = usersState.items.length;
      }
      const metaPayload = value.meta && typeof value.meta === 'object' ? { ...value.meta } : {};
      if (typeof metaPayload.total === 'undefined') {
        metaPayload.total = usersState.total;
      }
      syncUsersMeta(metaPayload);
      return;
    }

    usersState.items = [];
    usersState.total = 0;
    syncUsersMeta({ total: 0, page: 1 });
  },
});

function normalizeUserEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const id = entry.id ?? entry.userId ?? entry.uuid ?? entry.email ?? entry.fullName ?? null;
  const first = entry.firstName || entry.givenName || '';
  const last = entry.lastName || entry.familyName || '';
  const composed = [first, last].filter(Boolean).join(' ').trim();
  const fullName = entry.fullName || entry.name || composed;
  const email = entry.email || entry.mail || '';
  const phoneRaw = entry.phone || entry.telephone || entry.tel || null;
  const phone = typeof phoneRaw === 'string' && phoneRaw !== '0000000000' ? phoneRaw : null;
  const roleId = entry.roleId || entry.role_id || entry.role || '';
  const statusRaw = entry.status || entry.state || 'UNKNOWN';

  return {
    id,
    fullName: fullName || '',
    email,
    phone,
    roleId,
    status: String(statusRaw || 'UNKNOWN').toUpperCase(),
  };
}

function normalizeUsersResponse(data) {
  if (!data || typeof data !== 'object') {
    return {
      items: [],
      meta: {
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        pageCount: 1,
      },
    };
  }
  const items = Array.isArray(data.items) ? data.items : [];
  const metaRaw = data.meta && typeof data.meta === 'object' ? data.meta : {};

  const pickNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const metaTotal = pickNumber(metaRaw.total);
  const metaPageSize = pickNumber(metaRaw.pageSize);
  const metaPage = pickNumber(metaRaw.page);
  const metaPageCount = pickNumber(metaRaw.pageCount);

  const safePageSize = metaPageSize !== null && metaPageSize > 0 ? metaPageSize : DEFAULT_PAGE_SIZE;
  const safeTotal = metaTotal !== null && metaTotal >= 0 ? metaTotal : items.length;
  const computedPageCount = metaPageCount !== null && metaPageCount > 0
    ? Math.floor(metaPageCount)
    : computePageCount(safeTotal, safePageSize, DEFAULT_PAGE_SIZE);
  const safePage = metaPage !== null && metaPage > 0 ? Math.min(Math.floor(metaPage), computedPageCount) : 1;

  return {
    items,
    meta: {
      page: safePage,
      pageSize: safePageSize,
      total: safeTotal,
      pageCount: Math.max(1, computedPageCount),
    },
  };
}

export function setFilters(partial) {
  const next = sanitizeFilters({ ...state.filters, ...(partial || {}) });
  state.filters = next;
  syncUsersMeta({ page: next.page, pageSize: next.pageSize });
}

export function resetFilters() {
  state.filters = sanitizeFilters(defaultFilters);
  syncUsersMeta({ page: state.filters.page, pageSize: state.filters.pageSize });
}

export function replaceFilters(nextFilters) {
  state.filters = sanitizeFilters(nextFilters);
  syncUsersMeta({ page: state.filters.page, pageSize: state.filters.pageSize });
}

export function setPage(page) {
  setFilters({ page });
}

export function setPageSize(pageSize) {
  setFilters({ pageSize });
}

export function parseFiltersFromHash(hashString = '') {
  if (typeof hashString !== 'string') return null;
  const trimmed = hashString.replace(/^#/, '');
  const [path, query = ''] = trimmed.split('?');
  if (path && path !== 'users') return null;
  const params = new URLSearchParams(query);
  const raw = { ...defaultFilters };

  if (params.has('q')) raw.q = params.get('q') || '';
  if (params.has('orderBy')) raw.orderBy = params.get('orderBy');
  if (params.has('orderDir')) raw.orderDir = params.get('orderDir');
  if (params.has('page')) raw.page = params.get('page');
  if (params.has('pageSize')) raw.pageSize = params.get('pageSize');

  return sanitizeFilters(raw);
}

export function getFiltersQuery(filters = state.filters) {
  const data = sanitizeFilters(filters);
  const params = new URLSearchParams();

  if (data.q) params.set('q', data.q);
  if (data.orderBy && data.orderBy !== defaultFilters.orderBy) params.set('orderBy', data.orderBy);
  if (data.orderDir && data.orderDir !== defaultFilters.orderDir) params.set('orderDir', data.orderDir);
  if (Number(data.page) > 1) params.set('page', String(data.page));
  if (Number(data.pageSize) !== defaultFilters.pageSize) params.set('pageSize', String(data.pageSize));

  return params.toString();
}

const TOAST_DEFAULT = 3200;
const TOAST_ERROR = 4600;

export function snackInfo(message) {
  toast.info(message, { duration: TOAST_DEFAULT });
}

export function snackOk(message) {
  toast.success(message, { duration: TOAST_DEFAULT });
}

export function snackWarn(message) {
  toast.info(message, { duration: TOAST_DEFAULT });
}

export function snackErr(message) {
  toast.error(message, { duration: TOAST_ERROR });
}

export function getCurrentRoleIdFromSession() {
  try {
    const s1 = sessionStorage.getItem('rbac.roleId');
    if (s1) return s1;
    const s2 = sessionStorage.getItem('auth.roleId');
    if (s2) return s2;
  } catch {
    /* ignore */
  }
  return null;
}

export function getCurrentUserIdFromSession() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id !== 'undefined') return parsed.id;
  } catch {
    /* ignore */
  }
  return null;
}

function mapUserFromApi(user) {
  const normalized = normalizeUserEntry(user);
  if (!normalized) return null;
  return normalized;
}

export async function fetchUsers() {
  state.ui.loadingUsers = true;
  state.ui.errorUsers = null;

  const params = {
    page: state.filters.page,
    pageSize: state.filters.pageSize,
    orderBy: state.filters.orderBy,
    orderDir: state.filters.orderDir,
  };
  if (state.filters.q) {
    params.q = state.filters.q;
  }

  const res = await apiFetch('/users', { params, showErrorToast: false });
  const { items, meta } = normalizeUsersResponse(res?.data || {});

  const mapped = items
    .map(mapUserFromApi)
    .filter(Boolean)
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  usersState.items = mapped;
  usersState.total = Number(meta.total) || mapped.length;
  syncUsersMeta({ ...meta, total: usersState.total });
  state.filters = sanitizeFilters({
    ...state.filters,
    page: usersState.meta.page,
    pageSize: usersState.meta.pageSize,
  });
  state.ui.loadingUsers = false;
}

function upsertUserInState(user) {
  const normalized = mapUserFromApi(user);
  if (!normalized) return null;
  const idx = usersState.items.findIndex((item) => String(item.id) === String(normalized.id));
  if (idx >= 0) {
    usersState.items.splice(idx, 1, normalized);
  } else {
    usersState.items.push(normalized);
  }
  usersState.items.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  usersState.total = Math.max(usersState.items.length, usersState.total || 0);
  syncUsersMeta({ total: usersState.total });
  return normalized;
}

function removeUserFromState(userId) {
  const idx = usersState.items.findIndex((item) => String(item.id) === String(userId));
  if (idx >= 0) {
    usersState.items.splice(idx, 1);
    usersState.total = Math.max(0, (usersState.total || 0) - 1);
    syncUsersMeta({ total: usersState.total });
  }
}

export function findUserById(userId) {
  return usersState.items.find((item) => String(item.id) === String(userId)) || null;
}

export async function fetchRolesAndModules() {
  state.ui.loadingRoles = true;
  state.ui.errorRoles = null;

  const [rolesRes, modulesRes] = await Promise.all([
    apiFetch('/roles', { showErrorToast: false }),
    apiFetch('/modules', { showErrorToast: false }),
  ]);

  state.roles = Array.isArray(rolesRes?.data?.items)
    ? rolesRes.data.items.map((role) => ({
        roleId: role.roleId || role.id || '',
        name: role.name || role.roleId || '',
      }))
    : [];

  state.modules = Array.isArray(modulesRes?.data?.items)
    ? modulesRes.data.items.map((mod) => ({
        key: mod.key || mod.moduleKey || '',
        name: mod.name || mod.key || mod.moduleKey || '',
      }))
    : [];

  state.roles.sort((a, b) => (a.name || a.roleId || '').localeCompare(b.name || b.roleId || ''));

  state.ui.loadingRoles = false;
}

export async function createUser(payload) {
  const res = await apiFetch('/users', {
    method: 'POST',
    body: payload,
    showErrorToast: false,
  });
  return res?.data || null;
}

export async function updateUser(userId, payload) {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: payload,
    showErrorToast: false,
  });
  return upsertUserInState(res?.data);
}

export async function deleteUser(userId) {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    showErrorToast: false,
  });
  if (res?.ok) {
    removeUserFromState(userId);
  }
  return res?.data || null;
}

export async function toggleUserStatus(userId, nextStatus) {
  const user = findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado.'), { code: 'RESOURCE_NOT_FOUND' });
  }
  if (!user.phone) {
    throw Object.assign(new Error('El teléfono es obligatorio para actualizar.'), {
      code: 'VALIDATION_ERROR',
    });
  }

  return updateUser(userId, {
    fullName: user.fullName,
    phone: user.phone,
    roleId: user.roleId,
    status: nextStatus,
  });
}

export function upsertRole(role) {
  if (!role) return;
  const roleId = role.roleId || role.id;
  if (!roleId) return;
  const existingIndex = state.roles.findIndex((r) => (r.roleId || r.id) === roleId);
  const entry = {
    roleId,
    name: role.name || roleId,
  };
  if (existingIndex >= 0) {
    state.roles.splice(existingIndex, 1, entry);
  } else {
    state.roles.push(entry);
  }
  state.roles.sort((a, b) => (a.name || a.roleId || '').localeCompare(b.name || b.roleId || ''));
}

export function removeRole(roleId) {
  const idx = state.roles.findIndex((r) => (r.roleId || r.id) === roleId);
  if (idx >= 0) {
    state.roles.splice(idx, 1);
  }
}

export async function createRole(payload) {
  const res = await apiFetch('/roles', {
    method: 'POST',
    body: payload,
    showErrorToast: false,
  });
  upsertRole(res?.data);
  return res?.data || null;
}

export async function updateRole(roleId, payload) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'PUT',
    body: payload,
    showErrorToast: false,
  });
  upsertRole(res?.data);
  return res?.data || null;
}

export async function deleteRole(roleId) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
    showErrorToast: false,
  });
  removeRole(roleId);
  return res?.data || null;
}

export async function fetchRolePermissions(roleId) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    showErrorToast: false,
  });
  const perms = Array.isArray(res?.data?.permissions) ? res.data.permissions : [];
  return perms.map((entry) => ({
    moduleKey: entry.moduleKey,
    r: !!entry.r,
    w: !!entry.w,
    u: !!entry.u,
    d: !!entry.d,
  }));
}

export async function saveRolePermissions(roleId, permissions) {
  return apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    method: 'PUT',
    body: { permissions },
    showErrorToast: false,
  });
}

export async function fetchData({
  onUsersStatus,
  onRolesStatus,
  onUsersTable,
  onRolesView,
} = {}) {
  const notifyUsersStatus = onUsersStatus || (() => {});
  const notifyRolesStatus = onRolesStatus || (() => {});
  const renderUsersTable = onUsersTable || (() => {});
  const renderRolesView = onRolesView || (() => {});

  state.ui.loadingUsers = true;
  state.ui.loadingRoles = true;
  state.ui.errorUsers = null;
  state.ui.errorRoles = null;

  notifyUsersStatus('Cargando usuarios…');
  notifyRolesStatus('Cargando roles…');

  state.rbac.roleId = getCurrentRoleIdFromSession();
  state.rbac.isAdmin = computeIsAdmin({ roleId: state.rbac.roleId });
  state.session.userId = getCurrentUserIdFromSession();

  try {
    await fetchUsers();
    renderUsersTable();
    notifyUsersStatus('');
  } catch (err) {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = 'No se pudieron cargar los usuarios.';
    notifyUsersStatus(state.ui.errorUsers, 'error');
    snackErr(mapErrorToMessage(err, state.ui.errorUsers), err?.code);
  }

  try {
    await fetchRolesAndModules();
    renderRolesView();
    notifyRolesStatus('');
  } catch (err) {
    state.ui.loadingRoles = false;
    state.ui.errorRoles = 'No se pudieron cargar los roles.';
    notifyRolesStatus(state.ui.errorRoles, 'error');
    snackErr(mapErrorToMessage(err, state.ui.errorRoles), err?.code);
  }
}

export async function reloadUsers({ onUsersStatus, onUsersTable } = {}) {
  const notifyStatus = onUsersStatus || (() => {});
  const renderTable = onUsersTable || (() => {});

  state.ui.loadingUsers = true;
  state.ui.errorUsers = null;
  notifyStatus('Cargando usuarios…');

  try {
    await fetchUsers();
    renderTable();
    notifyStatus('');
  } catch (err) {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = 'No se pudieron cargar los usuarios.';
    notifyStatus(state.ui.errorUsers, 'error');
    snackErr(mapErrorToMessage(err, state.ui.errorUsers), err?.code);
  }
}

export function handleStateError(err, fallback) {
  snackErr(mapErrorToMessage(err, fallback), err?.code);
}
