import test from 'node:test';
import assert from 'node:assert/strict';
import { toPermissionMatrix } from '../../src/services/rbacService.js';

test('toPermissionMatrix convierte filas en mapa', () => {
  const rows = [
    { moduleKey: 'dashboard', r: true,  w: false, u: false, d: false },
    { moduleKey: 'products',  r: true,  w: true,  u: true,  d: false },
    { moduleKey: 'users',     r: false, w: false, u: false, d: false }
  ];

  const out = toPermissionMatrix(rows);

  assert.deepEqual(out, {
    dashboard: { r: true,  w: false, u: false, d: false },
    products:  { r: true,  w: true,  u: true,  d: false },
    users:     { r: false, w: false, u: false, d: false }
  });
});
