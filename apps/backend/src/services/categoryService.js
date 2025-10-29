// Category service: handles listing, retrieval and mutations with business rules
import { Prisma } from '@prisma/client';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { createError } from '../utils/errors.js';

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

function normalizeQuery(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') return 'active';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'all') return 'all';
  return 'active';
}

function normalizeOrderBy(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'createdat' || normalized === 'created_at') return 'createdAt';
    if (normalized === 'name') return 'name';
  }
  return 'name';
}

function normalizeOrderDir(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'desc') return 'desc';
  }
  return 'asc';
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
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export const categoryService = {
  async listCategories({ q, status, orderBy, orderDir, page, pageSize } = {}) {
    const normalizedQuery = normalizeQuery(q);
    const normalizedStatus = normalizeStatus(status);
    const orderField = normalizeOrderBy(orderBy);
    const direction = normalizeOrderDir(orderDir);
    const normalizedPage = normalizePage(page);
    const normalizedPageSize = normalizePageSize(pageSize);

    const { items, total } = await categoryRepository.listCategories({
      q: normalizedQuery,
      status: normalizedStatus,
      orderBy: orderField,
      orderDir: direction,
      page: normalizedPage,
      pageSize: normalizedPageSize
    });

    return {
      items: items.map(sanitizeCategory),
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total
      }
    };
  },

  async getCategoryById(id) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const category = await categoryRepository.getCategoryById(categoryId);
    if (!category) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    return sanitizeCategory(category);
  },

  async createCategory(payload) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      throw createError('VALIDATION_ERROR', 'El nombre es obligatorio.', {
        fields: [{ path: 'name', message: 'El nombre es obligatorio.' }]
      });
    }

    const normalizedImageUrl = normalizeImageUrl(payload.imageUrl);

    const existing = await categoryRepository.getCategoryByName(name);
    if (existing) {
      throw createError('CATEGORY_NAME_CONFLICT', 'Ya existe una categoría con ese nombre.', {
        fields: [{ path: 'name', message: 'El nombre ya se encuentra en uso.' }]
      });
    }

    try {
      const created = await categoryRepository.createCategory({
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

  async updateCategory(id, payload) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const existing = await categoryRepository.getCategoryById(categoryId);
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
        const byName = await categoryRepository.getCategoryByName(name);
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
      const updated = await categoryRepository.updateCategory(categoryId, data);
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

    const existing = await categoryRepository.getCategoryById(categoryId);
    if (!existing) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const shouldActivate = Boolean(active);
    if (existing.active === shouldActivate) {
      return sanitizeCategory(existing);
    }

    const updated = await categoryRepository.toggleCategoryActive(categoryId, shouldActivate);
    return sanitizeCategory(updated);
  },

  async removeCategory(id) {
    const categoryId = normalizeId(id);
    if (!categoryId) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    const existing = await categoryRepository.getCategoryById(categoryId);
    if (!existing) {
      throw createError('CATEGORY_NOT_FOUND', 'La categoría indicada no existe.');
    }

    await categoryRepository.removeCategory(categoryId);
    return { deleted: true };
  }
};
