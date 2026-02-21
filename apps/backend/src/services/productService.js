// Servicio de productos: listados, detalle y mutaciones
import { productRepository } from '../repositories/productRepository.js';
import { offerRepository } from '../repositories/offerRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { createError } from '../utils/errors.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';
import { buildOfferSummary, isOfferActive } from '../utils/offers.js';

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

const ALLOWED_STATUS_FILTERS = new Set(['all', 'draft', 'active', 'archived', 'inactive']);
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

function sanitizeImageUrl(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
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
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    price: toNumber(row.price),
    stock: row.stock,
    status,
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
      offer: null
    }));
  }

  const ids = list.map((item) => item?.id).filter((id) => typeof id === 'string' && id.length > 0);
  const offersMap = await offerRepository.findActiveByProductIds(ids, { now: reference });

  return list.map((product) => ({
    ...product,
    offer: (() => {
      const offer = offersMap.get(product.id);
      const summary = buildOfferSummary(
        {
          ...offer,
          productStatus: product.status
        },
        product.price,
        { now: reference }
      );
      const isActive = isOfferActive({ ...offer, productStatus: product.status }, reference);
      return isActive && summary ? { ...summary, isActive } : null;
    })()
  }));
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
    priceMin,
    priceMax,
    orderBy,
    orderDir,
    orderDirection,
    all,
    hasOffer
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
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined,
      hasOffer: typeof hasOffer === 'boolean' ? hasOffer : undefined
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
      offer: (() => {
        const offerForState = {
          ...activeOffer,
          productStatus: sanitized?.status
        };
        const summary = buildOfferSummary(offerForState, sanitized?.price ?? 0, { now: referenceNow });
        const isActive = isOfferActive(offerForState, referenceNow);
        return isActive && summary ? { ...summary, isActive } : null;
      })()
    };
  },

  async createProduct(payload) {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const description = sanitizeDescription(payload.description);
    const imageUrl = sanitizeImageUrl(payload.imageUrl);
    const price = toPriceInput(payload.price);
    const stock = Number(payload.stock ?? 0);
    const statusInput = normalizeStatusInput(payload.status, { required: false }) ?? 'DRAFT';
    const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';

    if (!name || price === undefined || !categoryId) {
      throw createError('VALIDATION_ERROR', 'Datos incompletos para crear el producto.', {
        fields: [
          ...(name ? [] : [{ path: 'name', message: 'El nombre es obligatorio.' }]),
          ...(price !== undefined ? [] : [{ path: 'price', message: 'El precio es obligatorio.' }]),
          ...(categoryId ? [] : [{ path: 'categoryId', message: 'La categoría es obligatoria.' }])
        ]
      });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw createError('VALIDATION_ERROR', 'El stock es inválido.', {
        fields: [{ path: 'stock', message: 'El stock debe ser un entero mayor o igual a 0.' }]
      });
    }

    await ensureCategoryExists(categoryId);

    const created = await productRepository.create({
      name,
      description,
      imageUrl: imageUrl ?? null,
      price,
      stock,
      status: statusInput,
      categoryId
    });
    return sanitizeProduct(created);
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

    if (payload.description !== undefined) {
      data.description = sanitizeDescription(payload.description);
    }

    if (payload.imageUrl !== undefined) {
      data.imageUrl = sanitizeImageUrl(payload.imageUrl);
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

    const updated = await productRepository.update(productId, data);
    return sanitizeProduct(updated);
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
