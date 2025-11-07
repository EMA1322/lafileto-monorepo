import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRISMA_CLIENT_STUB = process.env.PRISMA_CLIENT_STUB || '1';

const { prisma } = await import('../../src/config/prisma.js');
const { rbacGuard } = await import('../../src/middlewares/rbacGuard.js');
const { productsController } = await import('../../src/controllers/productsController.js');

const viewerPerms = { products: { r: true, w: false, u: false, d: false, changeStatus: false } };
const supervisorPerms = { products: { r: true, w: true, u: true, d: false, changeStatus: true } };
const adminPerms = { products: { r: true, w: true, u: true, d: true, changeStatus: true } };

const viewerUser = {
  id: 'user-viewer',
  email: 'viewer@test.local',
  fullName: 'Viewer Test',
  roleId: 'role-viewer',
  effectivePermissions: viewerPerms
};

const supervisorUser = {
  id: 'user-supervisor',
  email: 'supervisor@test.local',
  fullName: 'Supervisor Test',
  roleId: 'role-supervisor',
  effectivePermissions: supervisorPerms
};

const adminUser = {
  id: 'user-admin',
  email: 'admin@test.local',
  fullName: 'Admin Test',
  roleId: 'role-admin',
  effectivePermissions: adminPerms
};

const categoriesStore = new Map([
  ['cat-001', { id: 'cat-001', name: 'Principales' }],
  ['cat-002', { id: 'cat-002', name: 'Pizzas' }]
]);

let productsStore = new Map();

function cloneProduct(product) {
  return {
    ...product,
    createdAt: new Date(product.createdAt),
    updatedAt: new Date(product.updatedAt)
  };
}

function resetProducts() {
  productsStore = new Map([
    [
      'prod-001',
      {
        id: 'prod-001',
        name: 'Pollo al Horno',
        description: 'Clásico de la casa',
        imageUrl: 'https://cdn.test/products/prod-001.png',
        price: 2500,
        stock: 15,
        status: 'ACTIVE',
        categoryId: 'cat-001',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z')
      }
    ]
  ]);
}

function filterProducts(where = {}) {
  let items = Array.from(productsStore.values());

  if (where.status) {
    items = items.filter((item) => item.status === where.status);
  }

  if (typeof where.categoryId === 'string') {
    items = items.filter((item) => item.categoryId === where.categoryId);
  }

  if (where.price) {
    if (where.price.gte !== undefined) {
      const min = Number(where.price.gte);
      items = items.filter((item) => item.price >= min);
    }
    if (where.price.lte !== undefined) {
      const max = Number(where.price.lte);
      items = items.filter((item) => item.price <= max);
    }
  }

  if (Array.isArray(where.OR) && where.OR.length > 0) {
    items = items.filter((item) =>
      where.OR.some((clause) => {
        if (clause.name?.contains) {
          const needle = clause.name.contains.toLowerCase();
          return item.name.toLowerCase().includes(needle);
        }
        if (clause.description?.contains) {
          const needle = clause.description.contains.toLowerCase();
          return String(item.description ?? '').toLowerCase().includes(needle);
        }
        return false;
      })
    );
  }

  return items;
}

function sortProducts(items, orderBy = {}) {
  const [entry] = Object.entries(orderBy || {});
  if (!entry) return items.slice();
  const [field, direction] = entry;
  const sorted = items.slice();

  sorted.sort((a, b) => {
    if (field === 'price') {
      return a.price - b.price;
    }
    if (field === 'updatedAt') {
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    }
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });

  if (String(direction).toLowerCase() === 'desc') {
    sorted.reverse();
  }

  return sorted;
}

prisma.product.findMany = async ({ where = {}, orderBy = {}, skip = 0, take, select } = {}) => {
  const filtered = filterProducts(where);
  const sorted = sortProducts(filtered, orderBy);
  const sliced = typeof take === 'number' ? sorted.slice(skip, skip + take) : sorted;
  return sliced.map((row) => {
    const clone = cloneProduct(row);
    if (select) {
      const selected = {};
      for (const key of Object.keys(select)) {
        if (select[key]) {
          selected[key] = clone[key];
        }
      }
      return selected;
    }
    return clone;
  });
};

