import { openModal, closeModal } from "@/utils/modals.js";

import {
  state,
  DATA_SOURCE,
  LS_USERS_KEY,
  LS_ROLES_KEY,
  LS_PERM_OVERRIDE_KEY,
  RBAC_SEED_URL,
  readLS,
  writeLS,
  snackInfo,
  snackOk,
  snackWarn,
  snackErr,
  apiUsersCreate,
  apiUsersUpdate,
  apiUsersDelete,
  apiRolesUpdate,
  apiPermsGet,
  apiPermsPut,
  fetchJSON,
} from "../state.js";
import { MATRIX_MODULES, computeIsAdmin } from "../rbac.js";
import {
  buildRolePermsMap,
  escapeHTML,
  formatDateDDMMYYYY,
  generateId,
  mapErrorToMessage,
  norm,
} from "../helpers.js";
import { applyRBAC } from "./viewRBAC.js";
import { renderUsersTable } from "./usersTable.js";
import { renderRolesView } from "./roles.js";

export function openUserViewModal(user) {
  const tpl = document.getElementById("tpl-user-view");
  if (!tpl) return;
  openModal(tpl.innerHTML, "#modal-close");
  const modal = document.getElementById("modal-body");
  if (!modal) return;
  modal.querySelector("#vw-firstName").textContent = user.firstName || "";
  modal.querySelector("#vw-lastName").textContent = user.lastName || "";
  modal.querySelector("#vw-email").textContent = user.email || "";
  modal.querySelector("#vw-phone").textContent = user.phone || "";
  const roleName = state.roles.find((r) => r.id === user.roleId)?.name || "";
  modal.querySelector("#vw-roleName").textContent = roleName;
  modal.querySelector("#vw-statusBadge").innerHTML =
    user.status === "active"
      ? `<span class="badge badge--success">Activo</span>`
      : `<span class="badge badge--muted">Inactivo</span>`;
  modal.querySelector("#vw-createdAt").textContent = formatDateDDMMYYYY(user.createdAt);
}

export function openUserFormModal(user) {
  const isEdit = !!user;
  const tpl = document.getElementById("tpl-user-form");
  if (!tpl) return;

  openModal(tpl.innerHTML, "#user-firstName");
  const modal = document.getElementById("modal-body");
  if (!modal) return;

  const selRole = modal.querySelector("#user-roleId");
  selRole.innerHTML = state.roles
    .map((r) => `<option value="${escapeHTML(r.id)}">${escapeHTML(r.name)}</option>`)
    .join("");

  if (isEdit) {
    modal.querySelector("#user-id").value = user.id;
    modal.querySelector("#user-firstName").value = user.firstName || "";
    modal.querySelector("#user-lastName").value = user.lastName || "";
    modal.querySelector("#user-email").value = user.email || "";
    modal.querySelector("#user-phone").value = user.phone || "";
    selRole.value = user.roleId || "";
    modal.querySelector("#user-status").value = user.status || "active";
    modal.querySelector("#user-createdAt").value = formatDateDDMMYYYY(user.createdAt);
  } else {
    modal.querySelector("#user-createdAt").value = formatDateDDMMYYYY(new Date().toISOString());
  }

  const form = modal.querySelector("#user-form");
  const btnSubmit = modal.querySelector("#user-submit");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnSubmit.disabled) return;

    const formData = new FormData(form);
    const payload = {
      id: formData.get("id") || generateId("u"),
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      phone: String(formData.get("phone") || "").trim(),
      roleId: String(formData.get("roleId") || "").trim(),
      status: String(formData.get("status") || "active"),
      createdAt: isEdit ? user.createdAt : new Date().toISOString(),
    };

    const setErr = (id, show) => {
      const el = modal.querySelector(`#${id}`);
      if (el) el.hidden = !show;
    };
    setErr("err-firstName", !payload.firstName);
    setErr("err-lastName", !payload.lastName);

    const emailValid = /\S+@\S+\.\S+/.test(payload.email);
    const emailTaken = state.users.some((u) => u.email === payload.email && u.id !== payload.id);
    setErr("err-email", !emailValid || emailTaken);

    const phoneValid = /^[0-9]{8,12}$/.test(payload.phone);
    setErr("err-phone", !phoneValid);

    setErr("err-roleId", !payload.roleId);

    const invalid =
      !payload.firstName ||
      !payload.lastName ||
      !emailValid ||
      emailTaken ||
      !phoneValid ||
      !payload.roleId;

    if (invalid) {
      snackWarn("Revisá los campos del formulario.", "VALIDATION_ERROR");
      return;
    }

    btnSubmit.disabled = true;
    try {
      if (DATA_SOURCE === "api") {
        if (isEdit) {
          await apiUsersUpdate(payload.id, payload);
          snackOk("Usuario actualizado");
        } else {
          await apiUsersCreate(payload);
          snackOk("Usuario creado");
        }
      } else {
        if (isEdit) {
          const idx = state.users.findIndex((u) => u.id === payload.id);
          if (idx !== -1) state.users[idx] = payload;
        } else {
          state.users.push(payload);
        }
        writeLS(LS_USERS_KEY, state.users);
        snackInfo("Demo JSON: cambios no persistidos");
      }
      renderUsersTable();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "Error al guardar el usuario."), err?.code);
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

