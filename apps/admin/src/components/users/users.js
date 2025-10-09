// /admin/src/components/users/users.js
// ============================================================================
//  ADMIN MODULE: USERS (Usuarios + Roles & Permisos) — ES Modules
//  - Código en inglés; comentarios en español.
//  - RBAC UI por acciones (R/W/U/D) y pestaña exclusiva de Admin
//  - Demo con JSON + LocalStorage (server-first cuando DATA_SOURCE='api')
//  - Accesibilidad: tabs ARIA, modales reutilizando utils/modals, snackbar
//  - Responsive: tabla con scroll horizontal en mobile (CSS del módulo)
// ============================================================================

import { openModal, closeModal } from "@/utils/modals.js";
import { showSnackbar } from "@/utils/snackbar.js";
import { normalizeText, createId as helpersCreateId } from "@/utils/helpers.js";
import * as rbac from "@/utils/rbac.js";
import { apiFetch, getDataSource } from "@/utils/api.js";

// ==============================
// Flags / Config
// ==============================

const DATA_SOURCE = getDataSource();                 // 'json' | 'api'
const RBAC_UI_OVERRIDES_ENABLED = DATA_SOURCE !== "api"; // en 'api' no persistimos overrides locales

const MODULE_KEY = "users";           // clave del módulo en RBAC
const MODULE_KEY_ALIAS = "user";      // alias por compatibilidad si la semilla no fue migrada aún
const ADMIN_ROLE_IDS = ["admin", "admin-supervisor"]; // admin-supervisor: no elimina (lo maneja RBAC server)

const USERS_JSON_URL = "/data/users.json";
const ROLES_JSON_URL = "/data/roles.json";
const RBAC_SEED_URL = "/data/rbac_permissions.json";

const LS_USERS_KEY = "admin.users.list";
const LS_ROLES_KEY = "admin.roles.list";
const LS_PERM_OVERRIDE_KEY = "rbac.permissions.override";

// Módulos visibles en la matriz v1
const MATRIX_MODULES = ["admin-header", "dashboard", "products", "categories", "settings", "users"];

// ==============================
// Estado del módulo (en memoria)
// ==============================

const state = {
  users: [],
  roles: [],
  rbac: {
    moduleKey: MODULE_KEY,
    roleId: null,     // se intenta leer de sessionStorage
    isAdmin: false,   // pestaña "Roles & Permisos"
  },
  filters: {
    query: "",
    page: 1,
    pageSize: 10,
  },
  ui: {
    activeTab: "users", // "users" | "roles"
    loadingUsers: true,
    loadingRoles: true,
    errorUsers: null,
    errorRoles: null,
  },
};

// ==============================
// Utilidades locales
// ==============================

/** Fallback createId por si helpers no lo expone */
function generateId(prefix = "id") {
  if (typeof helpersCreateId === "function") return helpersCreateId(prefix);
  const rand = Math.random().toString(36).slice(2, 8);
  const now = Date.now().toString(36);
  return `${prefix}-${now}${rand}`;
}

/** Escape mínimo para inyectar texto en HTML de forma segura */
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Normaliza texto (usa helper si existe) */
function norm(str) {
  try {
    return normalizeText ? normalizeText(String(str)) : String(str).toLowerCase();
  } catch {
    return String(str).toLowerCase();
  }
}