prisma.product.count = async ({ where = {} } = {}) => filterProducts(where).length;

prisma.product.findUnique = async ({ where = {}, select } = {}) => {
  const match = where.id && productsStore.has(where.id) ? productsStore.get(where.id) : null;
  if (!match) return null;
  const clone = cloneProduct(match);
  if (!select) return clone;
  const selected = {};
  for (const key of Object.keys(select)) {
    if (select[key]) {
      selected[key] = clone[key];
    }
  }
  return selected;
};

prisma.product.create = async ({ data, select } = {}) => {
  const now = new Date();
  const id = data.id || `prod-${String(productsStore.size + 1).padStart(3, '0')}`;
  const row = {
    id,
    name: data.name,
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    price: Number.parseFloat(data.price),
    stock: data.stock,
    status: data.status,
    categoryId: data.categoryId,
    createdAt: now,
    updatedAt: now
  };
  productsStore.set(id, row);
  const clone = cloneProduct(row);
  if (!select) return clone;
  const selected = {};
  for (const key of Object.keys(select)) {
    if (select[key]) {
      selected[key] = clone[key];
    }
  }
  return selected;
};

prisma.product.update = async ({ where = {}, data = {}, select } = {}) => {
  const current = productsStore.get(where.id);
  if (!current) {
    const err = new Error('Not found');
    err.code = 'P2025';
    throw err;
  }
  const updated = {
    ...current,
    ...data,
    imageUrl: data.imageUrl !== undefined ? data.imageUrl : current.imageUrl,
    price: data.price !== undefined ? Number.parseFloat(data.price) : current.price,
    stock: data.stock !== undefined ? Number(data.stock) : current.stock,
    updatedAt: new Date()
  };
  productsStore.set(where.id, updated);
  const clone = cloneProduct(updated);
  if (!select) return clone;
  const selected = {};
  for (const key of Object.keys(select)) {
    if (select[key]) {
      selected[key] = clone[key];
    }
  }
  return selected;
};

prisma.product.delete = async ({ where = {} } = {}) => {
  productsStore.delete(where.id);
  return { id: where.id };
};

prisma.rolePermission.findUnique = async () => null;

prisma.category.findUnique = async ({ where = {} } = {}) => {
  if (where.id && categoriesStore.has(where.id)) {
    return { ...categoriesStore.get(where.id) };
  }
  return null;
};

