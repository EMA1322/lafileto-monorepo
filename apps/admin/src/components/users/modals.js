import { openModal } from '@/utils/modal.js';
import { showToast } from '@/utils/snackbar.js';

import { STATUS } from '@/utils/status.enum.js';
import { validateUserCreate, validateUserUpdate } from '@/utils/validation.js';

import {
  state,
  createUser,
  updateUser,
  deleteUser,
  createRole,
  updateRole,
  deleteRole,
  fetchRolePermissions,
  saveRolePermissions,
  notifyError,
} from './state.js';
import { clearFieldErrors, setFieldError, applyFieldErrors, escapeHTML } from './helpers.js';

function renderRoleOptions(selected) {
  return state.roles
    .map((role) => {
      const roleId = role.roleId || role.id || '';
      const label = role.name || roleId;
      const isSelected = String(selected || '').toLowerCase() === String(roleId).toLowerCase();
      return `<option value="${escapeHTML(roleId)}" ${isSelected ? 'selected' : ''}>${escapeHTML(label)}</option>`;
    })
    .join('');
}

function renderUserForm({ mode, user = {} }) {
  const isEdit = mode === 'edit';
  const statusOptions = [STATUS.ACTIVE, STATUS.INACTIVE]
    .map((status) => {
      const selected = String(user.status || STATUS.ACTIVE).toUpperCase() === status ? 'selected' : '';
      const label = status === STATUS.ACTIVE ? 'Activo' : 'Inactivo';
      return `<option value="${status}" ${selected}>${label}</option>`;
    })
    .join('');

  const roleOptions = renderRoleOptions(user.roleId);

  return `
    <form class="stack stack--lg" data-form="user" novalidate>
      <div class="stack stack--md">
        <label class="stack stack--tight" data-field="fullName">
          <span>Nombre completo</span>
          <input class="input" name="fullName" type="text" value="${escapeHTML(user.fullName || '')}" maxlength="120" required />
          <small class="text text--danger" data-error hidden></small>
        </label>
        <label class="stack stack--tight" data-field="email">
          <span>Email</span>
          <input class="input" name="email" type="email" value="${escapeHTML(user.email || '')}" ${
            isEdit ? 'readonly' : 'required'
          } />
          <small class="text text--danger" data-error hidden></small>
        </label>
        <label class="stack stack--tight" data-field="phone">
          <span>Teléfono</span>
          <input class="input" name="phone" type="tel" value="${escapeHTML(user.phone || '')}" required />
          <small class="text text--muted">Formato sugerido: +54 11 2345-6789</small>
          <small class="text text--danger" data-error hidden></small>
        </label>
        ${
          isEdit
            ? ''
            : `<label class="stack stack--tight" data-field="password">
                <span>Contraseña</span>
                <input class="input" name="password" type="password" autocomplete="new-password" required />
                <small class="text text--danger" data-error hidden></small>
              </label>`
        }
        <label class="stack stack--tight" data-field="roleId">
          <span>Rol</span>
          <select class="select" name="roleId" required>${roleOptions}</select>
          <small class="text text--danger" data-error hidden></small>
        </label>
        <label class="stack stack--tight" data-field="status">
          <span>Estado</span>
          <select class="select" name="status" required>${statusOptions}</select>
        </label>
      </div>
      <div class="row row--end row--gap-sm">
        <button class="btn btn--ghost" type="button" data-dismiss>Cancelar</button>
        <button class="btn btn--primary" type="submit">${isEdit ? 'Guardar cambios' : 'Crear usuario'}</button>
      </div>
    </form>
  `;
}

function extractFieldErrors(error) {
  const fields = error?.details?.fields;
  if (!Array.isArray(fields)) return {};
  return fields.reduce((acc, entry) => {
    const path = String(entry?.path || '').split('.')[0];
    if (!path) return acc;
    acc[path] = entry?.message || 'Dato inválido.';
    return acc;
  }, {});
}

export function openCreateUserModal() {
  if (!state.roles.length) {
    showToast({ message: 'No hay roles disponibles. Creá un rol antes de dar de alta usuarios.', type: 'error' });
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderUserForm({ mode: 'create' });
  const form = wrapper.querySelector('form');

  let modalHandle = null;
  modalHandle = openModal({
    title: 'Nuevo usuario',
    content: wrapper,
  });

  const cancel = form.querySelector('[data-dismiss]');
  cancel?.addEventListener('click', () => modalHandle?.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const formData = new FormData(form);
    const payload = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      roleId: formData.get('roleId'),
      status: formData.get('status'),
    };

    const validation = validateUserCreate(payload);
    if (!validation.ok) {
      applyFieldErrors(form, validation.errors);
      showToast({ message: validation.message, type: 'error' });
      return;
    }

    try {
      await createUser(validation.data);
      showToast({ message: 'Usuario creado correctamente.', type: 'success' });
      modalHandle?.close();
    } catch (err) {
      applyFieldErrors(form, extractFieldErrors(err));
      notifyError(err, 'No se pudo crear el usuario.');
    }
  });
}

