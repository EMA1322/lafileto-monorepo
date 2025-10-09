// Auditoría: permission_change
import { prisma } from '../config/prisma.js';

export const auditLogRepository = {
  create: (payload) => prisma.auditLog.create({ data: payload })
};
