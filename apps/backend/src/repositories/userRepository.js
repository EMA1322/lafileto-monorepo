// Acceso a usuarios (Prisma directo)
import { prisma } from '../config/prisma.js';

const baseSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  roleId: true,
  status: true
};

export const userRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  findById: (id) => prisma.user.findUnique({ where: { id } }),

  findByIdForSession: (id) =>
    prisma.user.findUnique({
      where: { id },
      select: baseSelect
    }),

  async list({ page, pageSize, q, orderBy = 'fullName', orderDirection = 'asc', all = false }) {
    const query = typeof q === 'string' ? q.trim() : '';
    const where = query
      ? {
          OR: [
            { fullName: { contains: query } },
            { email: { contains: query } }
          ]
        }
      : undefined;

    const direction = orderDirection === 'desc' ? 'desc' : 'asc';
    const field = ['id', 'fullName', 'email', 'status'].includes(orderBy)
      ? orderBy
      : 'fullName';
    const order = { [field]: direction };

    if (all) {
      const items = await prisma.user.findMany({
        where,
        orderBy: order,
        select: baseSelect
      });
      return { items, total: items.length };
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: order,
        skip,
        take: pageSize,
        select: baseSelect
      }),
      prisma.user.count({ where })
    ]);

    return { items, total };
  },

  create: (payload) => prisma.user.create({ data: payload }),

  update: (id, payload) =>
    prisma.user.update({
      where: { id },
      data: payload,
      select: baseSelect
    }),

  deleteById: (id) => prisma.user.delete({ where: { id } }),

  countAdminsExcluding: (id) =>
    prisma.user.count({
      where: {
        roleId: 'role-admin',
        id: { not: id }
      }
    }),

  countByRoleId: (roleId) => prisma.user.count({ where: { roleId } })
};
