import { state } from "../state.js";
import { escapeHTML } from "../helpers.js";

import { renderUsersStatus } from "./status.js";
import { els } from "./dom.js";
import { applyRBAC } from "./viewRBAC.js";

function formatStatus(status) {
  if (String(status).toUpperCase() === "ACTIVE") {
    return `<span class="badge badge--success">Activo</span>`;
  }
  if (String(status).toUpperCase() === "INACTIVE") {
    return `<span class="badge badge--muted">Inactivo</span>`;
  }
  return `<span class="badge badge--muted">${escapeHTML(String(status || "Desconocido"))}</span>`;
}

function statusSwitchMarkup(user) {
  const isActive = String(user.status).toUpperCase() === "ACTIVE";
  const label = isActive ? "Activo" : "Inactivo";
  const stateClass = isActive ? "is-active" : "is-inactive";
  return `
    <button
      class="users__status-toggle ${stateClass}"
      type="button"
      data-action="user-toggle-status"
      data-next-status="${isActive ? "INACTIVE" : "ACTIVE"}"
      aria-pressed="${isActive}"
      aria-label="Cambiar estado a ${isActive ? "Inactivo" : "Activo"}"
    >${label}</button>
  `;
}

export function renderUsersTable() {
  const { tbodyUsers } = els();
  if (!tbodyUsers) return;

  if (state.ui.loadingUsers) {
    renderUsersStatus("Cargando usuarios…");
    tbodyUsers.innerHTML = "";
    return;
  }

  if (state.ui.errorUsers) {
    renderUsersStatus(state.ui.errorUsers, "error");
    tbodyUsers.innerHTML = "";
    return;
  }

  if (!state.users.items.length) {
    renderUsersStatus("No hay usuarios cargados.");
    tbodyUsers.innerHTML = "";
    applyRBAC();
    return;
  }

  renderUsersStatus("");

  tbodyUsers.innerHTML = state.users.items
    .map((user) => {
      const phone = user.phone && user.phone !== "0000000000" ? escapeHTML(user.phone) : "-";
      const roleId = escapeHTML(user.roleId || "");
      const actions = `
        <div class="users__row-actions" role="group" aria-label="Acciones">
          <button class="btn btn-secondary" type="button" data-action="user-edit">Editar</button>
          ${statusSwitchMarkup(user)}
          <button class="btn btn-danger" type="button" data-action="user-delete">Eliminar</button>
        </div>
      `;
      return `
        <tr data-id="${escapeHTML(String(user.id))}" data-role-id="${roleId}">
          <td>${escapeHTML(user.fullName || "")}</td>
          <td>${escapeHTML(user.email || "")}</td>
          <td>${phone}</td>
          <td>${roleId}</td>
          <td>${formatStatus(user.status)}</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join("");

  applyRBAC();
}
