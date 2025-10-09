// Integration: Auth (login + me)
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../../src/app.js';

const API = request(app);
const email = process.env.ADMIN_EMAIL || 'admin@lafileto.ar';
const password = process.env.ADMIN_PASSWORD || 'ChangeMe!2025';

let token = '';

test('POST /auth/login → 200 y token', async () => {
  const res = await API
    .post('/auth/login')
    .set('Content-Type', 'application/json')
    .send({ email, password });

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(res.body?.data?.token);
  assert.equal(res.body?.data?.user?.email, email);
  token = res.body.data.token;
});

test('GET /auth/me → 200 con user y effectivePermissions', async () => {
  assert.ok(token, 'Debe existir token desde el test de login');
  const res = await API
    .get('/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body?.ok, true);
  assert.ok(res.body?.data?.user?.email);
  assert.ok(res.body?.data?.effectivePermissions);
});

test('POST /auth/login credenciales inválidas → 401 AUTH_INVALID', async () => {
  const res = await API
    .post('/auth/login')
    .set('Content-Type', 'application/json')
    .send({ email, password: 'wrong-password' });

  assert.equal(res.status, 401);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.error?.code, 'AUTH_INVALID');
});
