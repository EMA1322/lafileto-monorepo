import { state, snackWarn } from "../state.js";
import { guardAction } from "../rbac.js";

import {
  openUserViewModal,
  openUserFormModal,
  openConfirmDeleteModal,
  openRoleEditModal,
  openPermissionsMatrixModal,
} from "./modals.js";
import { renderUsersTable } from "./usersTable.js";
import { applyRBAC } from "./viewRBAC.js";
import { els } from "./dom.js";
import { switchTab } from "./tabs.js";

function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function bindUI() {
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

  tabUsers?.addEventListener("click", () => {
    switchTab("users");
    applyRBAC();
  });
  tabRoles?.addEventListener("click", () => {
    if (!state.rbac.isAdmin) return;
    switchTab("roles");
    applyRBAC();
  });

  search?.addEventListener(
    "input",
    debounce((e) => {
      state.filters.query = e.target.value || "";
      state.filters.page = 1;
      renderUsersTable();
    }, 250)
  );

  pageSize?.addEventListener("change", (e) => {
    state.filters.pageSize = Number(e.target.value) || 10;
    state.filters.page = 1;
    renderUsersTable();
  });

  pagePrev?.addEventListener("click", () => {
    state.filters.page = Math.max(1, state.filters.page - 1);
    renderUsersTable();
  });
  pageNext?.addEventListener("click", () => {
    state.filters.page = state.filters.page + 1;
    renderUsersTable();
  });

  btnNew?.addEventListener("click", () => {
    if (!guardAction("write", { roleId: state.rbac.roleId, snackWarn })) return;
    openUserFormModal();
  });

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
      if (!guardAction("update", { roleId: state.rbac.roleId, snackWarn })) return;
      openUserFormModal(user);
    } else if (action === "delete") {
      if (!guardAction("delete", { roleId: state.rbac.roleId, snackWarn })) return;
      openConfirmDeleteModal(user);
    }
  });

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
