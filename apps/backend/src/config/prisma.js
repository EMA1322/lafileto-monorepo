// Prisma singleton para evitar múltiples conexiones en dev (hot reload)
import { PrismaClient } from '@prisma/client';

const g = globalThis;
export const prisma = g.__lafileto_prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  g.__lafileto_prisma = prisma;
}
