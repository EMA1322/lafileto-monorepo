import { els } from "./dom.js";

export function renderUsersStatus(message, type = "info") {
  const { statusUsers } = els();
  if (!statusUsers) return;
  statusUsers.textContent = message || "";
  statusUsers.dataset.type = type;
}

export function renderRolesStatus(message, type = "info") {
  const { statusRoles } = els();
  if (!statusRoles) return;
  statusRoles.textContent = message || "";
  statusRoles.dataset.type = type;
}
