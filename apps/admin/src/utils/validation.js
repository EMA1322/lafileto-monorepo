// Validaciones compartidas para formularios del panel.
// Comentarios en español, código en inglés.

import { STATUS, STATUS_LIST } from './status.enum.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_REGEX = /^\+?[0-9()\s-]{7,20}$/;

function trimOrEmpty(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStatus(raw) {
  const candidate = String(raw || '').toUpperCase();
  if (STATUS_LIST.includes(candidate)) return candidate;
  return STATUS.ACTIVE;
}

function baseUserValidation(payload, { requirePassword }) {
  const errors = {};

  const fullName = trimOrEmpty(payload?.fullName);
  if (fullName.length < 2 || fullName.length > 120) {
    errors.fullName = 'Ingresá un nombre entre 2 y 120 caracteres.';
  }

  const email = trimOrEmpty(payload?.email).toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Ingresá un correo válido.';
  }

  const phone = trimOrEmpty(payload?.phone);
  if (!PHONE_REGEX.test(phone)) {
    errors.phone = 'Ingresá un teléfono válido (7-20 caracteres).';
  }

  const roleId = trimOrEmpty(payload?.roleId).toLowerCase();
  if (!roleId) {
    errors.roleId = 'Seleccioná un rol.';
  }

  const status = normalizeStatus(payload?.status);

  let password = '';
  if (requirePassword) {
    password = trimOrEmpty(payload?.password);
    if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Revisá los datos: hay campos inválidos.',
      errors,
    };
  }

  const data = {
    fullName,
    email,
    phone,
    roleId,
    status,
  };

  if (requirePassword) {
    data.password = password;
  }

  return { ok: true, data };
}

export function validateUserCreate(payload) {
  return baseUserValidation(payload, { requirePassword: true });
}

export function validateUserUpdate(payload) {
  return baseUserValidation(payload, { requirePassword: false });
}

export { EMAIL_REGEX, PHONE_REGEX };
