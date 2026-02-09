import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRISMA_CLIENT_STUB = process.env.PRISMA_CLIENT_STUB || '1';

const { prisma } = await import('../../src/config/prisma.js');
const { rbacGuard } = await import('../../src/middlewares/rbacGuard.js');
const { categoryController } = await import('../../src/controllers/categoryController.js');

const supervisorPerms = { categories: { r: true, w: false, u: false, d: false } };
const adminPerms = { categories: { r: true, w: true, u: true, d: true } };

const supervisorUser = {
  id: 'user-supervisor',
  email: 'supervisor@test.local',
  fullName: 'Supervisor Test',
  roleId: 'role-supervisor',
  effectivePermissions: supervisorPerms,
};

const adminUser = {
  id: 'user-admin',
  email: 'admin@test.local',
  fullName: 'Admin Test',
  roleId: 'role-admin',
  effectivePermissions: adminPerms,
};

function cloneCategory(category) {
  return {
    ...category,
    createdAt: new Date(category.createdAt),
    updatedAt: new Date(category.updatedAt),
  };
}

let categoriesStore = new Map();

function resetCategories() {
  categoriesStore = new Map([
    [
      'cat-001',
      {
        id: 'cat-001',
        name: 'Bebidas',
        imageUrl: null,
        active: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      },
    ],
  ]);
}

function filterCategories(where = {}) {
  let items = Array.from(categoriesStore.values());

  if (Object.prototype.hasOwnProperty.call(where, 'active')) {
    items = items.filter((item) => item.active === where.active);
  }

  if (where.name && typeof where.name.contains === 'string') {
    const needle = where.name.contains.toLowerCase();
    items = items.filter((item) => item.name.toLowerCase().includes(needle));
  }

  return items;
}

function sortCategories(items, orderBy = {}) {
  const [entry] = Object.entries(orderBy || {});
  if (!entry) return items.slice();
  const [field, direction] = entry;
  const sorted = items.slice();

  sorted.sort((a, b) => {
    if (field === 'name') {
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    }
    if (field === 'createdAt' || field === 'updatedAt') {
      return a[field].getTime() - b[field].getTime();
    }
    return 0;
  });

  if (String(direction).toLowerCase() === 'desc') {
    sorted.reverse();
  }

  return sorted;
}

prisma.category.findMany = async ({ where = {}, orderBy = {}, skip = 0, take } = {}) => {
  const filtered = filterCategories(where);
  const sorted = sortCategories(filtered, orderBy);
  if (typeof take === 'number') {
    return sorted.slice(skip, skip + take).map(cloneCategory);
  }
  return sorted.map(cloneCategory);
};

prisma.category.count = async ({ where = {} } = {}) => filterCategories(where).length;

prisma.category.findUnique = async ({ where = {} } = {}) => {
  if (where.id && categoriesStore.has(where.id)) {
    return cloneCategory(categoriesStore.get(where.id));
  }
  if (where.name) {
    const match = Array.from(categoriesStore.values()).find((item) => item.name === where.name);
    return match ? cloneCategory(match) : null;
  }
  return null;
};

prisma.category.create = async ({ data }) => {
  const now = new Date();
  const id = data.id || `cat-${String(categoriesStore.size + 1).padStart(3, '0')}`;
  const row = {
    id,
    name: data.name,
    imageUrl: data.imageUrl ?? null,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  categoriesStore.set(id, row);
  return cloneCategory(row);
};

prisma.category.update = async ({ where, data }) => {
  const current = categoriesStore.get(where.id);
  if (!current) {
    const error = new Error('Not found');
    error.code = 'P2025';
    throw error;
  }
  const updated = {
    ...current,
    ...data,
    updatedAt: new Date(),
  };
  categoriesStore.set(where.id, updated);
  return cloneCategory(updated);
};

prisma.category.delete = async ({ where }) => {
  categoriesStore.delete(where.id);
  return { id: where.id };
};

prisma.category.deleteMany = async ({ where }) => {
  if (where?.id?.in && Array.isArray(where.id.in)) {
    for (const id of where.id.in) {
      categoriesStore.delete(id);
    }
  }
  return { count: 0 };
};

prisma.product.groupBy = async ({ where = {} } = {}) => {
  const ids = Array.isArray(where?.categoryId?.in) ? where.categoryId.in : [];
  return ids.map((id) => ({ categoryId: id, _count: { _all: 0 } }));
};

prisma.rolePermission.findUnique = async () => null;

test.beforeEach(() => {
  resetCategories();
});

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
}

function runMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const next = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(res);
    };

    Promise.resolve(middleware(req, res, next))
      .then((result) => {
        if (!settled) {
          settled = true;
          // Some middlewares return res.json(...) without calling next
          if (result !== undefined) {
            resolve(result);
          } else {
            resolve(res);
          }
        }
      })
      .catch((err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
  });
}