export function openEditUserModal(user) {
  if (!user) return;
  if (!state.roles.length) {
    showToast({ message: 'No hay roles disponibles para editar usuarios.', type: 'error' });
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderUserForm({ mode: 'edit', user });
  const form = wrapper.querySelector('form');

  let modalHandle = null;
  modalHandle = openModal({
    title: 'Editar usuario',
    content: wrapper,
  });

  const cancel = form.querySelector('[data-dismiss]');
  cancel?.addEventListener('click', () => modalHandle?.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);

    const formData = new FormData(form);
    const payload = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      roleId: formData.get('roleId'),
      status: formData.get('status'),
    };

    const validation = validateUserUpdate(payload);
    if (!validation.ok) {
      applyFieldErrors(form, validation.errors);
      showToast({ message: validation.message, type: 'error' });
      return;
    }

    try {
      await updateUser(user.id, validation.data);
      showToast({ message: 'Usuario actualizado.', type: 'success' });
      modalHandle?.close();
    } catch (err) {
      applyFieldErrors(form, extractFieldErrors(err));
      notifyError(err, 'No se pudo actualizar el usuario.');
    }
  });
}

export function openDeleteUserModal(user) {
  if (!user) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'stack stack--md';
  wrapper.innerHTML = `
    <p>¿Querés eliminar al usuario <strong>${escapeHTML(user.fullName || user.email || '')}</strong>?</p>
    <p class="text text--muted">Esta acción es definitiva.</p>
    <div class="row row--end row--gap-sm">
      <button class="btn btn--ghost" type="button" data-dismiss>Cancelar</button>
      <button class="btn btn--danger" type="button" data-confirm>Eliminar</button>
    </div>
  `;

  let modalHandle = null;
  modalHandle = openModal({ title: 'Eliminar usuario', content: wrapper });

  const cancel = wrapper.querySelector('[data-dismiss]');
  cancel?.addEventListener('click', () => modalHandle?.close());

  const confirm = wrapper.querySelector('[data-confirm]');
  confirm?.addEventListener('click', async () => {
    try {
      await deleteUser(user.id);
      showToast({ message: 'Usuario eliminado.', type: 'success' });
      modalHandle?.close();
    } catch (err) {
      notifyError(err, 'No se pudo eliminar el usuario.');
    }
  });
}

function renderRoleForm(role = {}) {
  return `
    <form class="stack stack--md" data-form="role" novalidate>
      <label class="stack stack--tight" data-field="roleId">
        <span>Identificador</span>
        <input class="input" name="roleId" type="text" value="${escapeHTML(role.roleId || '')}" ${
          role.roleId ? 'readonly' : 'required'
        } />
        <small class="text text--danger" data-error hidden></small>
      </label>
      <label class="stack stack--tight" data-field="name">
        <span>Nombre visible</span>
        <input class="input" name="name" type="text" value="${escapeHTML(role.name || '')}" required />
        <small class="text text--danger" data-error hidden></small>
      </label>
      <div class="row row--end row--gap-sm">
        <button class="btn btn--ghost" type="button" data-dismiss>Cancelar</button>
        <button class="btn btn--primary" type="submit">${role.roleId ? 'Guardar cambios' : 'Crear rol'}</button>
      </div>
    </form>
  `;
}

export function openCreateRoleModal() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderRoleForm();
  const form = wrapper.querySelector('form');

  let modalHandle = null;
  modalHandle = openModal({ title: 'Nuevo rol', content: wrapper });

  form.querySelector('[data-dismiss]')?.addEventListener('click', () => modalHandle?.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    const formData = new FormData(form);
    const payload = {
      roleId: String(formData.get('roleId') || '').trim().toLowerCase(),
      name: String(formData.get('name') || '').trim(),
    };

    if (!payload.roleId) {
      setFieldError(form, 'roleId', 'Ingresá un identificador.');
      showToast({ message: 'Revisá los datos: hay campos inválidos.', type: 'error' });
      return;
    }
    if (!payload.name) {
      setFieldError(form, 'name', 'Ingresá un nombre visible.');
      showToast({ message: 'Revisá los datos: hay campos inválidos.', type: 'error' });
      return;
    }

    try {
      await createRole(payload);
      showToast({ message: 'Rol creado.', type: 'success' });
      modalHandle?.close();
    } catch (err) {
      applyFieldErrors(form, extractFieldErrors(err));
      notifyError(err, 'No se pudo crear el rol.');
    }
  });
}