/** Formatea fecha ISO a dd/mm/yyyy para UI */
function formatDateDDMMYYYY(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Debounce simple para inputs */
function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** LS helpers */
function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Intenta obtener roleId actual desde sessionStorage (convenciones comunes) */
function getCurrentRoleIdFromSession() {
  try {
    const s1 = sessionStorage.getItem("rbac.roleId");
    if (s1) return s1;
    const s2 = sessionStorage.getItem("auth.roleId");
    if (s2) return s2;
  } catch {}
  return null;
}

/** Snackbar unificada por code */
function snackInfo(message, code) { showSnackbar(message, { type: "info", code }); }
function snackOk(message, code)   { showSnackbar(message, { type: "success", code }); }
function snackWarn(message, code) { showSnackbar(message, { type: "warning", code }); }
function snackErr(message, code = "INTERNAL_ERROR") { showSnackbar(message, { type: "error", code }); }

function mapErrorToMessage(err, fallback = "Ocurrió un error.") {
  const code = err?.code || "";
  if (code === "VALIDATION_ERROR") return "Revisá los datos: hay campos inválidos.";
  if (code === "AUTH_REQUIRED" || code === "AUTH_INVALID") return "Iniciá sesión / Tu sesión expiró.";
  if (code === "PERMISSION_DENIED") return "No tenés permisos para esta acción.";
  if (code === "RESOURCE_NOT_FOUND") return "El recurso no existe o fue eliminado.";
  if (code === "CONFLICT" || code === "RESOURCE_CONFLICT") return "Operación en conflicto. Revisá los datos.";
  if (code === "RATE_LIMITED") return "Demasiadas solicitudes. Probá en unos minutos.";
  return err?.message || fallback;
}

/** Admin por roleId estable o full-perms efectivos */
function computeIsAdmin({ roleId } = {}) {
  const rid = roleId ? String(roleId).toLowerCase() : "";
  if (ADMIN_ROLE_IDS.includes(rid)) return true;

  // Fallback: full-perms efectivos en sesión
  try {
    const raw = sessionStorage.getItem("effectivePermissions");
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Object.values(map || {}).every((p) => p && p.r && p.w && p.u && p.d);
  } catch { return false; }
}

/** Verifica permiso por acción y notifica si no autorizado */
function guardAction(action /* 'write'|'update'|'delete' */) {
  const key = MODULE_KEY;
  const keyAlias = MODULE_KEY_ALIAS;
  let ok = true;

  if (action === "write") {
    ok = (rbac.canWrite && rbac.canWrite(key)) || (rbac.canWrite && rbac.canWrite(keyAlias));
  } else if (action === "update") {
    ok = (rbac.canUpdate && rbac.canUpdate(key)) || (rbac.canUpdate && rbac.canUpdate(keyAlias));
  } else if (action === "delete") {
    ok =
      (rbac.canDelete && rbac.canDelete(key)) ||
      (rbac.canDelete && rbac.canDelete(keyAlias));
    // extra: si el rol es admin-supervisor, reforzamos no-eliminar
    if (String(state.rbac.roleId).toLowerCase() === "admin-supervisor") ok = false;
  }

  if (!ok) snackWarn("No tenés permisos para esta acción.", "PERMISSION_DENIED");
  return ok;
}

/** Suma controlada para paginación */
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// ==============================
// Selectores (lazy)
// ==============================

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function els() {
  return {
    tabUsers: $("#tab-users"),
    tabRoles: $("#tab-roles"),
    panelUsers: $("#panel-users"),
    panelRoles: $("#panel-roles"),
    pageSize: $("#users-page-size"),
    search: $("#users-search"),
    btnNew: $("#btn-user-new"),
    statusUsers: $("#users-status"),
    statusRoles: $("#roles-status"),
    tableUsers: $("#users-table"),
    tbodyUsers: $("#users-tbody"),
    countUsers: $("#users-count"),
    pagination: $("#users-pagination"),
    pagePrev: $("#users-page-prev"),
    pageNext: $("#users-page-next"),
    pageInfo: $("#users-page-info"),
    tbodyRoles: $("#roles-tbody"),
  };
}

// ==============================
// Data layer (JSON demo + API stubs)
// ==============================

async function fetchJSON(url) {
  const res = await fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// --- Users API (stubs listos para cablear cuando DATA_SOURCE='api') ---
async function apiUsersList(params) {
  const res = await apiFetch("/admin/users", { method: "GET", params });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo listar usuarios" };
  return res;
}
async function apiUsersCreate(body) {
  const res = await apiFetch("/admin/users", { method: "POST", body });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo crear usuario" };
  return res;
}
async function apiUsersUpdate(id, body) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "PUT", body });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo actualizar usuario" };
  return res;
}
async function apiUsersDelete(id) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo eliminar usuario" };
  return res;
}

// --- Roles & Permissions API ---
async function apiRolesList() {
  const res = await apiFetch("/admin/rbac/roles", { method: "GET" });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo leer roles" };
  return res;
}
async function apiRolesUpdate(id, body) {
  const res = await apiFetch(`/admin/rbac/roles/${encodeURIComponent(id)}`, { method: "PUT", body });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo actualizar rol" };
  return res;
}
async function apiPermsGet(roleId) {
  const res = await apiFetch("/admin/rbac/permissions", { method: "GET", params: { roleId } });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudo leer permisos" };
  return res;
}
async function apiPermsPut(roleId, permMap) {
  const res = await apiFetch("/admin/rbac/permissions", { method: "PUT", body: permMap, params: { roleId } });
  if (!res?.ok) throw res?.error || { code: "INTERNAL_ERROR", message: "No se pudieron guardar permisos" };
  return res;
}