function attachUser(user) {
  return (req, _res, next) => {
    req.user = { ...user };
    next();
  };
}

test('GET /api/v1/categories → 200 for supervisor with read-only permissions', { concurrency: false }, async () => {
  const req = {
    user: { ...supervisorUser },
    validated: { query: {} },
  };
  const res = createMockResponse();
  await runMiddleware(attachUser(supervisorUser), req, res);
  await runMiddleware(rbacGuard('categories', 'r'), req, res);
  await runMiddleware((request, response, next) => categoryController.list(request, response, next), req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.ok, true);
  assert.ok(Array.isArray(res.payload?.data?.items));
  assert.equal(res.payload.data.items.length >= 1, true);
});

test('GET /api/v1/categories/:id → 200 for supervisor with read-only permissions', { concurrency: false }, async () => {
  const req = {
    user: { ...supervisorUser },
    validated: { params: { id: 'cat-001' } },
    params: { id: 'cat-001' },
  };
  const res = createMockResponse();
  await runMiddleware(attachUser(supervisorUser), req, res);
  await runMiddleware(rbacGuard('categories', 'r'), req, res);
  await runMiddleware((request, response, next) => categoryController.show(request, response, next), req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.ok, true);
  assert.equal(res.payload?.data?.id, 'cat-001');
});

test('write/update/delete operations → 403 for supervisor without privileges', { concurrency: false }, async () => {
  const expectForbidden = async (guard, req) => {
    const res = createMockResponse();
    await runMiddleware(attachUser(supervisorUser), req, res);
    await assert.rejects(() => runMiddleware(guard, req, res), (err) => {
      assert.equal(err?.code, 'PERMISSION_DENIED');
      return true;
    });
  };

  await expectForbidden(rbacGuard('categories', 'w'), {
    user: { ...supervisorUser },
    validated: { body: { name: 'Should Fail' } },
    body: { name: 'Should Fail' },
  });

  await expectForbidden(rbacGuard('categories', 'u'), {
    user: { ...supervisorUser },
    validated: { params: { id: 'cat-001' }, body: { name: 'Updated' } },
    params: { id: 'cat-001' },
    body: { name: 'Updated' },
  });

  await expectForbidden(rbacGuard('categories', 'u'), {
    user: { ...supervisorUser },
    validated: { params: { id: 'cat-001' }, body: { active: false } },
    params: { id: 'cat-001' },
    body: { active: false },
  });

  await expectForbidden(rbacGuard('categories', 'd'), {
    user: { ...supervisorUser },
    validated: { params: { id: 'cat-001' } },
    params: { id: 'cat-001' },
  });
});

test('admin with full permissions can perform CRUD operations', { concurrency: false }, async () => {
  const runAuthorized = async (req, guard, handler) => {
    const res = createMockResponse();
    await runMiddleware(attachUser(adminUser), req, res);
    await runMiddleware(guard, req, res);
    await runMiddleware(handler, req, res);
    return res;
  };

  const createRes = await runAuthorized({
    user: { ...adminUser },
    validated: { body: { name: 'Nueva Categoría' } },
    body: { name: 'Nueva Categoría' },
  }, rbacGuard('categories', 'w'), (request, response, next) => categoryController.create(request, response, next));
  assert.equal(createRes.statusCode, 201);
  assert.equal(createRes.payload?.ok, true);
  const createdId = createRes.payload?.data?.id;
  assert.ok(createdId);

  const updateRes = await runAuthorized({
    user: { ...adminUser },
    validated: {
      params: { id: createdId },
      body: { name: 'Categoría Actualizada', imageUrl: 'https://cdn.test/categoria.png' },
    },
    params: { id: createdId },
    body: { name: 'Categoría Actualizada', imageUrl: 'https://cdn.test/categoria.png' },
  }, rbacGuard('categories', 'u'), (request, response, next) => categoryController.update(request, response, next));
  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.payload?.ok, true);
  assert.equal(updateRes.payload?.data?.name, 'Categoría Actualizada');

  const patchRes = await runAuthorized({
    user: { ...adminUser },
    validated: { params: { id: createdId }, body: { active: false } },
    params: { id: createdId },
    body: { active: false },
  }, rbacGuard('categories', 'u'), (request, response, next) => categoryController.toggle(request, response, next));
  assert.equal(patchRes.statusCode, 200);
  assert.equal(patchRes.payload?.ok, true);
  assert.equal(patchRes.payload?.data?.active, false);

  const deleteRes = await runAuthorized({
    user: { ...adminUser },
    validated: { params: { id: createdId } },
    params: { id: createdId },
  }, rbacGuard('categories', 'd'), (request, response, next) => categoryController.remove(request, response, next));
  assert.equal(deleteRes.statusCode, 200);
  assert.equal(deleteRes.payload?.ok, true);
  assert.equal(deleteRes.payload?.data?.deleted, true);
});
