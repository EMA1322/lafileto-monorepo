// Category repository: thin Prisma wrapper
import { prisma } from '../config/prisma.js';

const baseSelect = {
  id: true,
  name: true,
  imageUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true
};

function buildOrder(orderBy = 'name', orderDir = 'asc') {
  const allowedFields = new Set(['name', 'createdAt']);
  const field = allowedFields.has(orderBy) ? orderBy : 'name';
  const direction = orderDir === 'desc' ? 'desc' : 'asc';
  return { [field]: direction };
}

function buildWhere({ q, status }) {
  const where = {};

  if (status === 'active') {
    where.active = true;
  } else if (status === 'inactive') {
    where.active = false;
  }

  if (q) {
    where.name = {
      contains: q,
      mode: 'insensitive'
    };
  }

  return where;
}

export const categoryRepository = {
  getCategoryById: (id) =>
    prisma.category.findUnique({
      where: { id },
      select: baseSelect
    }),

  getCategoryByName: (name) =>
    prisma.category.findUnique({
      where: { name },
      select: baseSelect
    }),

  async listCategories({ q, status, orderBy, orderDir, page, pageSize }) {
    const where = buildWhere({ q, status });
    const order = buildOrder(orderBy, orderDir);
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

  createCategory: (data) =>
    prisma.category.create({
      data,
      select: baseSelect
    }),

  updateCategory: (id, data) =>
    prisma.category.update({
      where: { id },
      data,
      select: baseSelect
    }),

  toggleCategoryActive: (id, active) =>
    prisma.category.update({
      where: { id },
      data: { active },
      select: baseSelect
    }),

  removeCategory: (id) => prisma.category.delete({ where: { id } })
};
