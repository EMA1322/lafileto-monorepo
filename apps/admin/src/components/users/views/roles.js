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
      return `
        <tr data-role-id="${escapeHTML(roleId)}">
          <td>${escapeHTML(name)}</td>
          <td>-</td>
          <td><span class="badge badge--success">Activo</span></td>
          <td class="users__row-actions">
            <button class="btn btn-secondary" type="button" data-action="role-perms" title="Permisos del rol">Permisos</button>
          </td>
        </tr>
      `;
    })
    .join("");
}