// ==============================
// Carga inicial (demo JSON + LS)
// ==============================

async function fetchData() {
  state.ui.loadingUsers = true;
  state.ui.loadingRoles = true;
  state.ui.errorUsers = null;
  state.ui.errorRoles = null;

  renderUsersStatus("Cargando usuarios…");
  renderRolesStatus("Cargando roles…");

  try {
    // Base desde JSON
    const [jsonUsers, jsonRoles] = await Promise.all([
      fetchJSON(USERS_JSON_URL).catch(() => []),
      fetchJSON(ROLES_JSON_URL).catch(() => []),
    ]);

    // Overrides desde localStorage (demo)
    const lsUsers = readLS(LS_USERS_KEY, null);
    const lsRoles = readLS(LS_ROLES_KEY, null);

    state.users = Array.isArray(lsUsers) ? lsUsers : Array.isArray(jsonUsers) ? jsonUsers : [];
    state.roles = Array.isArray(lsRoles) ? lsRoles : Array.isArray(jsonRoles) ? jsonRoles : [];

    // Role actual
    state.rbac.roleId = getCurrentRoleIdFromSession();

    // Admin?
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
    renderUsersStatus(state.ui.errorUsers, "error");
    renderRolesStatus(state.ui.errorRoles, "error");
    snackErr("Error al cargar datos");
  }
}

// ==============================
// Render: estados y tablas
// ==============================

function renderUsersStatus(message, type = "info") {
  const { statusUsers } = els();
  if (!statusUsers) return;
  statusUsers.textContent = message || "";
  statusUsers.dataset.type = type;
}

function renderRolesStatus(message, type = "info") {
  const { statusRoles } = els();
  if (!statusRoles) return;
  statusRoles.textContent = message || "";
  statusRoles.dataset.type = type;
}

function renderUsersCount() {
  const { countUsers } = els();
  if (!countUsers) return;
  const filtered = filterUsers(state.users, state.filters.query);
  const from = (state.filters.page - 1) * state.filters.pageSize + 1;
  const to = Math.min(state.filters.page * state.filters.pageSize, filtered.length);
  const showing = filtered.length === 0 ? 0 : `${from}–${to}`;
  countUsers.textContent = `Mostrando ${showing} de ${filtered.length} usuarios`;
}

function filterUsers(list, query) {
  if (!query) return list.slice();
  const q = norm(query);
  return list.filter((u) => {
    const roleName = (state.roles.find((r) => r.id === u.roleId)?.name) || "";
    return (
      norm(u.firstName).includes(q) ||
      norm(u.lastName).includes(q) ||
      norm(u.email).includes(q) ||
      norm(roleName).includes(q)
    );
  });
}

function renderUsersTable() {
  const { tbodyUsers, pagePrev, pageNext, pageInfo } = els();
  if (!tbodyUsers) return;

  // Estados de carga / error
  if (state.ui.loadingUsers) {
    renderUsersStatus("Cargando usuarios…");
    tbodyUsers.innerHTML = "";
    return;
  }
  if (state.ui.errorUsers) {
    renderUsersStatus(state.ui.errorUsers, "error");
    tbodyUsers.innerHTML = "";
    return;
  }

  const filtered = filterUsers(state.users, state.filters.query);
  const total = filtered.length;

  if (total === 0) {
    renderUsersStatus("No hay usuarios que coincidan con la búsqueda.");
    tbodyUsers.innerHTML = "";
    renderUsersCount();
    if (pagePrev && pageNext && pageInfo) {
      pagePrev.disabled = true;
      pageNext.disabled = true;
      pageInfo.textContent = "0 / 0";
    }
    return;
  }

  renderUsersStatus("");
  const pages = Math.max(1, Math.ceil(total / state.filters.pageSize));
  state.filters.page = clamp(state.filters.page, 1, pages);

  const start = (state.filters.page - 1) * state.filters.pageSize;
  const end = Math.min(start + state.filters.pageSize, total);
  const slice = filtered.slice(start, end);

  tbodyUsers.innerHTML = slice.map((u) => {
    const roleName = escapeHTML(state.roles.find((r) => r.id === u.roleId)?.name || "");
    const badge =
      u.status === "active"
        ? `<span class="badge badge--success">Activo</span>`
        : `<span class="badge badge--muted">Inactivo</span>`;

    return `
      <tr data-id="${escapeHTML(u.id)}">
        <td>${escapeHTML(u.firstName)}</td>
        <td>${escapeHTML(u.lastName)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${escapeHTML(u.phone || "")}</td>
        <td>${roleName}</td>
        <td>${badge}</td>
        <td class="users__row-actions">
          <button class="btn btn-secondary" type="button" data-action="view" title="Ver usuario">Ver</button>
          <button class="btn btn-secondary" type="button" data-action="edit" title="Editar usuario">Editar</button>
          <button class="btn btn-secondary" type="button" data-action="delete" title="Eliminar usuario">Eliminar</button>
        </td>
      </tr>
    `;
  }).join("");

  // Paginación
  if (pagePrev && pageNext && pageInfo) {
    pagePrev.disabled = state.filters.page <= 1;
    pageNext.disabled = state.filters.page >= pages;
    pageInfo.textContent = `${state.filters.page} / ${pages}`;
  }

  renderUsersCount();
  applyRBAC(); // filtra acciones según permisos
}

