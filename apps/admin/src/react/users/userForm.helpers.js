import { buildUserPayload } from './usersList.helpers.js';

export const USER_STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

const PHONE_REGEX = /^[0-9()+\s-]{7,20}$/;

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeFieldName(field) {
  const raw = String(field || '').split('.')[0];
  if (raw === 'name') return 'roleName';
  return raw;
}

function getApiFieldDetails(error) {
  const candidates = [
    error?.details?.fields,
    error?.details,
    error?.payload?.error?.details?.fields,
    error?.payload?.error?.details,
  ];
  return candidates.find(Array.isArray) || [];
}

export function createUserFormState(user = {}) {
  return {
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    roleId: user?.roleId || '',
    status: user?.status || 'active',
  };
}

export function validateUserForm(values = {}, { mode = 'create' } = {}) {
  const errors = {};
  const fullName = normalizeText(values.fullName);
  const email = normalizeText(values.email);
  const phone = normalizeText(values.phone);
  const password = normalizeText(values.password);
  const roleId = normalizeText(values.roleId);
  const status = normalizeText(values.status);

  if (fullName.length < 2) errors.fullName = 'Ingresa un nombre valido.';
  if (mode === 'create') {
    if (!email) errors.email = 'Ingresa el email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Ingresa un email valido.';
    if (password.length < 8) errors.password = 'La contrasena debe tener al menos 8 caracteres.';
  }
  if (!phone) errors.phone = 'Ingresa el telefono.';
  else if (!PHONE_REGEX.test(phone))
    errors.phone = 'Ingresa un telefono valido de 7 a 20 caracteres.';
  else if (phone.replace(/[\s-]+/g, '') === '0000000000') {
    errors.phone = 'El telefono no puede ser 0000000000.';
  }
  if (!roleId) errors.roleId = 'Selecciona un rol.';
  if (!['active', 'inactive'].includes(status)) errors.status = 'Selecciona un estado.';

  return errors;
}

export function hasUserFormErrors(errors = {}) {
  return Object.values(errors).some(Boolean);
}

export function mapUserApiError(error) {
  const fieldErrors = {};
  getApiFieldDetails(error).forEach((entry) => {
    const field = normalizeFieldName(entry?.path || entry?.field || entry?.name);
    if (field) fieldErrors[field] = entry?.message || 'Revisa este campo.';
  });

  const code = error?.code || '';
  const codeMessages = {
    RESOURCE_CONFLICT: 'El email ya esta registrado.',
    CONFLICT: 'La operacion esta en conflicto con los datos actuales.',
    SELF_DELETE_FORBIDDEN: 'No podes eliminar tu propio usuario.',
    LAST_ADMIN_FORBIDDEN: 'No se puede eliminar el ultimo administrador.',
    PERMISSION_DENIED: 'No tenes permisos para esta accion.',
    RESOURCE_NOT_FOUND: 'El recurso no existe o fue eliminado.',
    VALIDATION_ERROR: 'Revisa los datos marcados.',
  };

  return {
    fieldErrors,
    generalError: codeMessages[code] || error?.message || 'No se pudo guardar el usuario.',
  };
}

export { buildUserPayload };
