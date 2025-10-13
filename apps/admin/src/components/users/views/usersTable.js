import { state } from "../state.js";
import { escapeHTML, norm, clamp } from "../helpers.js";

import { renderUsersStatus } from "./status.js";
import { els } from "./dom.js";
import { applyRBAC } from "./viewRBAC.js";

export function filterUsers(list, query) {
  if (!query) return list.slice();
  const q = norm(query);
  return list.filter((u) => {
    const roleName = state.roles.find((r) => r.id === u.roleId)?.name || "";
    return (
      norm(u.firstName).includes(q) ||
      norm(u.lastName).includes(q) ||
      norm(u.email).includes(q) ||
      norm(roleName).includes(q)
    );
  });
}

export function renderUsersCount() {
  const { countUsers } = els();
  if (!countUsers) return;
  const filtered = filterUsers(state.users, state.filters.query);
  const from = (state.filters.page - 1) * state.filters.pageSize + 1;
  const to = Math.min(state.filters.page * state.filters.pageSize, filtered.length);
  const showing = filtered.length === 0 ? 0 : `${from}–${to}`;
  countUsers.textContent = `Mostrando ${showing} de ${filtered.length} usuarios`;
}

export function renderUsersTable() {
  const { tbodyUsers, pagePrev, pageNext, pageInfo } = els();
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

  const filtered = filterUsers(state.users, state.filters.query);
  const total = filtered.length;

  if (total === 0) {
    renderUsersStatus("No hay usuarios que coincidan con la búsqueda.");
    tbodyUsers.innerHTML = "";
    renderUsersCount();
    if (pagePrev && pageNext && pageInfo) {
      pagePrev.disabled = true;
      pageNext.disabled = true;
      pageInfo.textContent = "0 / 0";
    }
    return;
  }

  renderUsersStatus("");
  const pages = Math.max(1, Math.ceil(total / state.filters.pageSize));
  state.filters.page = clamp(state.filters.page, 1, pages);

  const start = (state.filters.page - 1) * state.filters.pageSize;
  const end = Math.min(start + state.filters.pageSize, total);
  const slice = filtered.slice(start, end);

  tbodyUsers.innerHTML = slice
    .map((u) => {
      const roleName = escapeHTML(state.roles.find((r) => r.id === u.roleId)?.name || "");
      const badge =
        u.status === "active"
          ? `<span class="badge badge--success">Activo</span>`
          : `<span class="badge badge--muted">Inactivo</span>`;

      return `
      <tr data-id="${escapeHTML(u.id)}">
        <td>${escapeHTML(u.firstName)}</td>
        <td>${escapeHTML(u.lastName)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${escapeHTML(u.phone || "")}</td>
        <td>${roleName}</td>
        <td>${badge}</td>
        <td class="users__row-actions">
          <button class="btn btn-secondary" type="button" data-action="view" title="Ver usuario">Ver</button>
          <button class="btn btn-secondary" type="button" data-action="edit" title="Editar usuario">Editar</button>
          <button class="btn btn-secondary" type="button" data-action="delete" title="Eliminar usuario">Eliminar</button>
        </td>
      </tr>
    `;
    })
    .join("");

  if (pagePrev && pageNext && pageInfo) {
    pagePrev.disabled = state.filters.page <= 1;
    pageNext.disabled = state.filters.page >= pages;
    pageInfo.textContent = `${state.filters.page} / ${pages}`;
  }

  renderUsersCount();
  applyRBAC();
}