test.beforeEach(() => {
  resetProducts();
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
    }
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

test('viewer puede leer pero no escribir productos', { concurrency: false }, async () => {
  const listReq = { user: { ...viewerUser }, validated: { query: {} } };
  const listRes = createMockResponse();
  await runMiddleware(attachUser(viewerUser), listReq, listRes);
  await runMiddleware(rbacGuard('products', 'r'), listReq, listRes);
  await runMiddleware((req, res, next) => productsController.list(req, res, next), listReq, listRes);

  assert.equal(listRes.statusCode, 200);
  assert.equal(listRes.payload?.ok, true);

  const expectForbidden = async (action) => {
    const req = { user: { ...viewerUser }, validated: { body: {}, params: { id: 'prod-001' } } };
    await runMiddleware(attachUser(viewerUser), req, createMockResponse());
    await assert.rejects(() => runMiddleware(rbacGuard('products', action), req, createMockResponse()), (err) => {
      assert.equal(err?.code, 'PERMISSION_DENIED');
      return true;
    });
  };

  await expectForbidden('w');
  await expectForbidden('u');
  await expectForbidden('d');
  await expectForbidden('changeStatus');
});

test('supervisor puede crear, actualizar y cambiar estado pero no eliminar', { concurrency: false }, async () => {
  const runAllowed = async (req, guard, handler) => {
    const res = createMockResponse();
    await runMiddleware(attachUser(supervisorUser), req, res);
    await runMiddleware(guard, req, res);
    await runMiddleware(handler, req, res);
    return res;
  };

  const createRes = await runAllowed(
    {
      user: { ...supervisorUser },
      validated: {
        body: {
          name: 'Ravioles de espinaca',
          description: 'Con salsa rosa',
          price: 1850.5,
          stock: 25,
          status: 'draft',
          categoryId: 'cat-001'
        }
      }
    },
    rbacGuard('products', 'w'),
    (req, res, next) => productsController.create(req, res, next)
  );

  assert.equal(createRes.statusCode, 201);
  const createdId = createRes.payload?.data?.id;
  assert.ok(createdId);

  const updateRes = await runAllowed(
    {
      user: { ...supervisorUser },
      validated: {
        params: { id: createdId },
        body: { price: 1990.75 }
      },
      params: { id: createdId }
    },
    rbacGuard('products', 'u'),
    (req, res, next) => productsController.update(req, res, next)
  );

  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.payload?.data?.price, 1990.75);

  const statusRes = await runAllowed(
    {
      user: { ...supervisorUser },
      validated: {
        params: { id: createdId },
        body: { status: 'active' }
      },
      params: { id: createdId }
    },
    rbacGuard('products', 'changeStatus'),
    (req, res, next) => productsController.changeStatus(req, res, next)
  );

  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.payload?.data?.status, 'active');

  const deleteReq = {
    user: { ...supervisorUser },
    validated: { params: { id: createdId } },
    params: { id: createdId }
  };
  await runMiddleware(attachUser(supervisorUser), deleteReq, createMockResponse());
  await assert.rejects(() => runMiddleware(rbacGuard('products', 'd'), deleteReq, createMockResponse()), (err) => {
    assert.equal(err?.code, 'PERMISSION_DENIED');
    return true;
  });
});

test('admin con permisos completos puede realizar todas las operaciones', { concurrency: false }, async () => {
  const runAuthorized = async (req, guard, handler) => {
    const res = createMockResponse();
    await runMiddleware(attachUser(adminUser), req, res);
    await runMiddleware(guard, req, res);
    await runMiddleware(handler, req, res);
    return res;
  };

  const createRes = await runAuthorized(
    {
      user: { ...adminUser },
      validated: {
        body: {
          name: 'Lomo a la mostaza',
          price: 3200,
          stock: 10,
          status: 'active',
          categoryId: 'cat-001'
        }
      }
    },
    rbacGuard('products', 'w'),
    (req, res, next) => productsController.create(req, res, next)
  );

  assert.equal(createRes.statusCode, 201);
  const createdId = createRes.payload?.data?.id;
  assert.ok(createdId);

  const updateRes = await runAuthorized(
    {
      user: { ...adminUser },
      validated: {
        params: { id: createdId },
        body: { stock: 5 }
      },
      params: { id: createdId }
    },
    rbacGuard('products', 'u'),
    (req, res, next) => productsController.update(req, res, next)
  );
  assert.equal(updateRes.statusCode, 200);
  assert.equal(updateRes.payload?.data?.stock, 5);

  const statusRes = await runAuthorized(
    {
      user: { ...adminUser },
      validated: {
        params: { id: createdId },
        body: { status: 'archived' }
      },
      params: { id: createdId }
    },
    rbacGuard('products', 'changeStatus'),
    (req, res, next) => productsController.changeStatus(req, res, next)
  );
  assert.equal(statusRes.statusCode, 200);
  assert.equal(statusRes.payload?.data?.status, 'archived');

  const deleteRes = await runAuthorized(
    {
      user: { ...adminUser },
      validated: { params: { id: createdId } },
      params: { id: createdId }
    },
    rbacGuard('products', 'd'),
    (req, res, next) => productsController.remove(req, res, next)
  );
  assert.equal(deleteRes.statusCode, 200);
  assert.equal(deleteRes.payload?.data?.deleted, true);
});
