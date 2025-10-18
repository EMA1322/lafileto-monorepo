import { apiFetch } from '@/utils/api.js';
import { showToast } from '@/utils/snackbar.js';

import { STATUS } from '@/utils/status.enum.js';
import { mapErrorToMessage } from './helpers.js';
import { computeIsAdmin } from './rbac.js';

const TABLE_PAGE_SIZE = 10;

const state = {
  users: {
    items: [],
    total: 0,
  },
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
    loadingUsers: false,
    loadingRoles: false,
    errorUsers: null,
    errorRoles: null,
    usersMessage: '',
    rolesMessage: '',
  },
};

const listeners = {
  users: new Set(),
  roles: new Set(),
  rbac: new Set(),
};

function emitUsers() {
  const snapshot = getUsersSnapshot();
  listeners.users.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[users] listener error', err);
    }
  });
}

function emitRoles() {
  const snapshot = getRolesSnapshot();
  listeners.roles.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[users] roles listener error', err);
    }
  });
}

function emitRbac() {
  const snapshot = getRbacSnapshot();
  listeners.rbac.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[users] rbac listener error', err);
    }
  });
}

export function subscribeUsers(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.users.add(listener);
  listener(getUsersSnapshot());
  return () => listeners.users.delete(listener);
}

export function subscribeRoles(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.roles.add(listener);
  listener(getRolesSnapshot());
  return () => listeners.roles.delete(listener);
}

export function subscribeRbac(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.rbac.add(listener);
  listener(getRbacSnapshot());
  return () => listeners.rbac.delete(listener);
}

export function getUsersSnapshot() {
  return {
    items: [...state.users.items],
    total: state.users.total,
    loading: state.ui.loadingUsers,
    error: state.ui.errorUsers,
    message: state.ui.usersMessage,
  };
}

export function getRolesSnapshot() {
  return {
    items: [...state.roles],
    modules: [...state.modules],
    loading: state.ui.loadingRoles,
    error: state.ui.errorRoles,
    message: state.ui.rolesMessage,
  };
}

export function getRbacSnapshot() {
  return {
    ...state.rbac,
    sessionUserId: state.session.userId,
    activeTab: state.ui.activeTab,
  };
}

function setUsers(items, total) {
  state.users.items = items;
  state.users.total = total;
  emitUsers();
}

function setRoles(items) {
  state.roles = items;
  emitRoles();
}

function setModules(items) {
  state.modules = items;
  emitRoles();
}

function setUsersMessage(message) {
  state.ui.usersMessage = message;
  emitUsers();
}

function setRolesMessage(message) {
  state.ui.rolesMessage = message;
  emitRoles();
}

export function setActiveTab(tab) {
  state.ui.activeTab = tab === 'roles' ? 'roles' : 'users';
  emitRbac();
}

export function getActiveTab() {
  return state.ui.activeTab;
}

function getCurrentRoleIdFromSession() {
  try {
    const r1 = sessionStorage.getItem('rbac.roleId');
    if (r1) return r1;
    const r2 = sessionStorage.getItem('auth.roleId');
    if (r2) return r2;
  } catch {}
  return null;
}

function getCurrentUserIdFromSession() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id !== 'undefined') return parsed.id;
  } catch {}
  return null;
}

function mapUserFromApi(entry) {
  if (!entry) return null;
  const phone = typeof entry.phone === 'string' && entry.phone !== '0000000000' ? entry.phone : '';
  const status = String(entry.status || STATUS.ACTIVE).toUpperCase();
  return {
    id: entry.id,
    fullName: entry.fullName || '',
    email: entry.email || '',
    phone,
    roleId: entry.roleId || '',
    status,
  };
}

function normalizeUsersResponse(res) {
  const items = Array.isArray(res?.data?.items) ? res.data.items : [];
  const meta = res?.data?.meta && typeof res.data.meta === 'object' ? res.data.meta : {};
  const mapped = items.map(mapUserFromApi).filter(Boolean);
  mapped.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'es', { sensitivity: 'base' }));
  return {
    items: mapped,
    total: Number(meta.total) || mapped.length,
  };
}

export async function initializeState() {
  state.rbac.roleId = getCurrentRoleIdFromSession();
  state.rbac.isAdmin = computeIsAdmin({ roleId: state.rbac.roleId });
  state.session.userId = getCurrentUserIdFromSession();
  emitRbac();
}

export async function loadUsers() {
  state.ui.loadingUsers = true;
  state.ui.errorUsers = null;
  setUsersMessage('Cargando usuarios…');

  try {
    const res = await apiFetch('/users', { params: { all: 1 }, showErrorToast: false });
    const { items, total } = normalizeUsersResponse(res);
    state.ui.loadingUsers = false;
    state.ui.usersMessage = '';
    setUsers(items, total);
    return items;
  } catch (err) {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = 'No se pudieron cargar los usuarios.';
    setUsersMessage(state.ui.errorUsers);
    throw err;
  }
}

