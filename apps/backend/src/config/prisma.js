// Prisma singleton para evitar múltiples conexiones en dev (hot reload).
// El stub se decide antes de importar Prisma: los tests aislados no pueden abrir una DB.
const usePrismaStub = process.env.PRISMA_CLIENT_STUB === '1';

const notImplemented = () => {
  throw new Error('PrismaClient stub: method not implemented.');
};

const createModelStub = (defaults = {}) =>
  new Proxy(
    { ...defaults },
    {
      get: (target, property) => {
        if (property === 'then') return undefined;
        return Reflect.has(target, property) ? Reflect.get(target, property) : notImplemented;
      },
    },
  );

class PrismaClientStub {
  constructor() {
    this.__lafiletoPrismaStub = true;
    this.category = createModelStub();
    this.product = createModelStub();
    this.offer = createModelStub();
    this.rolePermission = createModelStub({ findUnique: async () => null });
    const settings = new Map();
    this.setting = createModelStub({
      findUnique: async ({ where = {} } = {}) => settings.get(where.key) ?? null,
      upsert: async ({ where = {}, update = {}, create = {} } = {}) => {
        const current = settings.get(where.key);
        const next = current ? { ...current, ...update } : { ...create };
        settings.set(where.key, next);
        return next;
      },
      update: async ({ where = {}, data = {} } = {}) => {
        const current = settings.get(where.key);
        if (!current) throw new Error('PrismaClient stub: setting not found.');
        const next = { ...current, ...data };
        settings.set(where.key, next);
        return next;
      },
    });
    this.user = createModelStub();
    this.role = createModelStub();
    this.module = createModelStub();
    this.$queryRaw = notImplemented;
    this.$transaction = notImplemented;
    this.$disconnect = async () => {};
  }
}

let PrismaClientCtor = PrismaClientStub;

if (!usePrismaStub) {
  const mod = await import('@prisma/client');
  PrismaClientCtor = mod.PrismaClient;
}

const g = globalThis;
export const prisma = g.__lafileto_prisma || new PrismaClientCtor();
export const isPrismaStub = usePrismaStub;

if (process.env.NODE_ENV !== 'production') {
  g.__lafileto_prisma = prisma;
}
