export const ADMIN_ROLE_ID = 'role-admin';

export function normalizeRole(raw = {}) {
  const roleId = raw.roleId || raw.id || '';
  return {
    roleId,
    name: raw.name || roleId,
  };
}

export function normalizeRolesResponse(response = {}) {
  const items = Array.isArray(response?.data?.items) ? response.data.items : [];
  return items.map(normalizeRole).filter((role) => role.roleId);
}

export function createRoleFormState(role = {}) {
  return {
    roleId: role?.roleId || '',
    name: role?.name || '',
  };
}

export function validateRoleForm(values = {}, { mode = 'create' } = {}) {
  const errors = {};
  const roleId = String(values.roleId || '')
    .trim()
    .toLowerCase();
  const name = String(values.name || '').trim();

  if (mode === 'create' && roleId && !/^role-[a-z0-9-]+$/i.test(roleId)) {
    errors.roleId = 'El identificador debe comenzar con role-.';
  }
  if (name.length < 2) errors.name = 'Ingresa un nombre valido.';
  if (name.length > 80) errors.name = 'El nombre no puede superar 80 caracteres.';

  return errors;
}

export function hasRoleFormErrors(errors = {}) {
  return Object.values(errors).some(Boolean);
}

export function buildRolePayload(values = {}, { mode = 'create' } = {}) {
  const payload = {
    name: String(values.name || '').trim(),
  };
  const roleId = String(values.roleId || '')
    .trim()
    .toLowerCase();
  if (mode === 'create' && roleId) payload.roleId = roleId;
  return payload;
}

export function mapRoleApiError(error) {
  const code = error?.code || '';
  const messages = {
    RESOURCE_CONFLICT: 'El rol ya existe o esta protegido.',
    ROLE_IN_USE: 'No se puede eliminar: hay usuarios asignados a este rol.',
    RESOURCE_NOT_FOUND: 'El rol no existe o fue eliminado.',
    PERMISSION_DENIED: 'No tenes permisos para esta accion.',
    VALIDATION_ERROR: 'Revisa los datos del rol.',
  };

  return messages[code] || error?.message || 'No se pudo completar la accion del rol.';
}

export function isProtectedRole(roleId) {
  return (
    String(roleId || '')
      .trim()
      .toLowerCase() === ADMIN_ROLE_ID
  );
}
