import { showSnackbar } from "../../utils/snackbar.js";
import { apiFetch } from "../../utils/api.js";

import { computeIsAdmin } from "./rbac.js";
import { mapErrorToMessage } from "./helpers.js";

export const PHONE_REGEX = /^[0-9()+\s-]{7,20}$/;

export const state = {
  users: {
    items: [],
    total: 0
  },
  roles: [],
  modules: [],
  rbac: {
    moduleKey: "users",
    roleId: null,
    isAdmin: false
  },
  session: {
    userId: null
  },
  ui: {
    activeTab: "users",
    loadingUsers: true,
    loadingRoles: true,
    errorUsers: null,
    errorRoles: null
  }
};

export function snackInfo(message, code) {
  showSnackbar(message, { type: "info", code });
}

export function snackOk(message, code) {
  showSnackbar(message, { type: "success", code });
}

export function snackWarn(message, code) {
  showSnackbar(message, { type: "warning", code });
}

export function snackErr(message, code = "INTERNAL_ERROR") {
  showSnackbar(message, { type: "error", code });
}

export function getCurrentRoleIdFromSession() {
  try {
    const s1 = sessionStorage.getItem("rbac.roleId");
    if (s1) return s1;
    const s2 = sessionStorage.getItem("auth.roleId");
    if (s2) return s2;
  } catch {}
  return null;
}

export function getCurrentUserIdFromSession() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id !== "undefined") return parsed.id;
  } catch {}
  return null;
}

function normalizeUsersResponse(data) {
  if (!data || typeof data !== "object") {
    return { items: [], total: 0 };
  }
  const items = Array.isArray(data.items) ? data.items : [];
  const meta = data.meta && typeof data.meta === "object" ? data.meta : {};
  return {
    items,
    total: Number(meta.total) || items.length
  };
}

export async function fetchUsers() {
  state.ui.loadingUsers = true;
  state.ui.errorUsers = null;

  const res = await apiFetch("/users", { params: { all: 1 }, showErrorToast: false });
  const { items, total } = normalizeUsersResponse(res?.data || {});

  state.users.items = items.map(mapUserFromApi);
  state.users.items.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  state.users.total = total;
  state.ui.loadingUsers = false;
}

function mapUserFromApi(u) {
  const phone = typeof u.phone === "string" && u.phone !== "0000000000" ? u.phone : null;
  return {
    id: u.id,
    fullName: u.fullName || "",
    email: u.email || "",
    phone,
    roleId: u.roleId || "",
    status: u.status || "UNKNOWN"
  };
}

function upsertUserInState(user) {
  if (!user) return null;
  const normalized = mapUserFromApi(user);
  const idx = state.users.items.findIndex((item) => String(item.id) === String(normalized.id));
  if (idx >= 0) {
    state.users.items.splice(idx, 1, normalized);
  } else {
    state.users.items.push(normalized);
  }
  state.users.items.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
  state.users.total = Math.max(state.users.items.length, state.users.total || 0);
  return normalized;
}

function removeUserFromState(userId) {
  const idx = state.users.items.findIndex((item) => String(item.id) === String(userId));
  if (idx >= 0) {
    state.users.items.splice(idx, 1);
    state.users.total = Math.max(0, (state.users.total || 0) - 1);
  }
}

export function findUserById(userId) {
  return state.users.items.find((item) => String(item.id) === String(userId)) || null;
}

export async function fetchRolesAndModules() {
  state.ui.loadingRoles = true;
  state.ui.errorRoles = null;

  const [rolesRes, modulesRes] = await Promise.all([
    apiFetch("/roles", { showErrorToast: false }),
    apiFetch("/modules", { showErrorToast: false })
  ]);

  state.roles = Array.isArray(rolesRes?.data?.items) ? rolesRes.data.items.map((r) => ({
    roleId: r.roleId || r.id || "",
    name: r.name || r.roleId || ""
  })) : [];

  state.modules = Array.isArray(modulesRes?.data?.items) ? modulesRes.data.items.map((m) => ({
    key: m.key || m.moduleKey || "",
    name: m.name || (m.key || m.moduleKey || "")
  })) : [];

  state.roles.sort((a, b) => (a.name || a.roleId || "").localeCompare(b.name || b.roleId || ""));

  state.ui.loadingRoles = false;
}

export async function createUser(payload) {
  const res = await apiFetch("/users", {
    method: "POST",
    body: payload,
    showErrorToast: false
  });
  return res?.data || null;
}

export async function updateUser(userId, payload) {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: payload,
    showErrorToast: false
  });
  return upsertUserInState(res?.data);
}

export async function deleteUser(userId) {
  const res = await apiFetch(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    showErrorToast: false
  });
  if (res?.ok) {
    removeUserFromState(userId);
  }
  return res?.data || null;
}

