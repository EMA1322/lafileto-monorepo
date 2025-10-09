// Acceso a módulos
import { prisma } from '../config/prisma.js';

export const moduleRepository = {
  findAll: () => prisma.module.findMany({ orderBy: { moduleKey: 'asc' } })
};
