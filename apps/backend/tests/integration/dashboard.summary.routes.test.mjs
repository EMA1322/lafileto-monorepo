import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRISMA_CLIENT_STUB = process.env.PRISMA_CLIENT_STUB || '1';

const { default: app } = await import('../../src/app.js');
const { signJwt } = await import('../../src/utils/jwt.js');
const { prisma } = await import('../../src/config/prisma.js');

let server;
let baseUrl;

const nowSetting = {
  key: 'siteConfig',
  value: {
    hours: {
      timezone: 'America/Argentina/San_Luis',
      override: 'FORCE_OPEN',
      openingHours: []
    }
  }
};

const products = [
  { id: 'p-1', name: 'Product 1', status: 'ACTIVE', imageUrl: null },
  { id: 'p-2', name: 'Product 2', status: 'ACTIVE', imageUrl: '' },
  { id: 'p-3', name: 'Product 3', status: 'ACTIVE', imageUrl: 'https://example.com/3.png' },
  { id: 'p-4', name: 'Product 4', status: 'ACTIVE', imageUrl: 'https://example.com/4.png' },
  { id: 'p-5', name: 'Product 5', status: 'ACTIVE', imageUrl: 'https://example.com/5.png' },
  { id: 'p-6', name: 'Product 6', status: 'ACTIVE', imageUrl: 'https://example.com/6.png' },
  { id: 'p-7', name: 'Product 7', status: 'ACTIVE', imageUrl: 'https://example.com/7.png' }
];

function isWithoutImage(product) {
  if (product.imageUrl == null) return true;
  if (typeof product.imageUrl !== 'string') return false;
  return product.imageUrl.trim() === '';
}

prisma.product.count = async ({ where = {} } = {}) => {
  if (where.status === 'ACTIVE') {
    return products.filter((product) => product.status === 'ACTIVE').length;
  }

  return 0;
};

prisma.product.create = async ({ data = {} } = {}) => {
  const created = {
    id: data.id || `product-${Date.now()}`,
    name: data.name || 'Inserted product',
    status: data.status || 'DRAFT',
    imageUrl: data.imageUrl ?? null
  };

  products.push(created);
  return created;
};

prisma.product.delete = async ({ where = {} } = {}) => {
  const index = products.findIndex((product) => product.id === where.id);
  if (index === -1) {
    throw new Error('Product not found for cleanup');
  }

  const [removed] = products.splice(index, 1);
  return removed;
};

prisma.$queryRaw = async () => [{ count: String(products.filter(isWithoutImage).length) }];

prisma.category.count = async ({ where = {} } = {}) => {
  if (where.active === true) return 3;
  return 0;
};

prisma.offer.count = async ({ where = {} } = {}) => {
  if (where?.product?.status !== 'ACTIVE') {
    throw new Error('dashboard summary must count offers for ACTIVE products');
  }

  return 3;
};

prisma.setting.findUnique = async ({ where = {} } = {}) => {
  if (where.key === nowSetting.key) {
    return nowSetting;
  }
  return null;
};

prisma.setting.upsert = async ({ where = {}, update = {}, create = {} } = {}) => {
  if (where.key !== nowSetting.key) {
    return { key: create.key, value: create.value };
  }

  nowSetting.value = update.value ?? create.value;
  return nowSetting;
};

prisma.rolePermission.findUnique = async () => null;

async function api(path, { method = 'GET', headers = {}, json } = {}) {
  const finalHeaders = { ...headers };
  let body;

  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
    body
  });

  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined
  };
}

async function buildToken({ userId, roleId = 'role-test', permissions }) {
  return signJwt({
    sub: userId,
    email: `${userId}@lafileto.test`,
    fullName: `User ${userId}`,
    roleId,
    effectivePermissions: permissions
  });
}

test.before(async () => {
  server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Unexpected server address');
  }

  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
});

test('GET /api/v1/dashboard/summary sin token => 401', async () => {
  const res = await api('/api/v1/dashboard/summary');

  assert.equal(res.status, 401);
  assert.equal(res.body?.ok, false);
});

test('GET /api/v1/dashboard/summary sin dashboard:r => 403', async () => {
  const token = await buildToken({
    userId: 'viewer-1',
    roleId: `role-test-deny-${Date.now()}`,
    permissions: {
      dashboard: { r: false, w: false, u: false, d: false }
    }
  });

  const res = await api('/api/v1/dashboard/summary', {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(res.status, 403);
  assert.equal(res.body?.ok, false);
});

test('GET /api/v1/dashboard/summary con dashboard:r => 200 y whitespace-only suma +1 en productsWithoutImage', async () => {
  const token = await buildToken({
    userId: 'admin-1',
    roleId: `role-test-allow-${Date.now()}`,
    permissions: {
      dashboard: { r: true, w: false, u: false, d: false }
    }
  });

  const headers = { Authorization: `Bearer ${token}` };

  const baselineRes = await api('/api/v1/dashboard/summary', { headers });

  assert.equal(baselineRes.status, 200);
  assert.equal(baselineRes.body?.ok, true);
  assert.equal(typeof baselineRes.body?.data?.meta?.generatedAt, 'string');
  assert.equal(Number.isNaN(Date.parse(baselineRes.body?.data?.meta?.generatedAt)), false);
  assert.equal(typeof baselineRes.body?.data?.counts?.activeOffers, 'number');
  assert.ok(Array.isArray(baselineRes.body?.data?.activity?.items));

  const baselineWithoutImage = baselineRes.body?.data?.counts?.productsWithoutImage;

  const inserted = await prisma.product.create({
    data: {
      name: `Whitespace Product ${Date.now()}`,
      status: 'ACTIVE',
      imageUrl: '   '
    }
  });

  try {
    const updatedRes = await api('/api/v1/dashboard/summary', { headers });

    assert.equal(updatedRes.status, 200);
    assert.equal(updatedRes.body?.ok, true);
    assert.equal(typeof updatedRes.body?.data?.counts?.activeOffers, 'number');
    assert.equal(updatedRes.body?.data?.counts?.productsWithoutImage, baselineWithoutImage + 1);
  } finally {
    await prisma.product.delete({ where: { id: inserted.id } });
  }
});
