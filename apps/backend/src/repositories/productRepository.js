// Acceso a productos (Prisma directo)
import { prisma } from '../config/prisma.js';

export const productBaseSelect = {
  id: true,
  name: true,
  description: true,
  imageUrl: true,
  price: true,
  stock: true,
  status: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true
};

const ORDERABLE_FIELDS = new Set(['name', 'price', 'updatedAt']);

const STATUS_MAP = new Map([
  ['draft', 'DRAFT'],
  ['active', 'ACTIVE'],
  ['archived', 'ARCHIVED']
]);

function normalizeStatus(status) {
  if (!status || status === 'all') return undefined;
  const lookup = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (lookup === 'inactive') {
    return { in: ['DRAFT', 'ARCHIVED'] };
  }
  return STATUS_MAP.get(lookup);
}

function toDecimal(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return undefined;
}

export function buildProductOrder(orderBy = 'name', orderDirection = 'asc') {
  const field = ORDERABLE_FIELDS.has(orderBy) ? orderBy : 'name';
  const direction = orderDirection === 'desc' ? 'desc' : 'asc';
  return { [field]: direction };
}

export function buildProductWhere({ q, status, categoryId, priceMin, priceMax, hasOffer } = {}) {
  const where = {};

  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus) {
    where.status = normalizedStatus;
  }

  if (typeof categoryId === 'string' && categoryId.trim().length > 0) {
    where.categoryId = categoryId.trim();
  }

  const priceFilter = {};
  if (priceMin !== undefined && priceMin !== null) {
    const decimal = toDecimal(priceMin);
    if (decimal !== undefined) {
      priceFilter.gte = decimal;
    }
  }
  if (priceMax !== undefined && priceMax !== null) {
    const decimal = toDecimal(priceMax);
    if (decimal !== undefined) {
      priceFilter.lte = decimal;
    }
  }
  if (Object.keys(priceFilter).length > 0) {
    where.price = priceFilter;
  }

  if (hasOffer === true) {
    where.offer = { isNot: null };
  } else if (hasOffer === false) {
    where.offer = { is: null };
  }

  const normalizedQuery = typeof q === 'string' ? q.trim() : '';
  if (normalizedQuery) {
    where.OR = [
      { name: { contains: normalizedQuery } },
      { description: { contains: normalizedQuery } }
    ];
  }

  return where;
}

export const productRepository = {
  findById: (id) =>
    prisma.product.findUnique({
      where: { id },
      select: productBaseSelect
    }),

  async countByCategoryIds(categoryIds = []) {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return new Map();
    }

    const rows = await prisma.product.groupBy({
      by: ['categoryId'],
      where: {
        categoryId: {
          in: categoryIds
        }
      },
      _count: {
        _all: true
      }
    });

    return new Map(rows.map((row) => [row.categoryId, row._count?._all ?? 0]));
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
    hasOffer
  }) {
    const where = buildProductWhere({ q, status, categoryId, priceMin, priceMax, hasOffer });
    const order = buildProductOrder(orderBy, orderDirection);

    if (all) {
      const items = await prisma.product.findMany({
        where,
        orderBy: order,
        select: productBaseSelect
      });
      return { items, total: items.length };
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: order,
        skip,
        take: pageSize,
        select: productBaseSelect
      }),
      prisma.product.count({ where })
    ]);

    return { items, total };
  },

  create: (data) =>
    prisma.product.create({
      data,
      select: productBaseSelect
    }),

  update: (id, data) =>
    prisma.product.update({
      where: { id },
      data,
      select: productBaseSelect
    }),

  updateStatus: (id, status) =>
    prisma.product.update({
      where: { id },
      data: { status },
      select: productBaseSelect
    }),

  deleteById: (id) => prisma.product.delete({ where: { id } })
};