export async function loadRolesAndModules() {
  state.ui.loadingRoles = true;
  state.ui.errorRoles = null;
  setRolesMessage('Cargando roles…');

  try {
    const [rolesRes, modulesRes] = await Promise.all([
      apiFetch('/roles', { showErrorToast: false }),
      apiFetch('/modules', { showErrorToast: false }),
    ]);

    const roles = Array.isArray(rolesRes?.data?.items)
      ? rolesRes.data.items.map((role) => ({
          roleId: role.roleId || role.id || '',
          name: role.name || role.roleId || '',
        }))
      : [];
    roles.sort((a, b) => (a.name || a.roleId || '').localeCompare(b.name || b.roleId || '', 'es', { sensitivity: 'base' }));

    const modules = Array.isArray(modulesRes?.data?.items)
      ? modulesRes.data.items.map((mod) => ({
          key: mod.key || mod.moduleKey || '',
          name: mod.name || mod.key || mod.moduleKey || '',
        }))
      : [];

    state.ui.loadingRoles = false;
    state.ui.rolesMessage = '';
    setRoles(roles);
    setModules(modules);
    return roles;
  } catch (err) {
    state.ui.loadingRoles = false;
    state.ui.errorRoles = 'No se pudieron cargar los roles.';
    setRolesMessage(state.ui.errorRoles);
    throw err;
  }
}

export async function reloadUsers({ silent } = {}) {
  if (!silent) {
    state.ui.loadingUsers = true;
    state.ui.errorUsers = null;
    setUsersMessage('Actualizando usuarios…');
  }
  try {
    const res = await apiFetch('/users', { params: { all: 1 }, showErrorToast: false });
    const { items, total } = normalizeUsersResponse(res);
    state.ui.loadingUsers = false;
    state.ui.usersMessage = '';
    setUsers(items, total);
    return items;
  } catch (err) {
    state.ui.loadingUsers = false;
    if (!silent) {
      state.ui.errorUsers = 'No se pudieron actualizar los usuarios.';
      setUsersMessage(state.ui.errorUsers);
    }
    throw err;
  }
}

function upsertUser(user) {
  const normalized = mapUserFromApi(user);
  if (!normalized) return null;
  const idx = state.users.items.findIndex((item) => String(item.id) === String(normalized.id));
  if (idx >= 0) {
    state.users.items.splice(idx, 1, normalized);
  } else {
    state.users.items.push(normalized);
  }
  state.users.items.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'es', { sensitivity: 'base' }));
  state.users.total = Math.max(state.users.items.length, state.users.total || 0);
  emitUsers();
  return normalized;
}

function removeUser(userId) {
  const idx = state.users.items.findIndex((item) => String(item.id) === String(userId));
  if (idx >= 0) {
    state.users.items.splice(idx, 1);
    state.users.total = Math.max(0, state.users.items.length);
    emitUsers();
  }
}

export function findUserById(userId) {
  return state.users.items.find((item) => String(item.id) === String(userId)) || null;
}

export async function createUser(payload) {
  const res = await apiFetch('/users', {
    method: 'POST',
    body: payload,
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudo crear el usuario.');
  const created = mapUserFromApi(res.data);
  if (created) {
    state.users.items.push(created);
    state.users.items.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'es', { sensitivity: 'base' }));
    state.users.total = Math.max(state.users.items.length, state.users.total || 0);
    emitUsers();
  }
  return created;
}

export async function updateUser(userId, payload) {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: payload,
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudo actualizar el usuario.');
  return upsertUser(res.data);
}

export async function deleteUser(userId) {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudo eliminar el usuario.');
  removeUser(userId);
  return res.data;
}

export async function toggleUserStatus(userId, nextStatus) {
  const user = findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Usuario no encontrado.'), { code: 'RESOURCE_NOT_FOUND' });
  }
  if (!user.phone) {
    throw Object.assign(new Error('El teléfono es obligatorio para actualizar.'), { code: 'VALIDATION_ERROR' });
  }
  const payload = {
    fullName: user.fullName,
    phone: user.phone,
    roleId: user.roleId,
    status: nextStatus === STATUS.INACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE,
  };
  return updateUser(userId, payload);
}

export function upsertRole(role) {
  if (!role) return;
  const roleId = role.roleId || role.id;
  if (!roleId) return;
  const entry = {
    roleId,
    name: role.name || roleId,
  };
  const idx = state.roles.findIndex((item) => (item.roleId || item.id) === roleId);
  if (idx >= 0) {
    state.roles.splice(idx, 1, entry);
  } else {
    state.roles.push(entry);
  }
  state.roles.sort((a, b) => (a.name || a.roleId || '').localeCompare(b.name || b.roleId || '', 'es', { sensitivity: 'base' }));
  emitRoles();
}

export function removeRole(roleId) {
  const idx = state.roles.findIndex((item) => (item.roleId || item.id) === roleId);
  if (idx >= 0) {
    state.roles.splice(idx, 1);
    emitRoles();
  }
}

export async function createRole(payload) {
  const res = await apiFetch('/roles', {
    method: 'POST',
    body: payload,
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudo crear el rol.');
  upsertRole(res.data);
  return res.data;
}

export async function updateRole(roleId, payload) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'PUT',
    body: payload,
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudo actualizar el rol.');
  upsertRole(res.data);
  return res.data;
}

export async function deleteRole(roleId) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudo eliminar el rol.');
  removeRole(roleId);
  return res.data;
}

export async function fetchRolePermissions(roleId) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudieron obtener los permisos.');
  const permissions = Array.isArray(res?.data?.permissions) ? res.data.permissions : [];
  return permissions.map((entry) => ({
    moduleKey: entry.moduleKey,
    r: !!entry.r,
    w: !!entry.w,
    u: !!entry.u,
    d: !!entry.d,
  }));
}

export async function saveRolePermissions(roleId, permissions) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    method: 'PUT',
    body: { permissions },
    showErrorToast: false,
  });
  if (!res?.ok) throw res?.error || new Error('No se pudieron guardar los permisos.');
  return res.data;
}

export function notifyError(err, fallback) {
  showToast({
    message: mapErrorToMessage(err, fallback),
    type: 'error',
  });
}

export { state, TABLE_PAGE_SIZE };
