// Servicio de ofertas
import { offerRepository } from '../repositories/offerRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { sanitizeProduct } from './productService.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';
import { buildOfferSummary, normalizeDiscountPercent } from '../utils/offers.js';
import { createError } from '../utils/errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;

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

function isUniqueConstraintError(err) {
  return err instanceof PrismaClientKnownRequestError && err.code === 'P2002';
}

function parseDateInput(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'invalid';
  return parsed;
}

function validateDateRange(startAt, endAt) {
  if (startAt instanceof Date && endAt instanceof Date && startAt > endAt) {
    throw createError('VALIDATION_ERROR', 'La fecha de inicio debe ser anterior a la de fin.', {
      fields: [{ path: 'startAt', message: 'La fecha de inicio debe ser anterior a la de fin.' }]
    });
  }
}

async function ensureProductExists(productId) {
  const product = await productRepository.findById(productId);
  if (!product) {
    throw createError('VALIDATION_ERROR', 'El producto indicado no existe.', {
      fields: [{ path: 'productId', message: 'Seleccioná un producto válido.' }]
    });
  }
  return product;
}

function sanitizeOffer(row, { now, productFallback } = {}) {
  if (!row) return null;
  const reference = now instanceof Date ? now : new Date();
  const product = row.product
    ? sanitizeProduct(row.product)
    : productFallback
      ? sanitizeProduct(productFallback)
      : null;

  const summary = buildOfferSummary(row, product?.price ?? 0, { now: reference });
  const discountPercent = normalizeDiscountPercent(row.discountPct ?? row.discountPercent);

  return {
    id: row.id,
    productId: row.productId,
    discountPercent: discountPercent ?? null,
    startAt: row.startAt ?? null,
    endAt: row.endAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isActive: summary?.isActive ?? false,
    finalPrice: summary?.finalPrice ?? product?.price,
    product: product ?? undefined
  };
}

function normalizeOrderBy(value) {
  if (typeof value !== 'string') return 'name';
  const trimmed = value.trim();
  if (!trimmed) return 'name';
  const normalized = trimmed.toLowerCase();
  if (normalized === 'price') return 'price';
  if (normalized === 'updatedat' || normalized === 'updated_at') return 'updatedAt';
  return 'name';
}

function normalizeOrderDirection(value) {
  if (typeof value !== 'string') return 'asc';
  const normalized = value.trim().toLowerCase();
  return normalized === 'desc' ? 'desc' : 'asc';
}

