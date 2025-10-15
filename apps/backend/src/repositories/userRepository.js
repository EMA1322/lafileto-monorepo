// Acceso a usuarios
// - Maneja búsquedas/paginación y compatibilidad con columnas opcionales (phone)
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';

let userMetaPromise = null;

async function ensureUserMeta() {
  if (!userMetaPromise) {
    userMetaPromise = prisma.$queryRaw`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'User' AND COLUMN_NAME = 'phone'`
      .then(rows => ({ hasPhone: Array.isArray(rows) && rows.length > 0 }))
      .catch(() => ({ hasPhone: false }));
  }
  return userMetaPromise;
}

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

    const [rows, total, meta] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          email: true,
          roleId: true,
          status: true
        }
      }),
      prisma.user.count({ where }),
      ensureUserMeta()
    ]);

    let phoneById = null;
    if (meta.hasPhone && rows.length > 0) {
      const ids = rows.map((u) => u.id);
      const phoneRows = await prisma.$queryRaw`SELECT id, phone FROM User WHERE id IN (${Prisma.join(ids)})`;
      phoneById = new Map();
      for (const r of phoneRows) {
        phoneById.set(Number(r.id), r.phone ?? null);
      }
    }

    const items = rows.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
      status: user.status,
      phone: phoneById ? phoneById.get(user.id) ?? null : null
    }));

    return { items, total };
  }
};
