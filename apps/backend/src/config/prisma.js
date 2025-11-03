// Prisma singleton para evitar múltiples conexiones en dev (hot reload)
let PrismaClientCtor;

try {
  const mod = await import('@prisma/client');
  PrismaClientCtor = mod.PrismaClient;
} catch (err) {
  if (process.env.NODE_ENV === 'test' || process.env.PRISMA_CLIENT_STUB === '1') {
    const notImplemented = () => {
      throw new Error('PrismaClient stub: method not implemented.');
    };

    PrismaClientCtor = class PrismaClientStub {
      constructor() {
        this.category = {
          findUnique: notImplemented,
          findMany: notImplemented,
          count: notImplemented,
          create: notImplemented,
          update: notImplemented,
          delete: notImplemented
        };
        this.product = {
          findUnique: notImplemented,
          findMany: notImplemented,
          count: notImplemented,
          create: notImplemented,
          update: notImplemented,
          delete: notImplemented,
          deleteMany: notImplemented
        };
        this.rolePermission = {
          findUnique: notImplemented
        };
        this.$disconnect = async () => {};
      }
    };
  } else {
    throw err;
  }
}

const g = globalThis;
export const prisma = g.__lafileto_prisma || new PrismaClientCtor();

if (process.env.NODE_ENV !== 'production') {
  g.__lafileto_prisma = prisma;
}
