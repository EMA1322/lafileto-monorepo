import { state } from "../state.js";
import { escapeHTML } from "../helpers.js";

import { renderRolesStatus } from "./status.js";
import { els } from "./dom.js";

export function renderRolesView() {
  const { tbodyRoles } = els();
  if (!tbodyRoles) return;

  if (state.ui.loadingRoles) {
    renderRolesStatus("Cargando roles…");
    tbodyRoles.innerHTML = "";
    return;
  }
  if (state.ui.errorRoles) {
    renderRolesStatus(state.ui.errorRoles, "error");
    tbodyRoles.innerHTML = "";
    return;
  }
  if (!state.roles.length) {
    renderRolesStatus("No hay roles registrados.");
    tbodyRoles.innerHTML = "";
    return;
  }

  renderRolesStatus("");
  tbodyRoles.innerHTML = state.roles
    .map((role) => {
      const roleId = role.roleId || role.id || "";
      const name = role.name || roleId;
      const isProtected = roleId === "role-admin";
      return `
        <tr data-role-id="${escapeHTML(roleId)}">
          <td>${escapeHTML(roleId)}</td>
          <td>${escapeHTML(name)}</td>
          <td class="users__row-actions">
            <button class="btn btn-secondary" type="button" data-action="role-edit">Editar</button>
            <button class="btn btn-secondary" type="button" data-action="role-perms" title="Permisos del rol">Permisos</button>
            <button class="btn btn-tertiary" type="button" data-action="role-delete" ${isProtected ? "disabled" : ""}>Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join("");
}
