import * as rbacClient from "../../utils/rbac.js";
import mountIcons from "../../utils/icons.js";

import { fetchData } from "./state.js";
import { renderUsersStatus, renderRolesStatus } from "./views/status.js";
import { renderUsersTable } from "./views/usersTable.js";
import { renderRolesView } from "./views/roles.js";
import { applyRBAC } from "./views/viewRBAC.js";
import { bindUI } from "./views/bindings.js";

export async function initUsers(attempt = 0) {
  const container = document.querySelector(".users");
  if (!container) {
    if (attempt < 10) return setTimeout(() => initUsers(attempt + 1), 50);
    console.warn("[users] Container not found.");
    return;
  }

  mountIcons(container);

  if (typeof rbacClient.ensureRbacLoaded === "function") {
    await rbacClient.ensureRbacLoaded();
  }

  await fetchData({
    onUsersStatus: renderUsersStatus,
    onRolesStatus: renderRolesStatus,
    onUsersTable: renderUsersTable,
    onRolesView: (...args) => {
      renderRolesView(...args);
      applyRBAC();
    },
  });

  bindUI();
  applyRBAC();
}