export const offerService = {
  async listOffers({
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
    activeOnly
  } = {}) {
    const normalizedPage = normalizePage(page, { defaultValue: DEFAULT_PAGE });
    const normalizedPageSize = normalizePageSize(pageSize, {
      defaultValue: DEFAULT_PAGE_SIZE,
      min: MIN_PAGE_SIZE,
      max: MAX_PAGE_SIZE
    });
    const normalizedAll = Boolean(all);
    const orderField = normalizeOrderBy(orderBy);
    const direction = normalizeOrderDirection(orderDir ?? orderDirection);

    const min = Number(priceMin);
    const max = Number(priceMax);
    const normalizedCategoryId = typeof categoryId === 'string' ? categoryId.trim() : '';
    const filters = {
      q: typeof q === 'string' && q.trim().length > 0 ? q.trim() : undefined,
      status,
      categoryId: normalizedCategoryId || undefined,
      priceMin: Number.isFinite(min) ? min : undefined,
      priceMax: Number.isFinite(max) ? max : undefined
    };

    const referenceNow = new Date();

    const { items, total } = await offerRepository.list({
      page: normalizedAll ? DEFAULT_PAGE : normalizedPage,
      pageSize: normalizedAll ? MAX_PAGE_SIZE : normalizedPageSize,
      ...filters,
      orderBy: orderField,
      orderDirection: direction,
      all: normalizedAll,
      now: referenceNow,
      activeOnly: Boolean(activeOnly)
    });

    const sanitized = items.map((item) => sanitizeOffer(item, { now: referenceNow }));
    const effectiveTotal = Number.isFinite(total) ? total : sanitized.length;
    const pageCount = Math.max(1, Math.ceil(effectiveTotal / normalizedPageSize));

    return {
      items: sanitized,
      meta: {
        page: normalizedAll ? 1 : normalizedPage,
        pageSize: normalizedPageSize,
        total: effectiveTotal,
        pageCount
      }
    };
  },

  async createOffer(payload) {
    const productId = typeof payload.productId === 'string' ? payload.productId.trim() : '';
    const discountPercent = normalizeDiscountPercent(payload.discountPercent ?? payload.discountPct);
    const startAtInput = parseDateInput(payload.startAt);
    const endAtInput = parseDateInput(payload.endAt);

    if (!productId || !discountPercent) {
      throw createError('VALIDATION_ERROR', 'Datos incompletos para crear la oferta.', {
        fields: [
          ...(productId ? [] : [{ path: 'productId', message: 'Seleccioná un producto.' }]),
          ...(discountPercent ? [] : [{ path: 'discountPercent', message: 'Descuento inválido (1-100).' }])
        ]
      });
    }

    if (startAtInput === 'invalid') {
      throw createError('VALIDATION_ERROR', 'Fecha de inicio inválida.', {
        fields: [{ path: 'startAt', message: 'Usá un formato de fecha válido.' }]
      });
    }

    if (endAtInput === 'invalid') {
      throw createError('VALIDATION_ERROR', 'Fecha de fin inválida.', {
        fields: [{ path: 'endAt', message: 'Usá un formato de fecha válido.' }]
      });
    }

    validateDateRange(startAtInput ?? null, endAtInput ?? null);

    const product = await ensureProductExists(productId);

    try {
      const created = await offerRepository.create({
        productId,
        discountPct: discountPercent,
        startAt: startAtInput ?? null,
        endAt: endAtInput ?? null
      });
      return sanitizeOffer(created, { now: new Date(), productFallback: product });
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw createError('CONFLICT', 'El producto ya tiene una oferta.', {
          fields: [{ path: 'productId', message: 'El producto ya tiene una oferta cargada.' }]
        });
      }
      throw err;
    }
  },

  async updateOffer(id, payload = {}) {
    const offerId = typeof id === 'string' ? id.trim() : '';
    if (!offerId) {
      throw createError('RESOURCE_NOT_FOUND', 'La oferta indicada no existe.');
    }

    const existing = await offerRepository.findById(offerId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'La oferta indicada no existe.');
    }

    const data = {};

    if (payload.discountPercent !== undefined || payload.discountPct !== undefined) {
      const discountPercent = normalizeDiscountPercent(
        payload.discountPercent ?? payload.discountPct
      );
      if (!discountPercent) {
        throw createError('VALIDATION_ERROR', 'Descuento inválido (1-100).', {
          fields: [{ path: 'discountPercent', message: 'El descuento debe ser un entero entre 1 y 100.' }]
        });
      }
      data.discountPct = discountPercent;
    }

    const startAtInput = parseDateInput(payload.startAt);
    if (startAtInput !== undefined) {
      if (startAtInput === 'invalid') {
        throw createError('VALIDATION_ERROR', 'Fecha de inicio inválida.', {
          fields: [{ path: 'startAt', message: 'Usá un formato de fecha válido.' }]
        });
      }
      data.startAt = startAtInput;
    }

    const endAtInput = parseDateInput(payload.endAt);
    if (endAtInput !== undefined) {
      if (endAtInput === 'invalid') {
        throw createError('VALIDATION_ERROR', 'Fecha de fin inválida.', {
          fields: [{ path: 'endAt', message: 'Usá un formato de fecha válido.' }]
        });
      }
      data.endAt = endAtInput;
    }

    const effectiveStart = data.startAt === undefined ? existing.startAt : data.startAt;
    const effectiveEnd = data.endAt === undefined ? existing.endAt : data.endAt;
    validateDateRange(effectiveStart, effectiveEnd);

    if (Object.keys(data).length === 0) {
      return sanitizeOffer(existing, { now: new Date() });
    }

    const updated = await offerRepository.update(offerId, data);
    return sanitizeOffer(updated, { now: new Date() });
  },

  async removeOffer(id) {
    const offerId = typeof id === 'string' ? id.trim() : '';
    if (!offerId) {
      throw createError('RESOURCE_NOT_FOUND', 'La oferta indicada no existe.');
    }

    const existing = await offerRepository.findById(offerId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'La oferta indicada no existe.');
    }

    await offerRepository.deleteById(offerId);
    return { id: offerId, deleted: true };
  }
};