export function openEditRoleModal(role) {
  if (!role) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderRoleForm(role);
  const form = wrapper.querySelector('form');

  let modalHandle = null;
  modalHandle = openModal({ title: 'Editar rol', content: wrapper });

  form.querySelector('[data-dismiss]')?.addEventListener('click', () => modalHandle?.close());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors(form);
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || '').trim(),
    };

    if (!payload.name) {
      setFieldError(form, 'name', 'Ingresá un nombre visible.');
      showToast({ message: 'Revisá los datos: hay campos inválidos.', type: 'error' });
      return;
    }

    try {
      await updateRole(role.roleId || role.id, payload);
      showToast({ message: 'Rol actualizado.', type: 'success' });
      modalHandle?.close();
    } catch (err) {
      applyFieldErrors(form, extractFieldErrors(err));
      notifyError(err, 'No se pudo actualizar el rol.');
    }
  });
}

export function openDeleteRoleModal(role) {
  if (!role) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'stack stack--md';
  wrapper.innerHTML = `
    <p>¿Eliminar el rol <strong>${escapeHTML(role.name || role.roleId || '')}</strong>?</p>
    <p class="text text--muted">Los usuarios asociados quedarán sin rol asignado.</p>
    <div class="row row--end row--gap-sm">
      <button class="btn btn--ghost" type="button" data-dismiss>Cancelar</button>
      <button class="btn btn--danger" type="button" data-confirm>Eliminar</button>
    </div>
  `;

  let modalHandle = null;
  modalHandle = openModal({ title: 'Eliminar rol', content: wrapper });

  wrapper.querySelector('[data-dismiss]')?.addEventListener('click', () => modalHandle?.close());
  wrapper.querySelector('[data-confirm]')?.addEventListener('click', async () => {
    try {
      await deleteRole(role.roleId || role.id);
      showToast({ message: 'Rol eliminado.', type: 'success' });
      modalHandle?.close();
    } catch (err) {
      notifyError(err, 'No se pudo eliminar el rol.');
    }
  });
}

function renderPermissionRow(mod, values = {}) {
  const checked = (flag) => (values[flag] ? 'checked' : '');
  return `
    <tr data-module="${escapeHTML(mod.key)}">
      <th scope="row">${escapeHTML(mod.name || mod.key)}</th>
      <td><input type="checkbox" data-flag="r" ${checked('r')} /></td>
      <td><input type="checkbox" data-flag="w" ${checked('w')} /></td>
      <td><input type="checkbox" data-flag="u" ${checked('u')} /></td>
      <td><input type="checkbox" data-flag="d" ${checked('d')} /></td>
    </tr>
  `;
}

export async function openPermissionsModal(role) {
  if (!role) return;
  try {
    const permissions = await fetchRolePermissions(role.roleId || role.id);
    const map = permissions.reduce((acc, entry) => {
      acc[entry.moduleKey] = entry;
      return acc;
    }, {});

    const wrapper = document.createElement('div');
    wrapper.className = 'stack stack--md';
    const rows = state.modules
      .map((mod) => renderPermissionRow(mod, map[mod.key] || {}))
      .join('');
    wrapper.innerHTML = `
      <p>Seleccioná los permisos del rol <strong>${escapeHTML(role.name || role.roleId || '')}</strong>.</p>
      <div class="table-wrap">
        <table class="table table--compact">
          <thead>
            <tr>
              <th scope="col">Módulo</th>
              <th scope="col">R</th>
              <th scope="col">W</th>
              <th scope="col">U</th>
              <th scope="col">D</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="row row--end row--gap-sm">
        <button class="btn btn--ghost" type="button" data-dismiss>Cancelar</button>
        <button class="btn btn--primary" type="button" data-confirm>Guardar</button>
      </div>
    `;

    let modalHandle = null;
    modalHandle = openModal({ title: 'Permisos del rol', content: wrapper });

    wrapper.querySelector('[data-dismiss]')?.addEventListener('click', () => modalHandle?.close());

    wrapper.querySelector('[data-confirm]')?.addEventListener('click', async () => {
      const entries = Array.from(wrapper.querySelectorAll('tbody tr')).map((row) => {
        const moduleKey = row.getAttribute('data-module');
        const values = {};
        row.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          values[input.getAttribute('data-flag')] = input.checked;
        });
        return {
          moduleKey,
          r: !!values.r,
          w: !!values.w,
          u: !!values.u,
          d: !!values.d,
        };
      });

      try {
        await saveRolePermissions(role.roleId || role.id, entries);
        showToast({ message: 'Permisos actualizados.', type: 'success' });
        modalHandle?.close();
      } catch (err) {
        notifyError(err, 'No se pudieron guardar los permisos.');
      }
    });
  } catch (err) {
    notifyError(err, 'No se pudieron cargar los permisos.');
  }
}