function renderRolesView() {
  const { tbodyRoles } = els();
  if (!tbodyRoles) return;

  if (state.ui.loadingRoles) {
    renderRolesStatus("Cargando roles…");
    tbodyRoles.innerHTML = "";
    return;
  }
  if (state.ui.errorRoles) {
    renderRolesStatus(state.ui.errorRoles, "error");
    tbodyRoles.innerHTML = "";
    return;
  }
  if (state.roles.length === 0) {
    renderRolesStatus("No hay roles registrados.");
    tbodyRoles.innerHTML = "";
    return;
  }

  renderRolesStatus("");
  tbodyRoles.innerHTML = state.roles.map((r) => {
    const badge =
      r.status === "active"
        ? `<span class="badge badge--success">Activo</span>`
        : `<span class="badge badge--muted">Inactivo</span>`;
    return `
      <tr data-role-id="${escapeHTML(r.id)}">
        <td>${escapeHTML(r.name)}</td>
        <td>${escapeHTML(r.description || "")}</td>
        <td>${badge}</td>
        <td class="users__row-actions">
          <button class="btn btn-secondary" type="button" data-action="role-edit" title="Editar rol">Editar</button>
          <button class="btn btn-secondary" type="button" data-action="role-perms" title="Permisos del rol">Permisos</button>
        </td>
      </tr>
    `;
  }).join("");
}

// ==============================
// RBAC aplicado a la UI
// ==============================

function applyRBAC() {
  const { tabRoles, btnNew, panelRoles, panelUsers } = els();

  // Ocultar pestaña "Roles & Permisos" a quienes no sean Admin
  if (!state.rbac.isAdmin) {
    tabRoles?.setAttribute("hidden", "true");
    panelRoles?.setAttribute("hidden", "true");
    switchTab("users");
  } else {
    tabRoles?.removeAttribute("hidden");
    if (state.ui.activeTab === "roles") {
      panelRoles?.removeAttribute("hidden");
      panelUsers?.setAttribute("hidden", "true");
    } else {
      panelRoles?.setAttribute("hidden", "true");
      panelUsers?.removeAttribute("hidden");
    }
  }

  // Botón "Nuevo usuario" sólo si Write
  if (btnNew) {
    const can =
      (rbac.canWrite && rbac.canWrite(MODULE_KEY)) ||
      (rbac.canWrite && rbac.canWrite(MODULE_KEY_ALIAS));
    btnNew.disabled = !can;
    btnNew.hidden = !can; // opcional: ocultar si no se puede
  }

  // En tabla: habilitar/deshabilitar acciones por botón
  $$("#users-tbody tr").forEach((row) => {
    const btnView = row.querySelector('[data-action="view"]');
    const btnEdit = row.querySelector('[data-action="edit"]');
    const btnDel  = row.querySelector('[data-action="delete"]');

    if (btnView) btnView.disabled = false; // ver: todos con read del módulo (si llegaron aquí ya lo tienen)

    if (btnEdit) {
      const can =
        (rbac.canUpdate && rbac.canUpdate(MODULE_KEY)) ||
        (rbac.canUpdate && rbac.canUpdate(MODULE_KEY_ALIAS));
      btnEdit.disabled = !can;
      btnEdit.hidden   = !can;
    }

    if (btnDel) {
      let can =
        (rbac.canDelete && rbac.canDelete(MODULE_KEY)) ||
        (rbac.canDelete && rbac.canDelete(MODULE_KEY_ALIAS));
      if (String(state.rbac.roleId).toLowerCase() === "admin-supervisor") can = false;
      btnDel.disabled = !can;
      btnDel.hidden   = !can;
    }
  });
}

