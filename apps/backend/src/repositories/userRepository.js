// Acceso a usuarios
import { prisma } from '../config/prisma.js';

export const userRepository = {
  findByEmail: (email) =>
    prisma.user.findUnique({ where: { email } }),

  findById: (id) =>
    prisma.user.findUnique({ where: { id } }),

  resetLoginState: (id) =>
    prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockUntil: null }
    }),

  bumpFailedAttempt: async (id, lockUntil = null) => {
    // Incrementa el contador y opcionalmente fija lockUntil
    return prisma.user.update({
      where: { id },
      data: (lockUntil
        ? { failedLoginAttempts: { increment: 1 }, lockUntil }
        : { failedLoginAttempts: { increment: 1 } })
    });
  }
};
