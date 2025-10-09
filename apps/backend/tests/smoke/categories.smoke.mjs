// Comentarios en español; código en inglés.
// Smoke test end-to-end para Categories (I2).
// Requiere backend corriendo y .env con CORS correcto.

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lafileto.ar';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe!2025';

async function apiFetch(path, { method='GET', body, token } = {}) {
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  if (!res.ok || json?.ok === false) {
    const e = new Error(json?.error?.message || `HTTP ${res.status}`);
    e.code = json?.error?.code;
    e.details = json?.error?.details;
    e.status = res.status;
    throw e;
  }
  return json; // envelope
}

function assert(cond, msg) { if (!cond) throw new Error('Assert: ' + msg); }

async function run() {
  console.log('> Login…');
  const { data: login } = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  const token = login.token;

  const slug = 'SMOKE_' + Date.now();
  let id = null;

  console.log('> Admin list…');
  const { data: listA, meta } = await apiFetch(`/admin/categories?page=1&pageSize=20&orderBy=name&orderDir=asc`, { token });
  assert(Array.isArray(listA), 'admin list returns array');

  console.log('> Create…');
  const { data: created } = await apiFetch('/admin/categories', {
    method: 'POST',
    body: { name: slug, status: 'active' },
    token
  });
  id = created.id;
  assert(created.name === slug, 'created name matches');

  console.log('> Update…');
  const newName = slug + '_UPD';
  const { data: updated } = await apiFetch(`/admin/categories/${id}`, {
    method: 'PUT',
    body: { name: newName, status: 'inactive' },
    token
  });
  assert(updated.name === newName && updated.status === 'inactive', 'updated ok');

  console.log('> Soft-delete…');
  const { data: deleted } = await apiFetch(`/admin/categories/${id}`, { method: 'DELETE', token });
  assert(deleted.deletedAt, 'has deletedAt');

  console.log('> Restore…');
  const { data: restored } = await apiFetch(`/admin/categories/${id}/restore`, { method: 'PUT', token });
  assert(restored.status === 'active' && !restored.deletedAt, 'restored active');

  console.log('> Public list…');
  const { data: listP, meta: metaP } = await apiFetch(`/categories?page=1&pageSize=50&q=${encodeURIComponent('SMOKE_')}`);
  assert(listP.some(x => x.id === id), 'public list shows restored active');

  console.log('> Cleanup (soft-delete again)…');
  await apiFetch(`/admin/categories/${id}`, { method: 'DELETE', token });

  console.log('OK ✅ Smoke done');
}

run().catch(err => {
  console.error('❌ Smoke failed:', err.code || err.status || '', err.message);
  if (err.details) console.error('details:', err.details);
  process.exitCode = 1;
});
