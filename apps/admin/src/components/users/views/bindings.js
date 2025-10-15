import { state, snackWarn, reloadUsers } from "../state.js";
import { guardAction } from "../rbac.js";

import { openPermissionsMatrixModal } from "./modals.js";
import { renderUsersTable, renderUsersCount } from "./usersTable.js";
import { renderUsersStatus, renderRolesStatus } from "./status.js";
import { applyRBAC } from "./viewRBAC.js";
import { els } from "./dom.js";
import { switchTab } from "./tabs.js";

function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function totalPages() {
  const total = state.users.meta.total || 0;
  const pageSize = state.users.meta.pageSize || state.filters.pageSize || 10;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function bindUI() {
  const root = document.querySelector(".users");
  if (!root) return;

  const {
    tabUsers,
    tabRoles,
    search,
    pageSize,
    pagePrev,
    pageNext,
    tbodyRoles
  } = els();

  tabUsers?.addEventListener("click", () => {
    switchTab("users");
    applyRBAC();
  });

  tabRoles?.addEventListener("click", () => {
    if (!state.rbac.isAdmin) return;
    switchTab("roles");
    applyRBAC();
  });

  const requestUsers = () => reloadUsers({
    onUsersStatus: renderUsersStatus,
    onUsersTable: renderUsersTable,
    onUsersCount: renderUsersCount
  }).catch((err) => {
    console.error("[users] reload error", err);
  });

  search?.addEventListener(
    "input",
    debounce((e) => {
      state.filters.query = e.target.value || "";
      state.filters.page = 1;
      requestUsers();
    })
  );

  pageSize?.addEventListener("change", (e) => {
    const value = Number(e.target.value) || 10;
    state.filters.pageSize = value;
    state.filters.page = 1;
    requestUsers();
  });

  pagePrev?.addEventListener("click", () => {
    if (state.ui.loadingUsers) return;
    const nextPage = Math.max(1, state.filters.page - 1);
    if (nextPage === state.filters.page) return;
    state.filters.page = nextPage;
    requestUsers();
  });

  pageNext?.addEventListener("click", () => {
    if (state.ui.loadingUsers) return;
    const limit = totalPages();
    const nextPage = Math.min(limit, state.filters.page + 1);
    if (nextPage === state.filters.page) return;
    state.filters.page = nextPage;
    requestUsers();
  });

  tbodyRoles?.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    if (!state.rbac.isAdmin) return;

    const tr = btn.closest("tr");
    const roleId = tr?.dataset.roleId;
    if (!roleId) return;

    const role = state.roles.find((r) => r.roleId === roleId || r.id === roleId);
    if (!role) return;

    const action = btn.dataset.action;
    if (action === "role-perms") {
      const canUpdate = guardAction("update", { roleId: state.rbac.roleId, snackWarn });
      if (!canUpdate) return;
      try {
        await openPermissionsMatrixModal(role);
      } catch (err) {
        console.error("[users] openPermissionsMatrixModal failed", err);
        renderRolesStatus("No se pudo abrir la matriz de permisos.", "error");
      }
    }
  });
}
