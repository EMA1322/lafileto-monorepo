// Servicio de ofertas activas
import { offerRepository } from '../repositories/offerRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { sanitizeProduct } from './productService.js';
import { normalizePage, normalizePageSize } from '../utils/pagination.js';
import { buildOfferSummary } from '../utils/offers.js';
import { createError } from '../utils/errors.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 100;

function normalizeDiscount(discount) {
  if (discount === undefined || discount === null) return undefined;
  const num = Number(discount);
  if (!Number.isFinite(num)) return undefined;
  const clamped = Math.max(0, Math.min(100, num));
  return Math.round(clamped);
}

function buildOfferData({ productId, discountPercent, startsAt, endsAt }) {
  const data = {};
  if (productId !== undefined) {
    data.productId = productId;
  }
  if (discountPercent !== undefined) {
    const normalized = normalizeDiscount(discountPercent);
    if (normalized === undefined) {
      throw createError('VALIDATION_ERROR', 'El descuento es inválido.', {
        fields: [{ path: 'discountPercent', message: 'Ingresá un porcentaje válido (0 a 100).' }]
      });
    }
    data.discountPct = normalized;
  }
  if (startsAt !== undefined) {
    data.startAt = startsAt;
  }
  if (endsAt !== undefined) {
    data.endAt = endsAt;
  }
  return data;
}

function buildOfferResponse(productRow, offerRow, { now } = {}) {
  const sanitized = sanitizeProduct(productRow);
  if (!sanitized) {
    throw createError('INTERNAL_ERROR', 'No se pudo obtener el producto asociado a la oferta.');
  }
  const reference = now instanceof Date ? now : new Date();
  return {
    ...sanitized,
    offer: buildOfferSummary(offerRow ?? null, sanitized.price ?? 0, { now: reference })
  };
}

async function ensureProduct(productId) {
  const normalizedId = typeof productId === 'string' ? productId.trim() : '';
  if (!normalizedId) {
    throw createError('VALIDATION_ERROR', 'El producto es obligatorio.', {
      fields: [{ path: 'productId', message: 'Seleccioná un producto válido.' }]
    });
  }
  const product = await productRepository.findById(normalizedId);
  if (!product) {
    throw createError('VALIDATION_ERROR', 'El producto indicado no existe.', {
      fields: [{ path: 'productId', message: 'Seleccioná un producto válido.' }]
    });
  }
  return product;
}

export const offerService = {
  async listActiveOffers({
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
    all
  } = {}) {
    const normalizedPage = normalizePage(page, { defaultValue: DEFAULT_PAGE });
    const normalizedPageSize = normalizePageSize(pageSize, {
      defaultValue: DEFAULT_PAGE_SIZE,
      min: MIN_PAGE_SIZE,
      max: MAX_PAGE_SIZE
    });
    const normalizedAll = Boolean(all);
    const orderField = orderBy || 'name';
    const direction = orderDir ?? orderDirection ?? 'asc';

    const referenceNow = new Date();

    const repoParams = {
      page: normalizedAll ? DEFAULT_PAGE : normalizedPage,
      pageSize: normalizedAll ? MAX_PAGE_SIZE : normalizedPageSize,
      q,
      status,
      categoryId,
      priceMin,
      priceMax,
      orderBy: orderField,
      orderDirection: direction,
      all: normalizedAll,
      now: referenceNow
    };

    const { items, total } = await offerRepository.listActiveOffers(repoParams);

    const enriched = items.map((row) => {
      const product = sanitizeProduct(row.product);
      return {
        ...product,
        offer: buildOfferSummary(row, product?.price ?? 0, { now: referenceNow })
      };
    });

    const effectiveTotal = Number.isFinite(total) ? total : enriched.length;
    const pageCount = Math.max(1, Math.ceil(effectiveTotal / normalizedPageSize));

    return {
      items: enriched,
      meta: {
        page: normalizedAll ? 1 : normalizedPage,
        pageSize: normalizedPageSize,
        total: effectiveTotal,
        pageCount
      }
    };
  },

  async createOffer(payload = {}) {
    const product = await ensureProduct(payload.productId);

    const existing = await offerRepository.findByProductId(product.id);
    if (existing) {
      throw createError('RESOURCE_CONFLICT', 'El producto ya tiene una oferta activa.', {
        fields: [{ path: 'productId', message: 'El producto seleccionado ya tiene una oferta activa.' }]
      });
    }

    const referenceNow = new Date();
    const data = buildOfferData({
      productId: product.id,
      discountPercent: payload.discountPercent,
      startsAt: payload.startsAt ?? null,
      endsAt: payload.endsAt ?? null
    });

    const created = await offerRepository.create(data);
    const productRow = created.product ?? product;
    return buildOfferResponse(productRow, created, { now: referenceNow });
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

    let targetProductRow = existing.product;
    let targetProductId = existing.productId;

    if (payload.productId !== undefined && payload.productId !== existing.productId) {
      const newProduct = await ensureProduct(payload.productId);
      const conflict = await offerRepository.findByProductId(newProduct.id);
      if (conflict && conflict.id !== offerId) {
        throw createError('RESOURCE_CONFLICT', 'El producto seleccionado ya tiene una oferta activa.', {
          fields: [{ path: 'productId', message: 'El producto seleccionado ya tiene una oferta activa.' }]
        });
      }
      targetProductRow = newProduct;
      targetProductId = newProduct.id;
    } else if (!targetProductRow) {
      targetProductRow = await productRepository.findById(targetProductId);
    }

    const data = buildOfferData({
      productId: payload.productId !== undefined ? targetProductId : undefined,
      discountPercent: payload.discountPercent,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt
    });

    if (Object.keys(data).length === 0) {
      const referenceNow = new Date();
      return buildOfferResponse(targetProductRow, existing, { now: referenceNow });
    }

    const updated = await offerRepository.update(offerId, data);
    const referenceNow = new Date();
    const productRow = updated.product ?? targetProductRow;
    return buildOfferResponse(productRow, updated, { now: referenceNow });
  },

  async deleteOffer(id) {
    const offerId = typeof id === 'string' ? id.trim() : '';
    if (!offerId) {
      throw createError('RESOURCE_NOT_FOUND', 'La oferta indicada no existe.');
    }

    const existing = await offerRepository.findById(offerId);
    if (!existing) {
      throw createError('RESOURCE_NOT_FOUND', 'La oferta indicada no existe.');
    }

    const deleted = await offerRepository.delete(offerId);
    const referenceNow = new Date();
    const productRow = deleted.product ?? existing.product ?? (await productRepository.findById(existing.productId));
    return buildOfferResponse(productRow, null, { now: referenceNow });
  }
};
