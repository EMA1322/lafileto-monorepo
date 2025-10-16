// Servicio Users: listados y creación con validaciones de negocio
import { userRepository } from '../repositories/userRepository.js';
import { roleRepository } from '../repositories/roleRepository.js';
import { createError } from '../utils/errors.js';
import { hashPassword } from '../utils/bcrypt.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function normalizePage(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PAGE;
}

function normalizePageSize(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(n, MAX_PAGE_SIZE);
}

function compactPhone(phone) {
  return phone.replace(/[\s-]+/g, '').trim();
}

export const userService = {
  async listUsers({ page, pageSize, search } = {}) {
    const normalizedPage = normalizePage(page);
    const normalizedPageSize = normalizePageSize(pageSize);
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';

    const { items, total } = await userRepository.list({
      page: normalizedPage,
      pageSize: normalizedPageSize,
      search: normalizedSearch ? normalizedSearch : undefined
    });

    return {
      items,
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total
      }
    };
  }
,
  async createUser(payload) {
    const fullName = payload.fullName.trim();
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone.trim();
    const phoneCompact = compactPhone(phone);

    if (!phoneCompact || phoneCompact === '0000000000') {
      throw createError('VALIDATION_ERROR', 'El teléfono es inválido.', {
        fields: [{ path: 'phone', message: 'El teléfono no puede ser 0000000000.' }]
      });
    }

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw createError('RESOURCE_CONFLICT', 'El email ya está registrado.', {
        fields: [{ path: 'email', message: 'El email ya se encuentra en uso.' }]
      });
    }

    const role = await roleRepository.findById(payload.roleId);
    if (!role) {
      throw createError('RESOURCE_NOT_FOUND', 'El rol indicado no existe.', {
        fields: [{ path: 'roleId', message: 'Seleccioná un rol válido.' }]
      });
    }

    const passwordHash = await hashPassword(payload.password);

    const created = await userRepository.create({
      fullName,
      email,
      phone,
      passwordHash,
      roleId: payload.roleId,
      status: payload.status
    });

    return {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      phone: created.phone,
      roleId: created.roleId,
      status: created.status
    };
  }
};
