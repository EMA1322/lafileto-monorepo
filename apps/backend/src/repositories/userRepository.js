// Acceso a usuarios (Prisma directo)
import { prisma } from '../config/prisma.js';

export const userRepository = {
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

  findById: (id) => prisma.user.findUnique({ where: { id } }),

  async list({ page, pageSize, search }) {
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      : undefined;

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          roleId: true,
          status: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return { items, total };
  },

  create: (payload) => prisma.user.create({ data: payload }),

  countByRoleId: (roleId) => prisma.user.count({ where: { roleId } })
};