// ==============================
// Tabs (Usuarios | Roles)
// ==============================

function switchTab(tab /* 'users'|'roles' */) {
  const { tabUsers, tabRoles, panelUsers, panelRoles } = els();
  state.ui.activeTab = tab;

  if (tab === "users") {
    tabUsers?.classList.add("is-active");
    tabUsers?.setAttribute("aria-selected", "true");
    tabUsers && (tabUsers.tabIndex = 0);

    tabRoles?.classList.remove("is-active");
    tabRoles?.setAttribute("aria-selected", "false");
    tabRoles && (tabRoles.tabIndex = -1);

    panelUsers?.classList.add("is-active");
    panelUsers?.removeAttribute("hidden");

    panelRoles?.classList.remove("is-active");
    panelRoles?.setAttribute("hidden", "true");
  } else {
    tabRoles?.classList.add("is-active");
    tabRoles?.setAttribute("aria-selected", "true");
    tabRoles && (tabRoles.tabIndex = 0);

    tabUsers?.classList.remove("is-active");
    tabUsers?.setAttribute("aria-selected", "false");
    tabUsers && (tabUsers.tabIndex = -1);

    panelRoles?.classList.add("is-active");
    panelRoles?.removeAttribute("hidden");

    panelUsers?.classList.remove("is-active");
    panelUsers?.setAttribute("hidden","true"); // opcional
  }
}

// ==============================
// Eventos y delegación
// ==============================

function bindUI() {
  const root = document.querySelector(".users");
  if (!root) return;

  const {
    tabUsers,
    tabRoles,
    search,
    pageSize,
    btnNew,
    pagePrev,
    pageNext,
    tbodyUsers,
    tbodyRoles,
  } = els();

  // Tabs
  tabUsers?.addEventListener("click", () => {
    switchTab("users");
    applyRBAC();
  });
  tabRoles?.addEventListener("click", () => {
    if (!state.rbac.isAdmin) return;
    switchTab("roles");
    applyRBAC();
  });

  // Búsqueda con debounce
  search?.addEventListener("input", debounce((e) => {
    state.filters.query = e.target.value || "";
    state.filters.page = 1;
    renderUsersTable();
  }, 250));

  // Page size
  pageSize?.addEventListener("change", (e) => {
    state.filters.pageSize = Number(e.target.value) || 10;
    state.filters.page = 1;
    renderUsersTable();
  });

  // Paginación
  pagePrev?.addEventListener("click", () => {
    state.filters.page = Math.max(1, state.filters.page - 1);
    renderUsersTable();
  });
  pageNext?.addEventListener("click", () => {
    state.filters.page = state.filters.page + 1; // clamp en render
    renderUsersTable();
  });

  // Botón Nuevo
  btnNew?.addEventListener("click", () => {
    if (!guardAction("write")) return;
    openUserFormModal(); // alta
  });

  // Delegación de acciones sobre filas de usuarios
  tbodyUsers?.addEventListener("click", (ev) => {
    const target = ev.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    const tr = target.closest("tr");
    if (!tr) return;
    const id = tr.dataset.id;
    const user = state.users.find((u) => u.id === id);
    if (!user) return;

    if (action === "view") {
      openUserViewModal(user);
    } else if (action === "edit") {
      if (!guardAction("update")) return;
      openUserFormModal(user);
    } else if (action === "delete") {
      if (!guardAction("delete")) return;
      openConfirmDeleteModal(user);
    }
  });

  // Delegación de acciones sobre filas de roles
  tbodyRoles?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    if (!state.rbac.isAdmin) return;

    const tr = btn.closest("tr");
    const roleId = tr?.dataset.roleId;
    if (!roleId) return;

    const role = state.roles.find((r) => r.id === roleId);
    if (!role) return;

    const action = btn.dataset.action;
    if (action === "role-edit") {
      openRoleEditModal(role);
    } else if (action === "role-perms") {
      openPermissionsMatrixModal(role);
    }
  });
}

// ==============================
// Modales: Users (view/edit/new) y Confirm Delete
// ==============================

