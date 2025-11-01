// Integration: Auth (login + me)
import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../src/app.js';

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
  if (!baseUrl) {
    throw new Error('Server not initialized');
  }

  const finalHeaders = { ...headers };
  let body;

  if (json !== undefined) {
    body = typeof json === 'string' ? json : JSON.stringify(json);
    if (!finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
    body,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : undefined;
  } catch (error) {
    data = undefined;
  }

  return {
    status: response.status,
    body: data,
    text,
    headers: response.headers,
  };
}

const email = process.env.ADMIN_EMAIL || 'admin@lafileto.ar';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe!2025';

let token = '';

test('POST /auth/login → 200 y token', async () => {
  const res = await api('/auth/login', {
    method: 'POST',
    json: { email, password },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(res.body?.data?.token);
  assert.equal(res.body?.data?.user?.email, email);
  token = res.body.data.token;
});

test('GET /auth/me → 200 con user y effectivePermissions', async () => {
  assert.ok(token, 'Debe existir token desde el test de login');
  const res = await api('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(res.body?.data?.user?.email);
  assert.ok(res.body?.data?.effectivePermissions);
});

test('POST /auth/login credenciales inválidas → 401 AUTH_INVALID', async () => {
  const res = await api('/auth/login', {
    method: 'POST',
    json: { email, password: 'wrong-password' },
  });

  assert.equal(res.status, 401);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.error?.code, 'AUTH_INVALID');
});
