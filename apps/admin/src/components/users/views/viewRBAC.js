import { state } from "../state.js";
import { els } from "./dom.js";
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
    btnNew.disabled = true;
    btnNew.hidden = true;
  }
}
