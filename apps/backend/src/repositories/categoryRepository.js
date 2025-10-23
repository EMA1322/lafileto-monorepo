// Acceso a categorías (Prisma directo)
import { prisma } from '../config/prisma.js';

const baseSelect = {
  id: true,
  name: true,
  imageUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true
};

function buildOrder(orderBy = 'name', orderDirection = 'asc') {
  const allowedFields = new Set(['name', 'createdAt']);
  const field = allowedFields.has(orderBy) ? orderBy : 'name';
  const direction = orderDirection === 'desc' ? 'desc' : 'asc';
  return { [field]: direction };
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

  async list({ page, pageSize, search, all = false, orderBy, orderDirection }) {
    const where = {
      active: true,
      ...(search
        ? {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        : undefined)
    };

    const order = buildOrder(orderBy, orderDirection);

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