export async function toggleUserStatus(userId, nextStatus) {
  const user = findUserById(userId);
  if (!user) {
    throw Object.assign(new Error("Usuario no encontrado."), { code: "RESOURCE_NOT_FOUND" });
  }
  if (!user.phone) {
    throw Object.assign(new Error("El teléfono es obligatorio para actualizar."), {
      code: "VALIDATION_ERROR"
    });
  }

  return updateUser(userId, {
    fullName: user.fullName,
    phone: user.phone,
    roleId: user.roleId,
    status: nextStatus
  });
}

export function upsertRole(role) {
  if (!role) return;
  const roleId = role.roleId || role.id;
  if (!roleId) return;
  const existingIndex = state.roles.findIndex((r) => (r.roleId || r.id) === roleId);
  const entry = {
    roleId,
    name: role.name || roleId
  };
  if (existingIndex >= 0) {
    state.roles.splice(existingIndex, 1, entry);
  } else {
    state.roles.push(entry);
  }
  state.roles.sort((a, b) => (a.name || a.roleId || "").localeCompare(b.name || b.roleId || ""));
}

export function removeRole(roleId) {
  const idx = state.roles.findIndex((r) => (r.roleId || r.id) === roleId);
  if (idx >= 0) {
    state.roles.splice(idx, 1);
  }
}

export async function createRole(payload) {
  const res = await apiFetch("/roles", {
    method: "POST",
    body: payload,
    showErrorToast: false
  });
  upsertRole(res?.data);
  return res?.data || null;
}

export async function updateRole(roleId, payload) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: "PUT",
    body: payload,
    showErrorToast: false
  });
  upsertRole(res?.data);
  return res?.data || null;
}

export async function deleteRole(roleId) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: "DELETE",
    showErrorToast: false
  });
  removeRole(roleId);
  return res?.data || null;
}

export async function fetchRolePermissions(roleId) {
  const res = await apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    showErrorToast: false
  });
  const perms = Array.isArray(res?.data?.permissions) ? res.data.permissions : [];
  return perms.map((entry) => ({
    moduleKey: entry.moduleKey,
    r: !!entry.r,
    w: !!entry.w,
    u: !!entry.u,
    d: !!entry.d
  }));
}

export async function saveRolePermissions(roleId, permissions) {
  return apiFetch(`/roles/${encodeURIComponent(roleId)}/permissions`, {
    method: "PUT",
    body: { permissions },
    showErrorToast: false
  });
}

export async function fetchData({
  onUsersStatus,
  onRolesStatus,
  onUsersTable,
  onRolesView
} = {}) {
  const notifyUsersStatus = onUsersStatus || (() => {});
  const notifyRolesStatus = onRolesStatus || (() => {});
  const renderUsersTable = onUsersTable || (() => {});
  const renderRolesView = onRolesView || (() => {});

  state.ui.loadingUsers = true;
  state.ui.loadingRoles = true;
  state.ui.errorUsers = null;
  state.ui.errorRoles = null;

  notifyUsersStatus("Cargando usuarios…");
  notifyRolesStatus("Cargando roles…");

  state.rbac.roleId = getCurrentRoleIdFromSession();
  state.rbac.isAdmin = computeIsAdmin({ roleId: state.rbac.roleId });
  state.session.userId = getCurrentUserIdFromSession();

  try {
    await fetchUsers();
    renderUsersTable();
    notifyUsersStatus("");
  } catch (err) {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = "No se pudieron cargar los usuarios.";
    notifyUsersStatus(state.ui.errorUsers, "error");
    snackErr(mapErrorToMessage(err, state.ui.errorUsers), err?.code);
  }

  try {
    await fetchRolesAndModules();
    renderRolesView();
    notifyRolesStatus("");
  } catch (err) {
    state.ui.loadingRoles = false;
    state.ui.errorRoles = "No se pudieron cargar los roles.";
    notifyRolesStatus(state.ui.errorRoles, "error");
    snackErr(mapErrorToMessage(err, state.ui.errorRoles), err?.code);
  }
}

export async function reloadUsers({ onUsersStatus, onUsersTable } = {}) {
  const notifyStatus = onUsersStatus || (() => {});
  const renderTable = onUsersTable || (() => {});

  state.ui.loadingUsers = true;
  state.ui.errorUsers = null;
  notifyStatus("Cargando usuarios…");

  try {
    await fetchUsers();
    renderTable();
    notifyStatus("");
  } catch (err) {
    state.ui.loadingUsers = false;
    state.ui.errorUsers = "No se pudieron cargar los usuarios.";
    notifyStatus(state.ui.errorUsers, "error");
    snackErr(mapErrorToMessage(err, state.ui.errorUsers), err?.code);
  }
}

export function handleStateError(err, fallback) {
  snackErr(mapErrorToMessage(err, fallback), err?.code);
}