export function openConfirmDeleteModal(user) {
  if (isOnlyActiveAdmin(user)) {
    snackWarn("No se puede inactivar al único Administrador activo.");
    return;
  }

  const tpl = document.getElementById("tpl-confirm-delete");
  if (!tpl) return;

  openModal(tpl.innerHTML, "#btn-confirm-delete");
  const modal = document.getElementById("modal-body");
  const btn = modal.querySelector("#btn-confirm-delete");
  btn.addEventListener("click", async () => {
    try {
      if (DATA_SOURCE === "api") {
        await apiUsersDelete(user.id);
        snackOk("Usuario inactivado");
      } else {
        const idx = state.users.findIndex((u) => u.id === user.id);
        if (idx !== -1) state.users[idx] = { ...state.users[idx], status: "inactive" };
        writeLS(LS_USERS_KEY, state.users);
        snackInfo("Demo JSON: cambios no persistidos");
      }
      renderUsersTable();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "No se pudo inactivar el usuario."), err?.code);
    }
  });
}

function isOnlyActiveAdmin(user) {
  const adminRole = state.roles.find((r) => norm(r.name) === "administrador");
  if (!adminRole) return false;
  const isUserAdmin = user.roleId === adminRole.id;
  if (!isUserAdmin) return false;
  const activeAdmins = state.users.filter((u) => u.roleId === adminRole.id && u.status === "active");
  return activeAdmins.length <= 1;
}

export function openRoleEditModal(role) {
  const tpl = document.getElementById("tpl-role-edit");
  if (!tpl) return;

  openModal(tpl.innerHTML, "#role-name");
  const modal = document.getElementById("modal-body");

  modal.querySelector("#role-id").value = role.id;
  modal.querySelector("#role-name").value = role.name || "";
  modal.querySelector("#role-description").value = role.description || "";
  modal.querySelector("#role-status").value = role.status || "active";

  const form = modal.querySelector("#role-form");
  const btnSubmit = modal.querySelector("#role-submit");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btnSubmit.disabled) return;

    const fd = new FormData(form);
    const payload = {
      id: fd.get("id"),
      name: String(fd.get("name") || "").trim(),
      description: String(fd.get("description") || "").trim(),
      status: String(fd.get("status") || "active"),
    };

    const errName = modal.querySelector("#err-role-name");
    if (errName) errName.hidden = !!payload.name;
    if (!payload.name) {
      snackWarn("Ingresá un nombre de rol válido.", "VALIDATION_ERROR");
      return;
    }

    btnSubmit.disabled = true;
    try {
      if (DATA_SOURCE === "api") {
        await apiRolesUpdate(payload.id, payload);
        snackOk("Rol actualizado");
      } else {
        const idx = state.roles.findIndex((r) => r.id === payload.id);
        if (idx !== -1) {
          state.roles[idx] = payload;
          writeLS(LS_ROLES_KEY, state.roles);
        }
        snackInfo("Demo JSON: cambios no persistidos");
      }
      renderRolesView();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "Error al guardar el rol."), err?.code);
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

