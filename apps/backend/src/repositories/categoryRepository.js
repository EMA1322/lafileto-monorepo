// Acceso a categorías (Prisma directo)
import { prisma } from '../config/prisma.js';

const baseSelect = {
  id: true,
  name: true,
  imageUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true,
};

const ORDERABLE_FIELDS = new Set(['name', 'createdAt', 'updatedAt']);

export function buildCategoryOrder(orderBy = 'name', orderDirection = 'asc') {
  const field = ORDERABLE_FIELDS.has(orderBy) ? orderBy : 'name';
  const direction = orderDirection === 'desc' ? 'desc' : 'asc';
  return { [field]: direction };
}

export function buildCategoryWhere({ q, status } = {}) {
  const where = {};

  if (status === 'active') {
    where.active = true;
  } else if (status === 'inactive') {
    where.active = false;
  }

  if (typeof q === 'string') {
    const trimmed = q.trim();
    if (trimmed) {
      where.name = {
        contains: trimmed,
        mode: 'insensitive',
      };
    }
  }

  return where;
}

export const categoryRepository = {
  findById: (id) =>
    prisma.category.findUnique({
      where: { id },
      select: baseSelect
    }),

  findByName: (name) =>
    prisma.category.findUnique({
      where: { name },
      select: baseSelect
    }),

  async list({
    page,
    pageSize,
    q,
    status = 'all',
    all = false,
    orderBy,
    orderDirection,
  }) {
    const where = buildCategoryWhere({ q, status });

    const order = buildCategoryOrder(orderBy, orderDirection);

    if (all) {
      const items = await prisma.category.findMany({
        where,
        orderBy: order,
        select: baseSelect
      });
      return { items, total: items.length };
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: order,
        skip,
        take: pageSize,
        select: baseSelect
      }),
      prisma.category.count({ where })
    ]);

    return { items, total };
  },

  create: (data) =>
    prisma.category.create({
      data,
      select: baseSelect
    }),

  update: (id, data) =>
    prisma.category.update({
      where: { id },
      data,
      select: baseSelect
    }),

  deleteById: (id) => prisma.category.delete({ where: { id } })
};
