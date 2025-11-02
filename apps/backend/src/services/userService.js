// Servicio Users: listados y creación con validaciones de negocio
import { userRepository } from '../repositories/userRepository.js';
import { roleRepository } from '../repositories/roleRepository.js';
import { createError } from '../utils/errors.js';
import { hashPassword } from '../utils/bcrypt.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const DEFAULT_ORDER_BY = 'fullName';
const ALLOWED_ORDER_FIELDS = new Set(['id', 'fullName', 'email', 'status']);

function compactPhone(phone) {
  return phone.replace(/[\s-]+/g, '').trim();
}

function normalizeOrderBy(value) {
  if (typeof value !== 'string') return DEFAULT_ORDER_BY;
  const normalized = value.trim();
  if (!normalized) return DEFAULT_ORDER_BY;

  const lower = normalized.toLowerCase();
  if (lower === 'fullname' || lower === 'full_name' || lower === 'name') return 'fullName';
  if (lower === 'mail') return 'email';
  if (lower === 'user_id' || lower === 'userid') return 'id';

  if (ALLOWED_ORDER_FIELDS.has(normalized)) return normalized;
  if (ALLOWED_ORDER_FIELDS.has(lower)) return lower;

  return ALLOWED_ORDER_FIELDS.has(value) ? value : DEFAULT_ORDER_BY;
}

function normalizeOrderDirection(value) {
  if (typeof value !== 'string') return 'asc';
  const normalized = value.trim().toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}

export const userService = {
  async listUsers({ page, pageSize, q, all, orderBy, orderDir } = {}) {
    const wantsAll = Boolean(all);
    const normalizedSearch = typeof q === 'string' ? q.trim() : '';
    const sortField = normalizeOrderBy(orderBy);
    const sortDirection = normalizeOrderDirection(orderDir);

    const normalizedPage = normalizePage(page, { defaultValue: DEFAULT_PAGE });
    const normalizedPageSize = normalizePageSize(pageSize, {
      defaultValue: DEFAULT_PAGE_SIZE,
      max: MAX_PAGE_SIZE
    });

    if (wantsAll) {
      const { items, total } = await userRepository.list({
        page: DEFAULT_PAGE,
        pageSize: MAX_PAGE_SIZE,
        q: normalizedSearch ? normalizedSearch : undefined,
        orderBy: sortField,
        orderDirection: sortDirection,
        all: true
      });

      const safeTotal = Number.isFinite(total) ? total : items.length;
      const pageCount = Math.max(1, Math.ceil(safeTotal / normalizedPageSize));

      return {
        items,
        meta: {
          page: 1,
          pageSize: normalizedPageSize,
          total: safeTotal,
          pageCount
        }
      };
    }

    const { items, total } = await userRepository.list({
      page: normalizedPage,
      pageSize: normalizedPageSize,
      q: normalizedSearch ? normalizedSearch : undefined,
      orderBy: sortField,
      orderDirection: sortDirection,
      all: false
    });

    const safeTotal = Number.isFinite(total) ? total : items.length;
    const pageCount = Math.max(1, Math.ceil(safeTotal / normalizedPageSize));

    return {
      items,
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total: safeTotal,
        pageCount
      }
    };
  },
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
  },

  async updateUser(id, payload) {
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw createError('RESOURCE_NOT_FOUND', 'El usuario solicitado no existe.');
    }

    const existing = await userRepository.findById(userId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El usuario solicitado no existe.');
    }

    const phone = payload.phone.trim();
    const phoneCompact = compactPhone(phone);
    if (!phoneCompact || phoneCompact === '0000000000') {
      throw createError('VALIDATION_ERROR', 'El teléfono es inválido.', {
        fields: [{ path: 'phone', message: 'El teléfono no puede ser 0000000000.' }]
      });
    }

    const role = await roleRepository.findById(payload.roleId);
    if (!role) {
      throw createError('RESOURCE_NOT_FOUND', 'El rol indicado no existe.', {
        fields: [{ path: 'roleId', message: 'Seleccioná un rol válido.' }]
      });
    }

    const updated = await userRepository.update(userId, {
      fullName: payload.fullName.trim(),
      phone,
      roleId: payload.roleId,
      status: payload.status
    });

    return updated;
  },

  async deleteUser(id, { currentUserId } = {}) {
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw createError('RESOURCE_NOT_FOUND', 'El usuario solicitado no existe.');
    }

    const existing = await userRepository.findById(userId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El usuario solicitado no existe.');
    }

    if (Number(currentUserId) === userId) {
      throw createError('SELF_DELETE_FORBIDDEN', 'No podés eliminar tu propio usuario.');
    }

    if (existing.roleId === 'role-admin') {
      const adminsLeft = await userRepository.countAdminsExcluding(userId);
      if (adminsLeft === 0) {
        throw createError('LAST_ADMIN_FORBIDDEN', 'No se puede eliminar el último administrador.');
      }
    }

    await userRepository.deleteById(userId);

    return { deleted: true };
  }
};
