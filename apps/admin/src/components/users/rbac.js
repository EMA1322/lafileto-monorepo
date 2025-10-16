import * as rbacClient from "@/utils/rbac.js";

export const MODULE_KEY = "users";
export const MODULE_KEY_ALIAS = "user";
export const ADMIN_ROLE_IDS = ["role-admin"];

export function computeIsAdmin({ roleId } = {}) {
  const rid = roleId ? String(roleId).toLowerCase() : "";
  if (ADMIN_ROLE_IDS.includes(rid)) return true;

  try {
    const raw = sessionStorage.getItem("effectivePermissions");
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Object.values(map || {}).every((p) => p && p.r && p.w && p.u && p.d);
  } catch {
    return false;
  }
}

export function guardAction(
  action,
  {
    roleId,
    snackWarn,
    client = rbacClient,
  } = {}
) {
  const warn = snackWarn || (() => {});
  let ok = true;

  if (action === "write") {
    ok = (client.canWrite && client.canWrite(MODULE_KEY)) ||
      (client.canWrite && client.canWrite(MODULE_KEY_ALIAS));
  } else if (action === "update") {
    ok = (client.canUpdate && client.canUpdate(MODULE_KEY)) ||
      (client.canUpdate && client.canUpdate(MODULE_KEY_ALIAS));
  } else if (action === "delete") {
    ok = (client.canDelete && client.canDelete(MODULE_KEY)) ||
      (client.canDelete && client.canDelete(MODULE_KEY_ALIAS));
    if (String(roleId).toLowerCase() === "role-supervisor") ok = false;
  }

  if (!ok) warn("No tenés permisos para esta acción.", "PERMISSION_DENIED");
  return ok;
}
