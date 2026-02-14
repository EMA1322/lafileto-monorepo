import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.PRISMA_CLIENT_STUB = process.env.PRISMA_CLIENT_STUB || '1';

const { default: app } = await import('../../src/app.js');
const { signJwt } = await import('../../src/utils/jwt.js');
const { settingRepository } = await import('../../src/repositories/settingRepository.js');

let server;
let baseUrl;

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

function validPayload() {
  return {
    identity: { phone: '2661234567', email: 'settings@lafileto.com' },
    payments: { enabled: true, cbu: '0000123456789012345678' },
    hours: { override: 'AUTO' }
  };
}

test('PUT /api/v1/settings sin token => 401', async () => {
  const res = await api('/api/v1/settings', {
    method: 'PUT',
    json: validPayload()
  });

  assert.equal(res.status, 401);
  assert.equal(res.body?.ok, false);
});

test('PUT /api/v1/settings sin permiso settings:w => 403', async () => {
  const token = await buildToken({
    userId: 'viewer-1',
    roleId: `role-test-deny-${Date.now()}`,
    permissions: {
      settings: { r: true, w: false, u: false, d: false }
    }
  });

  const res = await api('/api/v1/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    json: validPayload()
  });

  assert.equal(res.status, 403);
  assert.equal(res.body?.ok, false);
});

test('PUT /api/v1/settings payload inválido => 400 con details.fields path estable', async () => {
  const token = await buildToken({
    userId: 'editor-1',
    permissions: {
      settings: { r: true, w: true, u: false, d: false }
    }
  });

  const res = await api('/api/v1/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    json: {
      ...validPayload(),
      hours: { override: 'INVALID' }
    }
  });

  assert.equal(res.status, 400);
  assert.equal(res.body?.ok, false);
  assert.equal(Array.isArray(res.body?.error?.details?.fields), true);
  const fields = res.body.error.details.fields;
  assert.equal(fields.some((field) => field.path === 'hours.override' && field.code === 'invalid_enum'), true);
});

test('PUT /api/v1/settings con settings:w => 200 y persiste meta', async () => {
  const actorUserId = `admin-${Date.now()}`;
  const uniqueEmail = `settings-${Date.now()}@lafileto.test`;

  const token = await buildToken({
    userId: actorUserId,
    roleId: `role-test-allow-${Date.now()}`,
    permissions: {
      settings: { r: true, w: true, u: true, d: true }
    }
  });

  const res = await api('/api/v1/settings', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    json: {
      ...validPayload(),
      identity: {
        ...validPayload().identity,
        email: uniqueEmail
      }
    }
  });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.equal(res.body?.data?.meta, undefined);

  const persisted = await settingRepository.findByKey('siteConfig');
  assert.equal(persisted?.value?.identity?.email, uniqueEmail);
  assert.equal(persisted?.value?.meta?.updatedByUserId, actorUserId);
  assert.equal(typeof persisted?.value?.meta?.updatedAt, 'string');
});
