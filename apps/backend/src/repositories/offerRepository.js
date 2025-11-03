// Acceso a ofertas (Prisma directo)
import { prisma } from '../config/prisma.js';
import {
  buildProductOrder,
  buildProductWhere,
  productBaseSelect
} from './productRepository.js';

function buildActiveOfferWhere(now = new Date()) {
  const reference = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  return {
    AND: [
      {
        OR: [
          { startAt: null },
          { startAt: { lte: reference } }
        ]
      },
      {
        OR: [
          { endAt: null },
          { endAt: { gte: reference } }
        ]
      }
    ]
  };
}

const offerSelect = {
  id: true,
  productId: true,
  discountPct: true,
  startAt: true,
  endAt: true,
  createdAt: true,
  updatedAt: true
};

export const offerRepository = {
  async findActiveByProductId(productId, { now } = {}) {
    if (!productId) return null;
    const reference = now instanceof Date ? now : new Date();
    return prisma.offer.findFirst({
      where: {
        productId,
        ...buildActiveOfferWhere(reference)
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async findActiveByProductIds(productIds = [], { now } = {}) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return new Map();
    }
    const reference = now instanceof Date ? now : new Date();
    const rows = await prisma.offer.findMany({
      where: {
        productId: { in: productIds },
        ...buildActiveOfferWhere(reference)
      }
    });
    const map = new Map();
    for (const row of rows) {
      if (!row?.productId) continue;
      if (!map.has(row.productId)) {
        map.set(row.productId, row);
      }
    }
    return map;
  },

  async listActiveOffers({
    page,
    pageSize,
    q,
    status,
    categoryId,
    priceMin,
    priceMax,
    orderBy,
    orderDirection,
    all = false,
    now
  } = {}) {
    const reference = now instanceof Date ? now : new Date();
    const productWhere = buildProductWhere({ q, status, categoryId, priceMin, priceMax });
    const offerWhere = buildActiveOfferWhere(reference);

    const where = {
      ...offerWhere,
      ...(Object.keys(productWhere).length > 0 ? { product: productWhere } : {})
    };

    const order = buildProductOrder(orderBy, orderDirection);

    if (all) {
      const items = await prisma.offer.findMany({
        where,
        orderBy: [{ product: order }, { createdAt: 'desc' }],
        select: {
          ...offerSelect,
          product: { select: productBaseSelect }
        }
      });
      return { items, total: items.length };
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        orderBy: [{ product: order }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
        select: {
          ...offerSelect,
          product: { select: productBaseSelect }
        }
      }),
      prisma.offer.count({ where })
    ]);

    return { items, total };
  }
};

export function buildOfferActiveWhere(now = new Date()) {
  return buildActiveOfferWhere(now);
}
