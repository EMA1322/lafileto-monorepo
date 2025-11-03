// Servicio de productos: listados, detalle y mutaciones
import { productRepository } from '../repositories/productRepository.js';
import { offerRepository } from '../repositories/offerRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { createError } from '../utils/errors.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';
import { buildOfferSummary } from '../utils/offers.js';

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
const DEFAULT_ORDER_BY = 'name';

const STATUS_INPUT_MAP = new Map([
  ['draft', 'DRAFT'],
  ['active', 'ACTIVE'],
  ['archived', 'ARCHIVED']
]);

const ALLOWED_STATUS_FILTERS = new Set(['all', 'draft', 'active', 'archived']);
const ALLOWED_ORDER_FIELDS = new Set(['name', 'price', 'updatedAt']);

function normalizeOrderBy(value) {
  if (typeof value !== 'string') return DEFAULT_ORDER_BY;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_ORDER_BY;

  const lower = trimmed.toLowerCase();
  if (ALLOWED_ORDER_FIELDS.has(trimmed)) return trimmed;
  if (ALLOWED_ORDER_FIELDS.has(lower)) return lower;
  if (lower === 'updateat' || lower === 'update_at') return 'updatedAt';
  return DEFAULT_ORDER_BY;
}

function normalizeOrderDirection(value) {
  if (typeof value !== 'string') return 'asc';
  const normalized = value.trim().toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}

function normalizeStatusFilter(value) {
  if (typeof value !== 'string') return 'all';
  const trimmed = value.trim().toLowerCase();
  return ALLOWED_STATUS_FILTERS.has(trimmed) ? trimmed : 'all';
}

function normalizeStatusInput(value, { required = true } = {}) {
  if (value === undefined || value === null) {
    return required ? null : undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return required ? null : undefined;
  }
  return STATUS_INPUT_MAP.get(normalized) || null;
}