export async function openPermissionsMatrixModal(role) {
  const tpl = document.getElementById("tpl-permissions-matrix");
  if (!tpl) return;

  let baseForRole = {};
  let overrideForRole = {};

  try {
    if (DATA_SOURCE === "api") {
      const res = await apiPermsGet(role.id);
      baseForRole = res?.data || {};
    } else {
      const [seed, overrides] = await Promise.all([
        fetchJSON(RBAC_SEED_URL).catch(() => null),
        Promise.resolve(readLS(LS_PERM_OVERRIDE_KEY, {})),
      ]);
      const baseMapByRole = buildRolePermsMap(seed);
      baseForRole = baseMapByRole[role.id] || {};
      overrideForRole = overrides[role.id] || {};
    }
  } catch (err) {
    snackErr(mapErrorToMessage(err, "No se pudieron cargar permisos."), err?.code);
    return;
  }

  const matrix = {};
  MATRIX_MODULES.forEach((mod) => {
    const base = baseForRole[mod] || {};
    const ov = overrideForRole[mod] || {};
    matrix[mod] = {
      r: ov.r ?? !!base.r,
      w: ov.w ?? !!base.w,
      u: ov.u ?? !!base.u,
      d: ov.d ?? !!base.d,
    };
  });

  openModal(tpl.innerHTML, "#perm-submit");
  const modal = document.getElementById("modal-body");
  modal.querySelector("#perm-role-name").textContent = role.name;

  const tbody = modal.querySelector("#perm-tbody");
  tbody.innerHTML = MATRIX_MODULES.map((mod) => {
    const m = matrix[mod];
    return `
      <tr data-module="${escapeHTML(mod)}">
        <td>${escapeHTML(mod)}</td>
        <td><input type="checkbox" data-perm="r" ${m.r ? "checked" : ""} /></td>
        <td><input type="checkbox" data-perm="w" ${m.w ? "checked" : ""} /></td>
        <td><input type="checkbox" data-perm="u" ${m.u ? "checked" : ""} /></td>
        <td><input type="checkbox" data-perm="d" ${m.d ? "checked" : ""} /></td>
      </tr>
    `;
  }).join("");

  const btnSave = modal.querySelector("#perm-submit");
  btnSave.addEventListener("click", async () => {
    const permMap = {};
    document.querySelectorAll("#perm-tbody tr").forEach((tr) => {
      const mod = tr.dataset.module;
      permMap[mod] = {
        r: tr.querySelector('[data-perm="r"]').checked,
        w: tr.querySelector('[data-perm="w"]').checked,
        u: tr.querySelector('[data-perm="u"]').checked,
        d: tr.querySelector('[data-perm="d"]').checked,
      };
    });

    try {
      if (DATA_SOURCE === "api") {
        await apiPermsPut(role.id, permMap);
        snackOk("Permisos guardados");
      } else {
        const current = readLS(LS_PERM_OVERRIDE_KEY, {});
        current[role.id] = permMap;
        writeLS(LS_PERM_OVERRIDE_KEY, current);
        snackOk("Permisos actualizados (demo local)");
      }

      if (state.rbac.roleId && state.rbac.roleId === role.id) {
        try {
          sessionStorage.setItem("rbac.permMap", JSON.stringify(permMap));
        } catch {}
        state.rbac.isAdmin = computeIsAdmin({ roleId: state.rbac.roleId });
        applyRBAC();
        renderUsersTable();
      }

      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "No se pudieron guardar los permisos."), err?.code);
    }
  });
}
