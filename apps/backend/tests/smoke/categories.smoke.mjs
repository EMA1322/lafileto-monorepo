// Smoke test end-to-end para Categories (I2).
// Requiere backend corriendo y una validación explícita del destino.
import { assertSmokeTarget, SafetyError } from '../../scripts/db-safety.mjs';

const smokeMode = process.env.SMOKE_MODE;
if (smokeMode !== 'local' && smokeMode !== 'remote') {
  throw new Error('[smoke] SMOKE_MODE_REQUIRED');
}

try {
  assertSmokeTarget(smokeMode);
} catch (error) {
  const code = error instanceof SafetyError ? error.code : 'VALIDATION_FAILED';
  throw new Error(`[smoke] ${code}`);
}

const API_BASE = process.env.API_BASE;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {}
  if (!response.ok || json?.ok === false) {
    const error = new Error(json?.error?.message || `HTTP ${response.status}`);
    error.code = json?.error?.code;
    error.status = response.status;
    throw error;
  }
  return json;
}

function assert(condition, message) {
  if (!condition) throw new Error(`Assert: ${message}`);
}

async function run() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set for the categories smoke test.');
  }

  let id = null;
  let token = '';

  try {
    console.log('> Login');
    const { data: login } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    token = login.token;

    const slug = `SMOKE_${Date.now()}`;
    console.log('> Admin list');
    const { data: listA } = await apiFetch(
      '/admin/categories?page=1&pageSize=20&orderBy=name&orderDir=asc',
      {
        token,
      },
    );
    assert(Array.isArray(listA), 'admin list returns array');

    console.log('> Create');
    const { data: created } = await apiFetch('/admin/categories', {
      method: 'POST',
      body: { name: slug, status: 'active' },
      token,
    });
    id = created.id;
    assert(created.name === slug, 'created name matches');

    console.log('> Update');
    const newName = `${slug}_UPD`;
    const { data: updated } = await apiFetch(`/admin/categories/${id}`, {
      method: 'PUT',
      body: { name: newName, status: 'inactive' },
      token,
    });
    assert(updated.name === newName && updated.status === 'inactive', 'updated ok');

    console.log('> Soft-delete');
    const { data: deleted } = await apiFetch(`/admin/categories/${id}`, {
      method: 'DELETE',
      token,
    });
    assert(deleted.deletedAt, 'has deletedAt');

    console.log('> Restore');
    const { data: restored } = await apiFetch(`/admin/categories/${id}/restore`, {
      method: 'PUT',
      token,
    });
    assert(restored.status === 'active' && !restored.deletedAt, 'restored active');

    console.log('> Public list');
    const { data: listP } = await apiFetch(
      `/categories?page=1&pageSize=50&q=${encodeURIComponent('SMOKE_')}`,
    );
    assert(
      listP.some((item) => item.id === id),
      'public list shows restored active',
    );
  } finally {
    if (id && token) {
      try {
        console.log('> Cleanup');
        await apiFetch(`/admin/categories/${id}`, { method: 'DELETE', token });
      } catch {
        console.error('Smoke cleanup failed');
      }
    }
  }

  console.log('Smoke done');
}

run().catch((error) => {
  console.error('Smoke failed:', error.code || error.status || '', error.message);
  process.exitCode = 1;
});
