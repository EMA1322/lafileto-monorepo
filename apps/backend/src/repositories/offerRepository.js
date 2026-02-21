// Acceso a ofertas (Prisma directo)
import { prisma } from '../config/prisma.js';
import {
  buildProductOrder,
  buildProductWhere,
  productBaseSelect
} from './productRepository.js';

const offerSelect = {
  id: true,
  productId: true,
  discountPct: true,
  createdAt: true,
  updatedAt: true
};

const offerWithProductSelect = {
  ...offerSelect,
  product: { select: productBaseSelect }
};

export const offerRepository = {
  findById: (id) =>
    prisma.offer.findUnique({
      where: { id },
      select: offerWithProductSelect
    }),

  findByProductId: (productId) =>
    prisma.offer.findUnique({
      where: { productId },
      select: offerWithProductSelect
    }),

  async findActiveByProductId(productId, { now } = {}) {
    if (!productId) return null;
    return prisma.offer.findFirst({
      where: {
        productId,
        ...buildOfferActiveWhere(now)
      },
      select: offerSelect
    });
  },

  async findActiveByProductIds(productIds = [], { now } = {}) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return new Map();
    }
    const rows = await prisma.offer.findMany({
      where: {
        productId: { in: productIds },
        ...buildOfferActiveWhere(now)
      },
      select: offerSelect
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

  async list({
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
    now,
    activeOnly = false
  } = {}) {
    const productWhere = buildProductWhere({ q, status, categoryId, priceMin, priceMax });

    const where = {
      ...(Object.keys(productWhere).length > 0 ? { product: productWhere } : {})
    };

    if (activeOnly) {
      const activeWhere = buildOfferActiveWhere(now);
      where.product = {
        ...(where.product ?? {}),
        ...(activeWhere.product ?? {})
      };
    }

    const order = buildProductOrder(orderBy, orderDirection);

    if (all) {
      const items = await prisma.offer.findMany({
        where,
        orderBy: [{ product: order }, { createdAt: 'desc' }],
        select: offerWithProductSelect
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
        select: offerWithProductSelect
      }),
      prisma.offer.count({ where })
    ]);

    return { items, total };
  },

  create: (data) =>
    prisma.offer.create({
      data,
      select: offerWithProductSelect
    }),

  update: (id, data) =>
    prisma.offer.update({
      where: { id },
      data,
      select: offerWithProductSelect
    }),

  deleteById: (id) => prisma.offer.delete({ where: { id } })
};

export function buildOfferActiveWhere(now = new Date()) {
  void now;
  return {
    product: {
      status: 'ACTIVE'
    }
  };
}