function openUserViewModal(user) {
  const tpl = document.getElementById("tpl-user-view");
  if (!tpl) return;
  openModal(tpl.innerHTML, "#modal-close");
  const modal = document.getElementById("modal-body");
  if (!modal) return;
  modal.querySelector("#vw-firstName").textContent = user.firstName || "";
  modal.querySelector("#vw-lastName").textContent  = user.lastName || "";
  modal.querySelector("#vw-email").textContent     = user.email || "";
  modal.querySelector("#vw-phone").textContent     = user.phone || "";
  const roleName = state.roles.find((r) => r.id === user.roleId)?.name || "";
  modal.querySelector("#vw-roleName").textContent  = roleName;
  modal.querySelector("#vw-statusBadge").innerHTML =
    user.status === "active"
      ? `<span class="badge badge--success">Activo</span>`
      : `<span class="badge badge--muted">Inactivo</span>`;
  modal.querySelector("#vw-createdAt").textContent = formatDateDDMMYYYY(user.createdAt);
}

function openUserFormModal(user /* opcional: edición */) {
  const isEdit = !!user;
  const tpl = document.getElementById("tpl-user-form");
  if (!tpl) return;

  openModal(tpl.innerHTML, "#user-firstName");
  const modal = document.getElementById("modal-body");
  if (!modal) return;

  // Cargar select de roles
  const selRole = modal.querySelector("#user-roleId");
  selRole.innerHTML = state.roles
    .map((r) => `<option value="${escapeHTML(r.id)}">${escapeHTML(r.name)}</option>`)
    .join("");

  // Precargar si es edición
  if (isEdit) {
    modal.querySelector("#user-id").value        = user.id;
    modal.querySelector("#user-firstName").value = user.firstName || "";
    modal.querySelector("#user-lastName").value  = user.lastName || "";
    modal.querySelector("#user-email").value     = user.email || "";
    modal.querySelector("#user-phone").value     = user.phone || "";
    selRole.value                                = user.roleId || "";
    modal.querySelector("#user-status").value    = user.status || "active";
    modal.querySelector("#user-createdAt").value = formatDateDDMMYYYY(user.createdAt);
  } else {
    modal.querySelector("#user-createdAt").value = formatDateDDMMYYYY(new Date().toISOString());
  }

  // Submit
  const form = modal.querySelector("#user-form");
  const btnSubmit = modal.querySelector("#user-submit");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnSubmit.disabled) return;

    // Validaciones básicas
    const formData = new FormData(form);
    const payload = {
      id: formData.get("id") || generateId("u"),
      firstName: String(formData.get("firstName") || "").trim(),
      lastName:  String(formData.get("lastName")  || "").trim(),
      email:     String(formData.get("email")     || "").trim().toLowerCase(),
      phone:     String(formData.get("phone")     || "").trim(),
      roleId:    String(formData.get("roleId")    || "").trim(),
      status:    String(formData.get("status")    || "active"),
      createdAt: isEdit ? user.createdAt : new Date().toISOString(),
    };

    // Mostrar/ocultar errores accesibles
    const setErr = (id, show) => { const el = modal.querySelector(`#${id}`); if (el) el.hidden = !show; };
    setErr("err-firstName", !payload.firstName);
    setErr("err-lastName",  !payload.lastName);

    const emailValid = /\S+@\S+\.\S+/.test(payload.email);
    const emailTaken = state.users.some((u) => u.email === payload.email && u.id !== payload.id);
    setErr("err-email", !emailValid || emailTaken);

    const phoneValid = /^[0-9]{8,12}$/.test(payload.phone);
    setErr("err-phone", !phoneValid);

    setErr("err-roleId", !payload.roleId);

    const invalid =
      !payload.firstName || !payload.lastName || !emailValid || emailTaken || !phoneValid || !payload.roleId;

    if (invalid) { snackWarn("Revisá los campos del formulario.", "VALIDATION_ERROR"); return; }

    // Guardar (demo → LS; API → server)
    btnSubmit.disabled = true;
    try {
      if (DATA_SOURCE === "api") {
        if (isEdit) { await apiUsersUpdate(payload.id, payload); snackOk("Usuario actualizado"); }
        else        { await apiUsersCreate(payload);            snackOk("Usuario creado"); }
      } else {
        if (isEdit) {
          const idx = state.users.findIndex((u) => u.id === payload.id);
          if (idx !== -1) state.users[idx] = payload;
        } else {
          state.users.push(payload);
        }
        writeLS(LS_USERS_KEY, state.users);
        snackInfo("Demo JSON: cambios no persistidos");
      }
      renderUsersTable();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "Error al guardar el usuario."), err?.code);
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

