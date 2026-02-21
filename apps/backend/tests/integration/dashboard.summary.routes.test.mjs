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

prisma.product.count = async ({ where = {} } = {}) => {
  if (where.status === 'ACTIVE') return 7;
  return 0;
};

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

test('GET /api/v1/dashboard/summary con dashboard:r => 200', async () => {
  const token = await buildToken({
    userId: 'admin-1',
    roleId: `role-test-allow-${Date.now()}`,
    permissions: {
      dashboard: { r: true, w: false, u: false, d: false }
    }
  });

  const res = await api('/api/v1/dashboard/summary', {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.deepEqual(res.body?.data?.counts, {
    activeProducts: 7,
    activeCategories: 3,
    activeOffers: 3
  });
  assert.deepEqual(res.body?.data?.status, {
    mode: 'FORCE_OPEN',
    isOpen: true
  });
});
