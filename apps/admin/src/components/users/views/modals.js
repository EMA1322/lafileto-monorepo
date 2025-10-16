import { openModal, closeModal } from "@/utils/modals.js";

import {
  state,
  fetchRolePermissions,
  saveRolePermissions,
  snackOk,
  snackErr,
  createUser,
  createRole,
  updateRole,
  deleteRole,
  reloadUsers,
  PHONE_REGEX
} from "../state.js";
import { escapeHTML, mapErrorToMessage } from "../helpers.js";
import { applyRBAC } from "./viewRBAC.js";
import { renderUsersTable, renderUsersCount } from "./usersTable.js";
import { renderUsersStatus, renderRolesStatus } from "./status.js";
import { renderRolesView } from "./roles.js";

const PHONE_CLIENT_REGEX = PHONE_REGEX;

function resetFormErrors(form) {
  form.querySelectorAll(".form__error").forEach((el) => {
    el.hidden = true;
  });
  form.querySelectorAll("[aria-invalid='true']").forEach((el) => {
    el.removeAttribute("aria-invalid");
  });
}

function setFieldError(form, field, message) {
  const err = form.querySelector(`#err-${field}`);
  const input = form.querySelector(`[name='${field}']`) || form.querySelector(`#${field}`);
  if (!err) return;
  if (message) {
    err.textContent = message;
    err.hidden = false;
    input?.setAttribute("aria-invalid", "true");
  } else {
    err.hidden = true;
    input?.removeAttribute("aria-invalid");
  }
}

function applyServerErrors(form, error) {
  const fields = error?.details?.fields;
  if (!Array.isArray(fields)) return;
  fields.forEach((entry) => {
    const rawKey = String(entry?.path || "").split(".")[0];
    const key = rawKey === "name" ? "role-name" : rawKey;
    if (!key) return;
    setFieldError(form, key, entry?.message || "Dato inválido.");
  });
}

function fillRolesOptions(select) {
  if (!select) return;
  const options = state.roles.map((role) => {
    const roleId = role.roleId || role.id;
    const label = role.name || roleId;
    return `<option value="${escapeHTML(roleId)}">${escapeHTML(label)}</option>`;
  });
  select.innerHTML = options.join("");
}

export function openCreateUserModal() {
  const tpl = document.getElementById("tpl-user-form");
  if (!tpl) return;
  if (!state.roles.length) {
    snackErr("No hay roles disponibles. Creá un rol antes de dar de alta usuarios.");
    return;
  }

  openModal(tpl.innerHTML, "#user-submit");
  const modal = document.getElementById("modal-body");
  if (!modal) return;

  const form = modal.querySelector("#user-form");
  const btnSubmit = modal.querySelector("#user-submit");
  const selectRole = form?.querySelector("#user-roleId");
  fillRolesOptions(selectRole);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form) return;

    resetFormErrors(form);

    const formData = new FormData(form);
    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const roleId = String(formData.get("roleId") || "").trim().toLowerCase();
    const status = String(formData.get("status") || "ACTIVE").toUpperCase();

    let hasError = false;
    if (fullName.length < 2) {
      setFieldError(form, "fullName", "Ingrese un nombre válido (mínimo 2 caracteres).");
      hasError = true;
    }
    if (!email || !email.includes("@")) {
      setFieldError(form, "email", "Ingrese un email válido.");
      hasError = true;
    }
    if (!phone || !PHONE_CLIENT_REGEX.test(phone)) {
      setFieldError(form, "phone", "Ingrese un teléfono válido (7-20 caracteres).");
      hasError = true;
    }
    if (password.length < 8) {
      setFieldError(form, "password", "La contraseña debe tener al menos 8 caracteres.");
      hasError = true;
    }
    if (!roleId) {
      setFieldError(form, "roleId", "Seleccione un rol válido.");
      hasError = true;
    }
    if (hasError) return;

    btnSubmit.disabled = true;
    try {
      await createUser({ fullName, email, phone, password, roleId, status });
      snackOk("Usuario creado correctamente.");
      closeModal();
      await reloadUsers({
        onUsersStatus: renderUsersStatus,
        onUsersTable: renderUsersTable,
        onUsersCount: renderUsersCount
      });
    } catch (err) {
      applyServerErrors(form, err);
      snackErr(mapErrorToMessage(err, "No se pudo crear el usuario."), err?.code);
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

export function openRoleFormModal({ mode = "create", role } = {}) {
  const tpl = document.getElementById("tpl-role-form");
  if (!tpl) return;
  openModal(tpl.innerHTML, "#role-submit");
  const modal = document.getElementById("modal-body");
  if (!modal) return;

  const form = modal.querySelector("#role-form");
  const inputName = form?.querySelector("#role-name");
  const hiddenId = form?.querySelector("#role-id");
  const btnSubmit = form?.querySelector("#role-submit");

  if (mode === "edit" && role) {
    const roleId = role.roleId || role.id;
    hiddenId.value = roleId;
    inputName.value = role.name || roleId;
    if (btnSubmit) btnSubmit.textContent = "Guardar";
  } else if (btnSubmit) {
    btnSubmit.textContent = "Crear";
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form) return;

    resetFormErrors(form);

    const name = String(inputName?.value || "").trim();
    if (name.length < 2) {
      setFieldError(form, "role-name", "Ingrese un nombre válido (mínimo 2 caracteres).");
      return;
    }

    btnSubmit.disabled = true;
    try {
      if (mode === "edit" && hiddenId?.value) {
        await updateRole(hiddenId.value, { name });
        snackOk("Rol actualizado correctamente.");
      } else {
        await createRole({ name });
        snackOk("Rol creado correctamente.");
      }
      renderRolesStatus("");
      renderRolesView();
      applyRBAC();
      closeModal();
    } catch (err) {
      applyServerErrors(form, err);
      snackErr(mapErrorToMessage(err, "No se pudo guardar el rol."), err?.code);
    } finally {
      btnSubmit.disabled = false;
    }
  });
}

export function openRoleDeleteModal(role) {
  const tpl = document.getElementById("tpl-role-delete");
  if (!tpl) return;
  const roleId = role.roleId || role.id;
  openModal(tpl.innerHTML, "#btn-role-delete");
  const modal = document.getElementById("modal-body");
  if (!modal) return;

  modal.querySelector("#role-del-name").textContent = role.name || roleId;
  const btnDelete = modal.querySelector("#btn-role-delete");
  btnDelete?.addEventListener("click", async () => {
    btnDelete.disabled = true;
    try {
      await deleteRole(roleId);
      snackOk("Rol eliminado correctamente.");
      renderRolesStatus("");
      renderRolesView();
      applyRBAC();
      closeModal();
    } catch (err) {
      snackErr(mapErrorToMessage(err, "No se pudo eliminar el rol."), err?.code);
      btnDelete.disabled = false;
    }
  });
}

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
