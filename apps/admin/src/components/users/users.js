import * as rbacClient from "@/utils/rbac.js";

import { fetchData, state } from "./state.js";
import { renderUsersStatus, renderRolesStatus } from "./views/status.js";
import { renderUsersTable, renderUsersCount } from "./views/usersTable.js";
import { renderRolesView } from "./views/roles.js";
import { applyRBAC } from "./views/viewRBAC.js";
import { bindUI } from "./views/bindings.js";
import { els } from "./views/dom.js";

export async function initUsers(attempt = 0) {
  const container = document.querySelector(".users");
  if (!container) {
    if (attempt < 10) return setTimeout(() => initUsers(attempt + 1), 50);
    console.warn("[users] Container not found.");
    return;
  }

  if (rbacClient.ensureRbacLoaded) {
    await rbacClient.ensureRbacLoaded();
  }

  const { pageSize } = els();
  if (pageSize) state.filters.pageSize = Number(pageSize.value) || 10;

  await fetchData({
    onUsersStatus: renderUsersStatus,
    onRolesStatus: renderRolesStatus,
    onUsersTable: renderUsersTable,
    onRolesView: renderRolesView,
    onUsersCount: renderUsersCount,
  });

  bindUI();
  applyRBAC();
  renderUsersTable();
}
