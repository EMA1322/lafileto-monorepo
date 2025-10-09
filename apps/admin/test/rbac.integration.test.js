import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// In-memory storages
function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    clear: () => { m.clear(); },
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; }
  };
}

let rbac;

beforeEach(async () => {
  vi.resetModules();
  vi.restoreAllMocks();
  globalThis.sessionStorage = makeStorage();
  globalThis.localStorage   = makeStorage();
  rbac = await import('../src/utils/rbac.js'); // ← import dinámico
});

afterEach(() => {
  vi.restoreAllMocks();
  try { sessionStorage.clear(); } catch {}
  try { localStorage.clear(); } catch {}
});

it('early return usa permMap de servidor y NO hace fetch del seed', async () => {
  const { setServerSession, ensureRbacLoaded, getPermMap } = rbac;

  const serverRole  = 'role-admin';
  const serverPerms = {
    products: { r: true, w: false, u: false, d: false },
    users:    { r: true, w: true,  u: true,  d: true  }
  };

  await setServerSession(serverRole, serverPerms);

  global.fetch = vi.fn(() => {
    throw new Error('Seed NO debe consultarse cuando hay permisos del servidor');
  });

  await ensureRbacLoaded();

  expect(getPermMap()).toEqual(serverPerms);
  expect(global.fetch).not.toHaveBeenCalled();
});

it('sin permMap de servidor → cae a seed (sí hace fetch)', async () => {
  const { ensureRbacLoaded, getPermMap } = rbac;

  sessionStorage.setItem('rbac.roleId', 'role-supervisor');

  const seed = {
    modules: ['products', 'users'],
    role_permissions: {
      'role-supervisor': {
        products: { r: true, w: false, u: true, d: false }
      }
    }
  };
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => seed }));

  await ensureRbacLoaded();

  expect(getPermMap()).toEqual({
    products: { r: true, w: false, u: true, d: false },
    // módulos presentes en seed.modules sin flags definidos → todo false
    users:    { r: false, w: false, u: false, d: false }
  });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});


