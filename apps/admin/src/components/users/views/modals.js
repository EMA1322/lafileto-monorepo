import { openModal, closeModal } from "@/utils/modals.js";

import { state, fetchRolePermissions, saveRolePermissions, snackOk, snackErr } from "../state.js";
import { escapeHTML, mapErrorToMessage } from "../helpers.js";
import { applyRBAC } from "./viewRBAC.js";
import { renderUsersTable } from "./usersTable.js";

export async function openPermissionsMatrixModal(role) {
  const tpl = document.getElementById("tpl-permissions-matrix");
  if (!tpl) return;

  const roleId = role.roleId || role.id;
  let permissions = [];
  try {
    permissions = await fetchRolePermissions(roleId);
  } catch (err) {
    snackErr(mapErrorToMessage(err, "No se pudieron cargar los permisos."), err?.code);
    throw err;
  }

  const modules = state.modules.length
    ? state.modules
    : [{ key: "users", name: "Usuarios" }];

  const permissionsByModule = new Map();
  permissions.forEach((p) => permissionsByModule.set(p.moduleKey, p));

  openModal(tpl.innerHTML, "#perm-submit");
  const modal = document.getElementById("modal-body");
  if (!modal) return;

  modal.querySelector("#perm-role-name").textContent = role.name || roleId;

  const tbody = modal.querySelector("#perm-tbody");
  tbody.innerHTML = modules
    .map((mod) => {
      const mk = mod.key || mod.moduleKey;
      const current = permissionsByModule.get(mk) || {};
      return `
        <tr data-module="${escapeHTML(mk)}">
          <td>${escapeHTML(mod.name || mk)}</td>
          <td><input type="checkbox" data-perm="r" ${current.r ? "checked" : ""} /></td>
          <td><input type="checkbox" data-perm="w" ${current.w ? "checked" : ""} /></td>
          <td><input type="checkbox" data-perm="u" ${current.u ? "checked" : ""} /></td>
          <td><input type="checkbox" data-perm="d" ${current.d ? "checked" : ""} /></td>
        </tr>
      `;
    })
    .join("");

  const btnSave = modal.querySelector("#perm-submit");
  btnSave?.addEventListener("click", async () => {
    const payload = [];
    modal.querySelectorAll("#perm-tbody tr").forEach((tr) => {
      const mk = tr.dataset.module;
      if (!mk) return;
      payload.push({
        moduleKey: mk,
        r: tr.querySelector('[data-perm="r"]').checked,
        w: tr.querySelector('[data-perm="w"]').checked,
        u: tr.querySelector('[data-perm="u"]').checked,
        d: tr.querySelector('[data-perm="d"]').checked
      });
    });

    btnSave.disabled = true;
    try {
      await saveRolePermissions(roleId, payload);
      snackOk("Permisos guardados");

      if (state.rbac.roleId && state.rbac.roleId === roleId) {
        try {
          const map = {};
          for (const entry of payload) {
            map[entry.moduleKey] = {
              r: !!entry.r,
              w: !!entry.w,
              u: !!entry.u,
              d: !!entry.d
            };
          }
          sessionStorage.setItem("rbac.permMap", JSON.stringify(map));
        } catch {}
        applyRBAC();
        renderUsersTable();
      }

      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "No se pudieron guardar los permisos."), err?.code);
    } finally {
      btnSave.disabled = false;
    }
  });
}
