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

export function applyRBAC() {
  const { tabRoles, btnNew, btnRoleNew, panelRoles, panelUsers } = els();

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
}
