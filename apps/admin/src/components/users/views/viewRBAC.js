import { state } from "../state.js";
import * as rbacClient from "@/utils/rbac.js";
import { MODULE_KEY, MODULE_KEY_ALIAS } from "../rbac.js";
import { els } from "./dom.js";
import { switchTab } from "./tabs.js";

function canWriteUsers() {
  const fn = typeof rbacClient.canWrite === "function" ? rbacClient.canWrite : null;
  if (!fn) return false;
  return fn(MODULE_KEY) || fn(MODULE_KEY_ALIAS);
}

function canUpdateUsers() {
  const fn = typeof rbacClient.canUpdate === "function" ? rbacClient.canUpdate : null;
  if (!fn) return false;
  return fn(MODULE_KEY) || fn(MODULE_KEY_ALIAS);
}

function canDeleteUsers() {
  const fn = typeof rbacClient.canDelete === "function" ? rbacClient.canDelete : null;
  if (!fn) return false;
  return fn(MODULE_KEY) || fn(MODULE_KEY_ALIAS);
}

export function applyRBAC() {
  const { tabRoles, btnNew, btnRoleNew, panelRoles, panelUsers, tbodyUsers } = els();

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

  if (btnNew) {
    const canWrite = canWriteUsers();
    btnNew.disabled = !canWrite;
    if (canWrite) btnNew.removeAttribute("hidden");
    else btnNew.setAttribute("hidden", "true");
  }

  if (btnRoleNew) {
    const visible = state.rbac.isAdmin;
    btnRoleNew.disabled = !visible;
    if (visible) btnRoleNew.removeAttribute("hidden");
    else btnRoleNew.setAttribute("hidden", "true");
  }

  if (tbodyUsers) {
    const allowUpdate = canUpdateUsers();
    const allowDelete = canDeleteUsers();
    const currentUserId = state.session?.userId != null ? String(state.session.userId) : "";

    tbodyUsers.querySelectorAll("[data-action='user-edit']").forEach((btn) => {
      btn.disabled = !allowUpdate;
      btn.toggleAttribute("hidden", !allowUpdate);
    });

    tbodyUsers.querySelectorAll("[data-action='user-toggle-status']").forEach((btn) => {
      btn.disabled = !allowUpdate;
      if (!allowUpdate) btn.setAttribute("aria-disabled", "true");
      else btn.removeAttribute("aria-disabled");
    });

    tbodyUsers.querySelectorAll("tr[data-id]").forEach((tr) => {
      const deleteBtn = tr.querySelector("[data-action='user-delete']");
      if (!deleteBtn) return;
      const isSelf = currentUserId && currentUserId === String(tr.dataset.id || "");
      const disabled = !allowDelete || isSelf;
      deleteBtn.disabled = disabled;
      if (disabled) {
        deleteBtn.setAttribute(
          "title",
          !allowDelete
            ? "No tenés permisos para eliminar usuarios."
            : "No podés eliminar tu propio usuario."
        );
      } else {
        deleteBtn.removeAttribute("title");
      }
    });
  }
}
