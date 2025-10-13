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
  if (state.roles.length === 0) {
    renderRolesStatus("No hay roles registrados.");
    tbodyRoles.innerHTML = "";
    return;
  }

  renderRolesStatus("");
  tbodyRoles.innerHTML = state.roles
    .map((r) => {
      const badge =
        r.status === "active"
          ? `<span class="badge badge--success">Activo</span>`
          : `<span class="badge badge--muted">Inactivo</span>`;
      return `
      <tr data-role-id="${escapeHTML(r.id)}">
        <td>${escapeHTML(r.name)}</td>
        <td>${escapeHTML(r.description || "")}</td>
        <td>${badge}</td>
        <td class="users__row-actions">
          <button class="btn btn-secondary" type="button" data-action="role-edit" title="Editar rol">Editar</button>
          <button class="btn btn-secondary" type="button" data-action="role-perms" title="Permisos del rol">Permisos</button>
        </td>
      </tr>
    `;
    })
    .join("");
}