function openConfirmDeleteModal(user) {
  // Protección: no permitir “eliminar” (soft) al único admin activo
  if (isOnlyActiveAdmin(user)) {
    snackWarn("No se puede inactivar al único Administrador activo.");
    return;
  }

  const tpl = document.getElementById("tpl-confirm-delete");
  if (!tpl) return;

  openModal(tpl.innerHTML, "#btn-confirm-delete");
  const modal = document.getElementById("modal-body");
  const btn = modal.querySelector("#btn-confirm-delete");
  btn.addEventListener("click", async () => {
    try {
      if (DATA_SOURCE === "api") {
        await apiUsersDelete(user.id);
        snackOk("Usuario inactivado");
      } else {
        const idx = state.users.findIndex((u) => u.id === user.id);
        if (idx !== -1) state.users[idx] = { ...state.users[idx], status: "inactive" };
        writeLS(LS_USERS_KEY, state.users);
        snackInfo("Demo JSON: cambios no persistidos");
      }
      renderUsersTable();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "No se pudo inactivar el usuario."), err?.code);
    }
  });
}

function isOnlyActiveAdmin(user) {
  // Por nombre de rol en JSON demo (compatibilidad)
  const adminRole = state.roles.find((r) => norm(r.name) === "administrador");
  if (!adminRole) return false;
  const isUserAdmin = user.roleId === adminRole.id;
  if (!isUserAdmin) return false;
  const activeAdmins = state.users.filter((u) => u.roleId === adminRole.id && u.status === "active");
  return activeAdmins.length <= 1;
}

// ==============================
// Modales: Roles (Editar) y Matriz de permisos
// ==============================

function openRoleEditModal(role) {
  const tpl = document.getElementById("tpl-role-edit");
  if (!tpl) return;

  openModal(tpl.innerHTML, "#role-name");
  const modal = document.getElementById("modal-body");

  modal.querySelector("#role-id").value          = role.id;
  modal.querySelector("#role-name").value        = role.name || "";
  modal.querySelector("#role-description").value = role.description || "";
  modal.querySelector("#role-status").value      = role.status || "active";

  const form = modal.querySelector("#role-form");
  const btnSubmit = modal.querySelector("#role-submit");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnSubmit.disabled) return;

    const fd = new FormData(form);
    const payload = {
      id:   fd.get("id"),
      name: String(fd.get("name") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      status: String(fd.get("status") || "active"),
    };

    const errName = modal.querySelector("#err-role-name");
    if (errName) errName.hidden = !!payload.name;
    if (!payload.name) { snackWarn("Ingresá un nombre de rol válido.", "VALIDATION_ERROR"); return; }

    btnSubmit.disabled = true;
    try {
      if (DATA_SOURCE === "api") {
        await apiRolesUpdate(payload.id, payload);
        snackOk("Rol actualizado");
      } else {
        const idx = state.roles.findIndex((r) => r.id === payload.id);
        if (idx !== -1) {
          state.roles[idx] = payload;
          writeLS(LS_ROLES_KEY, state.roles);
        }
        snackInfo("Demo JSON: cambios no persistidos");
      }
      renderRolesView();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "Error al guardar el rol."), err?.code);
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

/** Normaliza rbac_permissions.json a { [roleId]: { [moduleKey]: {r,w,u,d} } } */
function buildRolePermsMap(seed) {
  const out = {};
  if (!seed || !seed.role_permissions) return out;
  const rp = seed.role_permissions;

  if (Array.isArray(rp)) {
    for (const item of rp) {
      if (!item || !item.role_id || !item.module_key) continue;
      out[item.role_id] = out[item.role_id] || {};
      out[item.role_id][item.module_key] = {
        r: !!item.r, w: !!item.w, u: !!item.u, d: !!item.d,
      };
    }
  } else if (typeof rp === "object") {
    for (const [roleId, modules] of Object.entries(rp)) {
      out[roleId] = out[roleId] || {};
      if (modules && typeof modules === "object") {
        for (const [mod, perm] of Object.entries(modules)) {
          out[roleId][mod] = {
            r: !!perm.r, w: !!perm.w, u: !!perm.u, d: !!perm.d,
          };
        }
      }
    }
  }
  return out;
}

