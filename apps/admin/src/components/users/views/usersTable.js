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

export function renderUsersCount() {
  const { countUsers } = els();
  if (!countUsers) return;

  const total = state.users.meta.total || 0;
  const page = state.users.meta.page || 1;
  const pageSize = state.users.meta.pageSize || state.filters.pageSize || 10;
  const itemsOnPage = state.users.items.length;

  if (total === 0 || itemsOnPage === 0) {
    countUsers.textContent = "Mostrando 0 de 0 usuarios";
    return;
  }

  const from = (page - 1) * pageSize + 1;
  const to = from + itemsOnPage - 1;
  countUsers.textContent = `Mostrando ${from}-${Math.min(to, total)} de ${total} usuarios`;
}

export function renderUsersTable() {
  const { tbodyUsers, pagePrev, pageNext, pageInfo } = els();
  if (!tbodyUsers) return;

  if (state.ui.loadingUsers) {
    renderUsersStatus("Cargando usuarios…");
    tbodyUsers.innerHTML = "";
    if (pagePrev) pagePrev.disabled = true;
    if (pageNext) pageNext.disabled = true;
    if (pageInfo) pageInfo.textContent = "";
    return;
  }

  if (state.ui.errorUsers) {
    renderUsersStatus(state.ui.errorUsers, "error");
    tbodyUsers.innerHTML = "";
    if (pagePrev) pagePrev.disabled = true;
    if (pageNext) pageNext.disabled = true;
    if (pageInfo) pageInfo.textContent = "";
    return;
  }

  if (!state.users.items.length) {
    renderUsersStatus("No hay usuarios que coincidan con los filtros.");
    tbodyUsers.innerHTML = "";
    if (pagePrev) pagePrev.disabled = true;
    if (pageNext) pageNext.disabled = true;
    if (pageInfo) pageInfo.textContent = "0 / 0";
    renderUsersCount();
    return;
  }

  renderUsersStatus("");

  tbodyUsers.innerHTML = state.users.items
    .map((user) => {
      const phone = user.phone ? escapeHTML(user.phone) : "-";
      const roleId = escapeHTML(user.roleId || "");
      return `
        <tr data-id="${escapeHTML(String(user.id))}">
          <td>${escapeHTML(user.fullName || "")}</td>
          <td>${escapeHTML(user.email || "")}</td>
          <td>${phone}</td>
          <td>${roleId}</td>
          <td>${formatStatus(user.status)}</td>
        </tr>
      `;
    })
    .join("");

  const total = state.users.meta.total || 0;
  const page = state.users.meta.page || 1;
  const pageSize = state.users.meta.pageSize || state.filters.pageSize || 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (pagePrev) pagePrev.disabled = page <= 1;
  if (pageNext) pageNext.disabled = page >= totalPages;
  if (pageInfo) pageInfo.textContent = `${Math.min(page, totalPages)} / ${totalPages}`;

  renderUsersCount();
  applyRBAC();
}
