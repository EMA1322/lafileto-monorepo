import * as rbacClient from "@/utils/rbac.js";

import { MODULE_KEY, MODULE_KEY_ALIAS } from "../rbac.js";
import { state } from "../state.js";
import { els, $$ } from "./dom.js";
import { switchTab } from "./tabs.js";

export function applyRBAC() {
  const { tabRoles, btnNew, panelRoles, panelUsers } = els();

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
    const can =
      (rbacClient.canWrite && rbacClient.canWrite(MODULE_KEY)) ||
      (rbacClient.canWrite && rbacClient.canWrite(MODULE_KEY_ALIAS));
    btnNew.disabled = !can;
    btnNew.hidden = !can;
  }

  $$("#users-tbody tr").forEach((row) => {
    const btnView = row.querySelector('[data-action="view"]');
    const btnEdit = row.querySelector('[data-action="edit"]');
    const btnDel = row.querySelector('[data-action="delete"]');

    if (btnView) btnView.disabled = false;

    if (btnEdit) {
      const can =
        (rbacClient.canUpdate && rbacClient.canUpdate(MODULE_KEY)) ||
        (rbacClient.canUpdate && rbacClient.canUpdate(MODULE_KEY_ALIAS));
      btnEdit.disabled = !can;
      btnEdit.hidden = !can;
    }

    if (btnDel) {
      let can =
        (rbacClient.canDelete && rbacClient.canDelete(MODULE_KEY)) ||
        (rbacClient.canDelete && rbacClient.canDelete(MODULE_KEY_ALIAS));
      if (String(state.rbac.roleId).toLowerCase() === "admin-supervisor") can = false;
      btnDel.disabled = !can;
      btnDel.hidden = !can;
    }
  });
}