function sanitizeDescription(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function sanitizeProduct(row) {
  if (!row) return null;
  const toNumber = (value) => {
    if (typeof value === 'number') return Math.round(value * 100) / 100;
    if (value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
  };

  const status = typeof row.status === 'string' ? row.status.toLowerCase() : row.status;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description ?? null,
    price: toNumber(row.price),
    currency: row.currency,
    stock: row.stock,
    status,
    isFeatured: !!row.isFeatured,
    categoryId: row.categoryId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function attachActiveOfferSummaries(products, { now } = {}) {
  const reference = now instanceof Date ? now : new Date();
  const list = Array.isArray(products) ? products : [];
  if (list.length === 0) {
    return list.map((product) => ({
      ...product,
      offer: buildOfferSummary(null, product?.price ?? 0, { now: reference })
    }));
  }

  const ids = list.map((item) => item?.id).filter((id) => typeof id === 'string' && id.length > 0);
  const offersMap = await offerRepository.findActiveByProductIds(ids, { now: reference });

  return list.map((product) => ({
    ...product,
    offer: buildOfferSummary(offersMap.get(product.id), product.price, { now: reference })
  }));
}

function isUniqueConstraintError(err) {
  return err instanceof PrismaClientKnownRequestError && err.code === 'P2002';
}

function buildUniqueConflictError(target = []) {
  const targets = Array.isArray(target) ? target : [target];
  if (targets.includes('slug') || targets.includes('Product_slug_key')) {
    return createError('RESOURCE_CONFLICT', 'El slug ya está en uso.', {
      fields: [{ path: 'slug', message: 'El slug ya se encuentra en uso.' }]
    });
  }
  if (targets.includes('sku') || targets.includes('Product_sku_key')) {
    return createError('RESOURCE_CONFLICT', 'El SKU ya está en uso.', {
      fields: [{ path: 'sku', message: 'El SKU ya se encuentra en uso.' }]
    });
  }
  return createError('RESOURCE_CONFLICT', 'Ya existe un producto con los mismos datos.');
}

async function ensureCategoryExists(categoryId) {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw createError('VALIDATION_ERROR', 'La categoría indicada no existe.', {
      fields: [{ path: 'categoryId', message: 'Seleccioná una categoría válida.' }]
    });
  }
}

function toPriceInput(value) {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num.toFixed(2);
}

export const productService = {
  async listProducts({
    page,
    pageSize,
    q,
    status,
    categoryId,
    isFeatured,
    priceMin,
    priceMax,
    orderBy,
    orderDir,
    orderDirection,
    all
  } = {}) {
    const normalizedSearch = typeof q === 'string' ? q.trim() : '';
    const normalizedStatus = normalizeStatusFilter(status);
    const orderField = normalizeOrderBy(orderBy);
    const direction = normalizeOrderDirection(orderDir ?? orderDirection);
    const normalizedAll = Boolean(all);

    const normalizedPage = normalizePage(page, { defaultValue: DEFAULT_PAGE });
    const normalizedPageSize = normalizePageSize(pageSize, {
      defaultValue: DEFAULT_PAGE_SIZE,
      min: MIN_PAGE_SIZE,
      max: MAX_PAGE_SIZE
    });

    const min = Number(priceMin);
    const max = Number(priceMax);
    const normalizedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : '';
    const filters = {
      q: normalizedSearch || undefined,
      status: normalizedStatus,
      categoryId: normalizedCategoryId.length > 0 ? normalizedCategoryId : undefined,
      isFeatured: typeof isFeatured === 'boolean' ? isFeatured : undefined,
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined
    };

    const referenceNow = new Date();

    if (normalizedAll) {
      const { items, total } = await productRepository.list({
        page: DEFAULT_PAGE,
        pageSize: MAX_PAGE_SIZE,
        ...filters,
        orderBy: orderField,
        orderDirection: direction,
        all: true
      });
      const sanitized = items.map(sanitizeProduct);
      const enriched = await attachActiveOfferSummaries(sanitized, { now: referenceNow });
      const effectiveTotal = Number.isFinite(total) ? total : sanitized.length;
      const pageCount = Math.max(1, Math.ceil(effectiveTotal / normalizedPageSize));
      return {
        items: enriched,
        meta: {
          page: 1,
          pageSize: normalizedPageSize,
          total: effectiveTotal,
          pageCount
        }
      };
    }

    const { items, total } = await productRepository.list({
      page: normalizedPage,
      pageSize: normalizedPageSize,
      ...filters,
      orderBy: orderField,
      orderDirection: direction,
      all: false
    });

    const safeTotal = Number.isFinite(total) ? total : items.length;
    const pageCount = Math.max(1, Math.ceil(safeTotal / normalizedPageSize));

    const sanitizedItems = items.map(sanitizeProduct);
    const enrichedItems = await attachActiveOfferSummaries(sanitizedItems, { now: referenceNow });

    return {
      items: enrichedItems,
      meta: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total: safeTotal,
        pageCount
      }
    };
  },

  async getProduct(id) {
    const productId = typeof id === 'string' ? id.trim() : '';
    if (!productId) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const product = await productRepository.findById(productId);
    if (!product) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const sanitized = sanitizeProduct(product);
    const referenceNow = new Date();
    const activeOffer = await offerRepository.findActiveByProductId(productId, { now: referenceNow });
    return {
      ...sanitized,
      offer: buildOfferSummary(activeOffer, sanitized?.price ?? 0, { now: referenceNow })
    };
  },

  async createProduct(payload) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const slug = typeof payload.slug === 'string' ? payload.slug.trim().toLowerCase() : '';
    const sku = typeof payload.sku === 'string' ? payload.sku.trim().toUpperCase() : '';
    const description = sanitizeDescription(payload.description);
    const price = toPriceInput(payload.price);
    const stock = Number(payload.stock ?? 0);
    const statusInput = normalizeStatusInput(payload.status, { required: false }) ?? 'DRAFT';
    const isFeatured = !!payload.isFeatured;
    const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
    const currency = 'ARS';

    if (!name || !slug || !sku || price === undefined || !categoryId) {
      throw createError('VALIDATION_ERROR', 'Datos incompletos para crear el producto.', {
        fields: [
          ...(name ? [] : [{ path: 'name', message: 'El nombre es obligatorio.' }]),
          ...(slug ? [] : [{ path: 'slug', message: 'El slug es obligatorio.' }]),
          ...(sku ? [] : [{ path: 'sku', message: 'El SKU es obligatorio.' }]),
          ...(price !== undefined ? [] : [{ path: 'price', message: 'El precio es obligatorio.' }]),
          ...(categoryId ? [] : [{ path: 'categoryId', message: 'La categoría es obligatoria.' }])
        ]
      });
    }

    await ensureCategoryExists(categoryId);

    const existingSlug = await productRepository.findBySlug(slug);
    if (existingSlug) {
      throw createError('RESOURCE_CONFLICT', 'El slug ya está en uso.', {
        fields: [{ path: 'slug', message: 'El slug ya se encuentra en uso.' }]
      });
    }

    const existingSku = await productRepository.findBySku(sku);
    if (existingSku) {
      throw createError('RESOURCE_CONFLICT', 'El SKU ya está en uso.', {
        fields: [{ path: 'sku', message: 'El SKU ya se encuentra en uso.' }]
      });
    }

    try {
      const created = await productRepository.create({
        name,
        slug,
        sku,
        description,
        price,
        currency,
        stock,
        status: statusInput,
        isFeatured,
        categoryId
      });
      return sanitizeProduct(created);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw buildUniqueConflictError(err?.meta?.target);
      }
      throw err;
    }
  },

  async updateProduct(id, payload = {}) {
    const productId = typeof id === 'string' ? id.trim() : '';
    if (!productId) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const existing = await productRepository.findById(productId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const data = {};

    if (payload.name !== undefined) {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        throw createError('VALIDATION_ERROR', 'El nombre es obligatorio.', {
          fields: [{ path: 'name', message: 'El nombre es obligatorio.' }]
        });
      }
      data.name = name;
    }

    if (payload.slug !== undefined) {
      const slug = typeof payload.slug === 'string' ? payload.slug.trim().toLowerCase() : '';
      if (!slug) {
        throw createError('VALIDATION_ERROR', 'El slug es obligatorio.', {
          fields: [{ path: 'slug', message: 'El slug es obligatorio.' }]
        });
      }
      if (slug !== existing.slug) {
        const conflict = await productRepository.findBySlug(slug);
        if (conflict && conflict.id !== productId) {
          throw createError('RESOURCE_CONFLICT', 'El slug ya está en uso.', {
            fields: [{ path: 'slug', message: 'El slug ya se encuentra en uso.' }]
          });
        }
      }
      data.slug = slug;
    }

    if (payload.sku !== undefined) {
      const sku = typeof payload.sku === 'string' ? payload.sku.trim().toUpperCase() : '';
      if (!sku) {
        throw createError('VALIDATION_ERROR', 'El SKU es obligatorio.', {
          fields: [{ path: 'sku', message: 'El SKU es obligatorio.' }]
        });
      }
      if (sku !== existing.sku) {
        const conflict = await productRepository.findBySku(sku);
        if (conflict && conflict.id !== productId) {
          throw createError('RESOURCE_CONFLICT', 'El SKU ya está en uso.', {
            fields: [{ path: 'sku', message: 'El SKU ya se encuentra en uso.' }]
          });
        }
      }
      data.sku = sku;
    }

    if (payload.description !== undefined) {
      data.description = sanitizeDescription(payload.description);
    }

    if (payload.price !== undefined) {
      const price = toPriceInput(payload.price);
      if (price === undefined) {
        throw createError('VALIDATION_ERROR', 'El precio es inválido.', {
          fields: [{ path: 'price', message: 'El precio debe ser numérico.' }]
        });
      }
      data.price = price;
    }

    if (payload.currency !== undefined) {
      const currency = String(payload.currency || '').trim().toUpperCase();
      if (currency !== 'ARS') {
        throw createError('VALIDATION_ERROR', 'La moneda es inválida.', {
          fields: [{ path: 'currency', message: 'Sólo se permite ARS.' }]
        });
      }
      data.currency = currency;
    }

    if (payload.stock !== undefined) {
      const stock = Number(payload.stock);
      if (!Number.isInteger(stock) || stock < 0) {
        throw createError('VALIDATION_ERROR', 'El stock es inválido.', {
          fields: [{ path: 'stock', message: 'El stock debe ser un entero mayor o igual a 0.' }]
        });
      }
      data.stock = stock;
    }

    if (payload.status !== undefined) {
      const statusInput = normalizeStatusInput(payload.status, { required: true });
      if (!statusInput) {
        throw createError('VALIDATION_ERROR', 'El estado es inválido.', {
          fields: [{ path: 'status', message: 'Estado inválido.' }]
        });
      }
      data.status = statusInput;
    }

    if (payload.isFeatured !== undefined) {
      data.isFeatured = !!payload.isFeatured;
    }

    if (payload.categoryId !== undefined) {
      const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
      if (!categoryId) {
        throw createError('VALIDATION_ERROR', 'La categoría es obligatoria.', {
          fields: [{ path: 'categoryId', message: 'Seleccioná una categoría válida.' }]
        });
      }
      await ensureCategoryExists(categoryId);
      data.categoryId = categoryId;
    }

    if (Object.keys(data).length === 0) {
      return sanitizeProduct(existing);
    }

    try {
      const updated = await productRepository.update(productId, data);
      return sanitizeProduct(updated);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw buildUniqueConflictError(err?.meta?.target);
      }
      throw err;
    }
  },

  async changeProductStatus(id, status) {
    const productId = typeof id === 'string' ? id.trim() : '';
    if (!productId) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const existing = await productRepository.findById(productId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const statusInput = normalizeStatusInput(status, { required: true });
    if (!statusInput) {
      throw createError('VALIDATION_ERROR', 'El estado es inválido.', {
        fields: [{ path: 'status', message: 'Estado inválido.' }]
      });
    }

    if (statusInput === existing.status) {
      return sanitizeProduct(existing);
    }

    const updated = await productRepository.updateStatus(productId, statusInput);
    return sanitizeProduct(updated);
  },

  async deleteProduct(id) {
    const productId = typeof id === 'string' ? id.trim() : '';
    if (!productId) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    const existing = await productRepository.findById(productId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'El producto indicado no existe.');
    }

    await productRepository.deleteById(productId);
    return { id: productId, deleted: true };
  }
};