async function openPermissionsMatrixModal(role) {
  const tpl = document.getElementById("tpl-permissions-matrix");
  if (!tpl) return;

  let baseForRole = {};         // mapa base por módulo
  let overrideForRole = {};     // mapa override local (sólo demo)

  try {
    if (DATA_SOURCE === "api") {
      // Leer permisos efectivos del server
      const res = await apiPermsGet(role.id);
      baseForRole = res?.data || {};
    } else {
      // Demo: seed + overrides en LS
      const [seed, overrides] = await Promise.all([
        fetchJSON(RBAC_SEED_URL).catch(() => null),
        Promise.resolve(readLS(LS_PERM_OVERRIDE_KEY, {})),
      ]);
      const baseMapByRole = buildRolePermsMap(seed);
      baseForRole = baseMapByRole[role.id] || {};
      overrideForRole = overrides[role.id] || {};
    }
  } catch (err) {
    snackErr(mapErrorToMessage(err, "No se pudieron cargar permisos."), err?.code);
    return;
  }

  // Mapa final de la matriz (solo módulos definidos)
  const matrix = {};
  MATRIX_MODULES.forEach((mod) => {
    const base = baseForRole[mod] || {};
    const ov   = overrideForRole[mod] || {};
    matrix[mod] = {
      r: ov.r ?? !!base.r,
      w: ov.w ?? !!base.w,
      u: ov.u ?? !!base.u,
      d: ov.d ?? !!base.d,
    };
  });

  openModal(tpl.innerHTML, "#perm-submit");
  const modal = document.getElementById("modal-body");
  modal.querySelector("#perm-role-name").textContent = role.name;

  // Render filas
  const tbody = modal.querySelector("#perm-tbody");
  tbody.innerHTML = MATRIX_MODULES.map((mod) => {
    const m = matrix[mod];
    return `
      <tr data-module="${escapeHTML(mod)}">
        <td>${escapeHTML(mod)}</td>
        <td><input type="checkbox" data-perm="r" ${m.r ? "checked" : ""} /></td>
        <td><input type="checkbox" data-perm="w" ${m.w ? "checked" : ""} /></td>
        <td><input type="checkbox" data-perm="u" ${m.u ? "checked" : ""} /></td>
        <td><input type="checkbox" data-perm="d" ${m.d ? "checked" : ""} /></td>
      </tr>
    `;
  }).join("");

  // Guardar cambios
  const btnSave = modal.querySelector("#perm-submit");
  btnSave.addEventListener("click", async () => {
    // Recolectar checkboxes -> permMap
    const permMap = {};
    $$("#perm-tbody tr").forEach((tr) => {
      const mod = tr.dataset.module;
      permMap[mod] = {
        r: tr.querySelector('[data-perm="r"]').checked,
        w: tr.querySelector('[data-perm="w"]').checked,
        u: tr.querySelector('[data-perm="u"]').checked,
        d: tr.querySelector('[data-perm="d"]').checked,
      };
    });

    try {
      if (DATA_SOURCE === "api") {
        await apiPermsPut(role.id, permMap);
        snackOk("Permisos guardados");
      } else {
        // Demo: persistimos overrides por rol en LS
        const current = readLS(LS_PERM_OVERRIDE_KEY, {});
        current[role.id] = permMap;
        writeLS(LS_PERM_OVERRIDE_KEY, current);
        snackOk("Permisos actualizados (demo local)");
      }

      // Si edité mi propio rol → refrescar permMap efectivo en sesión (si lo usa tu app)
      if (state.rbac.roleId && state.rbac.roleId === role.id) {
        try { sessionStorage.setItem("rbac.permMap", JSON.stringify(permMap)); } catch {}
        state.rbac.isAdmin = computeIsAdmin({ roleId: state.rbac.roleId });
        applyRBAC();
        renderUsersTable();
      }

      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "No se pudieron guardar los permisos."), err?.code);
    }
  });
}

// ==============================
// Inicializador público
// ==============================

/**
 * Punto de entrada del módulo.
 * - Garantiza que el contenedor exista (reintentos).
 * - Carga RBAC y datos mock.
 * - Aplica RBAC y enlaza eventos con delegación.
 */
export async function initUsers(attempt = 0) {
  // 1) Validar contenedor de la vista
  const container = document.querySelector(".users");
  if (!container) {
    if (attempt < 10) return setTimeout(() => initUsers(attempt + 1), 50);
    console.warn("[users] Container not found.");
    return;
    }
  // 2) Asegurar RBAC cargado
  if (rbac.ensureRbacLoaded) {
    await rbac.ensureRbacLoaded();
  }

  // 3) Estado inicial de filtros desde UI
  const { pageSize } = els();
  if (pageSize) state.filters.pageSize = Number(pageSize.value) || 10;

  // 4) Cargar datos demo (JSON + LS)
  await fetchData();

  // 5) Vincular eventos de UI
  bindUI();

  // 6) Aplicar RBAC y render final
  applyRBAC();
  renderUsersTable();
}
