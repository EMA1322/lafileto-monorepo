import { showSnackbar } from "@/utils/snackbar.js";
import { apiFetch, getDataSource } from "@/utils/api.js";

import { computeIsAdmin } from "./rbac.js";
import { mapErrorToMessage } from "./helpers.js";

export const DATA_SOURCE = getDataSource();
export const RBAC_UI_OVERRIDES_ENABLED = DATA_SOURCE !== "api";

export const USERS_JSON_URL = "/data/users.json";
export const ROLES_JSON_URL = "/data/roles.json";
export const RBAC_SEED_URL = "/data/rbac_permissions.json";

export const LS_USERS_KEY = "admin.users.list";
export const LS_ROLES_KEY = "admin.roles.list";
export const LS_PERM_OVERRIDE_KEY = "rbac.permissions.override";

export const state = {
  users: [],
  roles: [],
  rbac: {
    moduleKey: "users",
    roleId: null,
    isAdmin: false,
  },
  filters: {
    query: "",
    page: 1,
    pageSize: 10,
  },
  ui: {
    activeTab: "users",
    loadingUsers: true,
    loadingRoles: true,
    errorUsers: null,
    errorRoles: null,
  },
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

export function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

export async function fetchJSON(url) {
  const res = await fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchData({
  onUsersStatus,
  onRolesStatus,
  onUsersTable,
  onRolesView,
  onUsersCount,
} = {}) {
  const notifyUsersStatus = onUsersStatus || (() => {});
  const notifyRolesStatus = onRolesStatus || (() => {});
  const renderUsersTable = onUsersTable || (() => {});
  const renderRolesView = onRolesView || (() => {});
  const renderUsersCount = onUsersCount || (() => {});

  state.ui.loadingUsers = true;
  state.ui.loadingRoles = true;
  state.ui.errorUsers = null;
  state.ui.errorRoles = null;

  notifyUsersStatus("Cargando usuarios…");
  notifyRolesStatus("Cargando roles…");

  try {
    const [jsonUsers, jsonRoles] = await Promise.all([
      fetchJSON(USERS_JSON_URL).catch(() => []),
      fetchJSON(ROLES_JSON_URL).catch(() => []),
    ]);

    const lsUsers = readLS(LS_USERS_KEY, null);
    const lsRoles = readLS(LS_ROLES_KEY, null);

    state.users = Array.isArray(lsUsers) ? lsUsers : Array.isArray(jsonUsers) ? jsonUsers : [];
    state.roles = Array.isArray(lsRoles) ? lsRoles : Array.isArray(jsonRoles) ? jsonRoles : [];

    state.rbac.roleId = getCurrentRoleIdFromSession();
    state.rbac.isAdmin = computeIsAdmin({ roleId: state.rbac.roleId });

    state.ui.loadingUsers = false;
    state.ui.loadingRoles = false;

    renderUsersTable();
    renderRolesView();
    renderUsersCount();
  } catch (err) {
    console.error(err);
    state.ui.errorUsers = "No se pudieron cargar los usuarios.";
    state.ui.errorRoles = "No se pudieron cargar los roles.";
    state.ui.loadingUsers = false;
    state.ui.loadingRoles = false;
    notifyUsersStatus(state.ui.errorUsers, "error");
    notifyRolesStatus(state.ui.errorRoles, "error");
    snackErr("Error al cargar datos");
  }
}

export async function apiUsersList(params) {
  const res = await apiFetch("/admin/users", { method: "GET", params });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo listar usuarios" };
  return res;
}

export async function apiUsersCreate(body) {
  const res = await apiFetch("/admin/users", { method: "POST", body });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo crear usuario" };
  return res;
}

export async function apiUsersUpdate(id, body) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "PUT", body });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo actualizar usuario" };
  return res;
}

export async function apiUsersDelete(id) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo eliminar usuario" };
  return res;
}

export async function apiRolesList() {
  const res = await apiFetch("/admin/rbac/roles", { method: "GET" });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo leer roles" };
  return res;
}

export async function apiRolesUpdate(id, body) {
  const res = await apiFetch(`/admin/rbac/roles/${encodeURIComponent(id)}`, { method: "PUT", body });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo actualizar rol" };
  return res;
}

export async function apiPermsGet(roleId) {
  const res = await apiFetch("/admin/rbac/permissions", { method: "GET", params: { roleId } });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo leer permisos" };
  return res;
}

export async function apiPermsPut(roleId, permMap) {
  const res = await apiFetch("/admin/rbac/permissions", { method: "PUT", body: permMap, params: { roleId } });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudieron guardar permisos" };
  return res;
}

export function handleStateError(err, fallback) {
  snackErr(mapErrorToMessage(err, fallback), err?.code);
}
