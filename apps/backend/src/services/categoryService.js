// Servicio de categorías: listados y mutaciones con reglas básicas
import { categoryRepository } from '../repositories/categoryRepository.js';
import { createError } from '../utils/errors.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';

let PrismaClientKnownRequestError;

try {
  const { Prisma } = await import('@prisma/client');
  PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;
} catch (err) {
  if (process.env.NODE_ENV === 'test' || process.env.PRISMA_CLIENT_STUB === '1') {
    PrismaClientKnownRequestError = class PrismaClientKnownRequestErrorStub extends Error {};
  } else {
    throw err;
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;

function normalizeOrderBy(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'name';

    if (trimmed === 'name' || trimmed === 'createdAt' || trimmed === 'updatedAt') {
      return trimmed;
    }

    const normalized = trimmed.toLowerCase();
    if (normalized === 'name') return 'name';
    if (normalized === 'createdat' || normalized === 'created_at') return 'createdAt';
    if (normalized === 'updatedat' || normalized === 'updated_at') return 'updatedAt';
  }

  return 'name';
}

function normalizeOrderDirection(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'desc') return 'desc';
  }
  return 'asc';
}

function normalizeStatus(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'all') return 'all';
    if (normalized === 'inactive') return 'inactive';
    if (normalized === 'active') return 'active';
  }
  return 'all';
}

function normalizeId(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeImageUrl(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl ?? null,
    active: !!row.active
  };
}

function isUniqueConstraintError(err) {
  return err instanceof PrismaClientKnownRequestError && err.code === 'P2002';
}

export const categoryService = {
  async listCategories({
    page,
    pageSize,
    q,
    all,
    status,
    orderBy,
    orderDir,
    orderDirection
  } = {}) {
    const wantsAll = Boolean(all);
    const normalizedSearch = typeof q === 'string' ? q.trim() : '';
    const orderField = normalizeOrderBy(orderBy);
    const direction = normalizeOrderDirection(orderDir ?? orderDirection);
    const normalizedStatus = normalizeStatus(status);

    const normalizedPage = normalizePage(page, { defaultValue: DEFAULT_PAGE });
    const normalizedPageSize = normalizePageSize(pageSize, {
      defaultValue: DEFAULT_PAGE_SIZE,
      min: MIN_PAGE_SIZE,
      max: MAX_PAGE_SIZE,
    });

    if (wantsAll) {
      const { items, total } = await categoryRepository.list({
        page: DEFAULT_PAGE,
        pageSize: MAX_PAGE_SIZE,
        q: normalizedSearch ? normalizedSearch : undefined,
        status: normalizedStatus,
        all: true,
        orderBy: orderField,
        orderDirection: direction,
      });

      const sanitized = items.map(sanitizeCategory);
      const effectiveTotal = Number.isFinite(total) ? total : sanitized.length;
      const pageCount = Math.max(1, Math.ceil(effectiveTotal / normalizedPageSize));
      return {
        items: sanitized,
        meta: {
          page: 1,
          pageSize: normalizedPageSize,
          total: effectiveTotal,
          pageCount,
        },
      };
    }

    const { items, total } = await categoryRepository.list({
      page: normalizedPage,
      pageSize: normalizedPageSize,
      q: normalizedSearch ? normalizedSearch : undefined,
      status: normalizedStatus,
      all: false,
      orderBy: orderField,
      orderDirection: direction,
    });

    const safeTotal = Number.isFinite(total) ? total : items.length;
    const pageCount = Math.max(1, Math.ceil(safeTotal / normalizedPageSize));

    return {
      items: items.map(sanitizeCategory),
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total: safeTotal,
        pageCount,
      },
    };
  },

  async createCategory(payload) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      throw createError('VALIDATION_ERROR', 'El nombre es obligatorio.', {
        fields: [{ path: 'name', message: 'El nombre es obligatorio.' }]
      });
    }

    const normalizedImageUrl = normalizeImageUrl(payload.imageUrl);

    const existing = await categoryRepository.findByName(name);
    if (existing) {
      throw createError('CATEGORY_NAME_CONFLICT', 'Ya existe una categoría con ese nombre.', {
        fields: [{ path: 'name', message: 'El nombre ya se encuentra en uso.' }]
      });
    }

    try {
      const created = await categoryRepository.create({
        name,
        imageUrl: normalizedImageUrl,
        active: true
      });
      return sanitizeCategory(created);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw createError('CATEGORY_NAME_CONFLICT', 'Ya existe una categoría con ese nombre.', {
          fields: [{ path: 'name', message: 'El nombre ya se encuentra en uso.' }]
        });
      }
      throw err;
    }
  },

  async getCategory(id) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const existing = await categoryRepository.findById(categoryId);
    if (!existing) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    return sanitizeCategory(existing);
  },

  async updateCategory(id, payload) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const existing = await categoryRepository.findById(categoryId);
    if (!existing) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const data = {};

    if (payload.name !== undefined) {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        throw createError('VALIDATION_ERROR', 'El nombre es obligatorio.', {
          fields: [{ path: 'name', message: 'El nombre es obligatorio.' }]
        });
      }
      if (name !== existing.name) {
        const byName = await categoryRepository.findByName(name);
        if (byName && byName.id !== categoryId) {
          throw createError('CATEGORY_NAME_CONFLICT', 'Ya existe una categoría con ese nombre.', {
            fields: [{ path: 'name', message: 'El nombre ya se encuentra en uso.' }]
          });
        }
        data.name = name;
      }
    }

    if (payload.imageUrl !== undefined) {
      data.imageUrl = normalizeImageUrl(payload.imageUrl);
    }

    if (Object.keys(data).length === 0) {
      return sanitizeCategory(existing);
    }

    try {
      const updated = await categoryRepository.update(categoryId, data);
      return sanitizeCategory(updated);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw createError('CATEGORY_NAME_CONFLICT', 'Ya existe una categoría con ese nombre.', {
          fields: [{ path: 'name', message: 'El nombre ya se encuentra en uso.' }]
        });
      }
      throw err;
    }
  },

  async toggleCategoryActive(id, active) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const existing = await categoryRepository.findById(categoryId);
    if (!existing) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const nextActive = Boolean(active);

    if (existing.active === nextActive) {
      return sanitizeCategory(existing);
    }

    const updated = await categoryRepository.update(categoryId, { active: nextActive });
    return sanitizeCategory(updated);
  },

  async deleteCategory(id) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const existing = await categoryRepository.findById(categoryId);
    if (!existing) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    await categoryRepository.deleteById(categoryId);
    return { deleted: true };
  }
};
